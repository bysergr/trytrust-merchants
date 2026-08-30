import crypto from 'node:crypto';
import { getDatabase } from '../db';
import {
  CreateFreightInput,
  CreatePackageInput,
  CreateRideInput,
  PayInput,
  RequestStatus,
  ServiceRequest,
  ServiceType,
} from '../types';
import { calculateQuote, estimateCoordinates } from './geo-pricing';
import { getVehicleTypeById } from './vehicles';

// Simulated realistic driver profiles for authentic Uber feel
const SIMULATED_DRIVERS: Record<ServiceType, Array<{ name: string; plate: string; rating: number }>> = {
  ride: [
    { name: 'Marcus Vance', plate: '7XYZ890 (Silver Camry)', rating: 4.95 },
    { name: 'Sarah Chen', plate: '8KLM234 (Black Tesla Model 3)', rating: 4.98 },
    { name: 'Darnell Washington', plate: '6ABC789 (Blue Accord)', rating: 4.92 },
    { name: 'Mateo Morales', plate: '9DEF512 (White Highlander)', rating: 4.96 },
  ],
  package: [
    { name: 'Elena Rostova', plate: 'MOTO-4421 (Yamaha QuickCourier)', rating: 4.97 },
    { name: 'Carlos Mendez', plate: 'MOTO-8819 (Honda TransCity)', rating: 4.94 },
    { name: 'Andre Dubois', plate: 'VAN-2041 (Ford Transit Express)', rating: 4.91 },
  ],
  freight: [
    { name: 'David K. O\'Connor', plate: 'CA-COM-9912 (Freightliner 16ft)', rating: 4.92 },
    { name: 'James "Mac" Brody', plate: 'TRK-4480 (Peterbilt Heavy Haul)', rating: 4.89 },
    { name: 'Artur Kowalski', plate: 'VAN-7731 (Sprinter Cargo Pro)', rating: 4.96 },
  ],
};

function getRandomDriver(service: ServiceType) {
  const list = SIMULATED_DRIVERS[service] || SIMULATED_DRIVERS.ride;
  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex];
}

interface InternalCreateRequestParams {
  sessionId: string;
  service: ServiceType;
  vehicleTypeId: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  scheduledAt?: string | null;
  packageDescription?: string | null;
  packageWeightKg?: number | null;
  cargoDescription?: string | null;
  cargoWeightKg?: number | null;
}

export function createMatchedServiceRequest(params: InternalCreateRequestParams): ServiceRequest {
  const db = getDatabase();
  const vehicle = getVehicleTypeById(params.vehicleTypeId);
  if (!vehicle) {
    throw new Error(`Vehicle type "${params.vehicleTypeId}" not found.`);
  }
  if (vehicle.service !== params.service) {
    throw new Error(
      `Vehicle type "${vehicle.name}" is for ${vehicle.service}, not ${params.service}.`
    );
  }

  // Validate package / freight weight limits
  if (params.service === 'package' && params.packageWeightKg && vehicle.capacity_kg) {
    if (params.packageWeightKg > vehicle.capacity_kg) {
      throw new Error(
        `Package weight (${params.packageWeightKg}kg) exceeds vehicle capacity of ${vehicle.capacity_kg}kg.`
      );
    }
  }
  if (params.service === 'freight' && params.cargoWeightKg && vehicle.capacity_kg) {
    if (params.cargoWeightKg > vehicle.capacity_kg) {
      throw new Error(
        `Cargo weight (${params.cargoWeightKg}kg) exceeds vehicle capacity of ${vehicle.capacity_kg}kg.`
      );
    }
  }

  // Calculate coordinates & pricing
  const pickupCoords =
    params.pickupLat && params.pickupLng
      ? { lat: params.pickupLat, lng: params.pickupLng }
      : estimateCoordinates(params.pickupAddress);

  const dropoffCoords =
    params.dropoffLat && params.dropoffLng
      ? { lat: params.dropoffLat, lng: params.dropoffLng }
      : estimateCoordinates(params.dropoffAddress);

  const quote = calculateQuote({
    service: params.service,
    vehicle_type_id: params.vehicleTypeId,
    pickup_address: params.pickupAddress,
    dropoff_address: params.dropoffAddress,
    scheduled_at: params.scheduledAt,
    package_weight_kg: params.packageWeightKg,
    cargo_weight_kg: params.cargoWeightKg,
  });

  const driver = getRandomDriver(params.service);
  const requestId = `req_${crypto.randomUUID().slice(0, 12)}`;
  const now = new Date().toISOString();

  // ATOMIC MATCH TRANSACTION WITH OPTIMISTIC CONCURRENCY CONTROL
  const matchTx = db.transaction(() => {
    // 1. Fetch available count and version
    const availStmt = db.prepare(`
      SELECT count_available, version 
      FROM available_vehicles 
      WHERE vehicle_type_id = ?
    `);
    const availRow = availStmt.get(params.vehicleTypeId) as { count_available: number; version: number } | undefined;

    if (!availRow || availRow.count_available <= 0) {
      throw new Error(
        `No vehicles available right now for "${vehicle.name}". All units of this type are currently dispatched.`
      );
    }

    // 2. Decrement inventory with optimistic lock on version
    const updateStmt = db.prepare(`
      UPDATE available_vehicles 
      SET count_available = count_available - 1, 
          version = version + 1 
      WHERE vehicle_type_id = ? 
        AND version = ? 
        AND count_available > 0
    `);
    const updateResult = updateStmt.run(params.vehicleTypeId, availRow.version);

    if (updateResult.changes === 0) {
      throw new Error(
        `Vehicle matching contention: this vehicle was just booked by another customer. Please try again.`
      );
    }

    // 3. Create service_requests row
    const insertStmt = db.prepare(`
      INSERT INTO service_requests (
        id, session_id, service, vehicle_type_id,
        pickup_address, pickup_lat, pickup_lng,
        dropoff_address, dropoff_lat, dropoff_lng,
        distance_km, duration_minutes, scheduled_at,
        status, price, estimated_arrival_at,
        package_description, package_weight_kg,
        cargo_description, cargo_weight_kg,
        driver_name, driver_plate, driver_rating,
        payment_status, paid_at, payment_confirmation,
        created_at, updated_at
      ) VALUES (
        @id, @session_id, @service, @vehicle_type_id,
        @pickup_address, @pickup_lat, @pickup_lng,
        @dropoff_address, @dropoff_lat, @dropoff_lng,
        @distance_km, @duration_minutes, @scheduled_at,
        @status, @price, @estimated_arrival_at,
        @package_description, @package_weight_kg,
        @cargo_description, @cargo_weight_kg,
        @driver_name, @driver_plate, @driver_rating,
        @payment_status, @paid_at, @payment_confirmation,
        @created_at, @updated_at
      )
    `);

    insertStmt.run({
      id: requestId,
      session_id: params.sessionId,
      service: params.service,
      vehicle_type_id: params.vehicleTypeId,
      pickup_address: params.pickupAddress,
      pickup_lat: pickupCoords.lat,
      pickup_lng: pickupCoords.lng,
      dropoff_address: params.dropoffAddress,
      dropoff_lat: dropoffCoords.lat,
      dropoff_lng: dropoffCoords.lng,
      distance_km: quote.distance_km,
      duration_minutes: quote.duration_minutes,
      scheduled_at: params.scheduledAt || null,
      status: 'matched',
      price: quote.total_price,
      estimated_arrival_at: quote.estimated_arrival_at,
      package_description: params.packageDescription || null,
      package_weight_kg: params.packageWeightKg || null,
      cargo_description: params.cargoDescription || null,
      cargo_weight_kg: params.cargoWeightKg || null,
      driver_name: driver.name,
      driver_plate: driver.plate,
      driver_rating: driver.rating,
      payment_status: 'pending',
      paid_at: null,
      payment_confirmation: null,
      created_at: now,
      updated_at: now,
    });
  });

  matchTx();

  const req = getRequestById(requestId);
  if (!req) {
    throw new Error('Failed to retrieve newly created request');
  }
  return req;
}

export function createRideRequest(input: CreateRideInput, sessionId: string): ServiceRequest {
  return createMatchedServiceRequest({
    sessionId,
    service: 'ride',
    vehicleTypeId: input.vehicle_type_id,
    pickupAddress: input.pickup_address,
    dropoffAddress: input.dropoff_address,
    pickupLat: input.pickup_lat,
    pickupLng: input.pickup_lng,
    dropoffLat: input.dropoff_lat,
    dropoffLng: input.dropoff_lng,
    scheduledAt: input.scheduled_at,
  });
}

export function createPackageRequest(input: CreatePackageInput, sessionId: string): ServiceRequest {
  return createMatchedServiceRequest({
    sessionId,
    service: 'package',
    vehicleTypeId: input.vehicle_type_id,
    pickupAddress: input.pickup_address,
    dropoffAddress: input.dropoff_address,
    pickupLat: input.pickup_lat,
    pickupLng: input.pickup_lng,
    dropoffLat: input.dropoff_lat,
    dropoffLng: input.dropoff_lng,
    scheduledAt: input.scheduled_at,
    packageDescription: input.package_description,
    packageWeightKg: input.package_weight_kg,
  });
}

export function createFreightRequest(input: CreateFreightInput, sessionId: string): ServiceRequest {
  return createMatchedServiceRequest({
    sessionId,
    service: 'freight',
    vehicleTypeId: input.vehicle_type_id,
    pickupAddress: input.pickup_address,
    dropoffAddress: input.dropoff_address,
    pickupLat: input.pickup_lat,
    pickupLng: input.pickup_lng,
    dropoffLat: input.dropoff_lat,
    dropoffLng: input.dropoff_lng,
    scheduledAt: input.scheduled_at,
    cargoDescription: input.cargo_description,
    cargoWeightKg: input.cargo_weight_kg,
  });
}

export function getRequestById(id: string, sessionId?: string): ServiceRequest | null {
  const db = getDatabase();
  let query = `
    SELECT 
      sr.*,
      vt.name as vehicle_type_name,
      vt.icon_url as vehicle_type_icon
    FROM service_requests sr
    LEFT JOIN vehicle_types vt ON sr.vehicle_type_id = vt.id
    WHERE sr.id = ?
  `;
  const params: unknown[] = [id];

  if (sessionId) {
    query += ` AND sr.session_id = ?`;
    params.push(sessionId);
  }

  const stmt = db.prepare(query);
  const row = (params.length > 1 ? stmt.get(...params) : stmt.get(id)) as ServiceRequest | undefined;
  return row || null;
}

export function listRequestsBySession(sessionId: string): ServiceRequest[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT 
      sr.*,
      vt.name as vehicle_type_name,
      vt.icon_url as vehicle_type_icon
    FROM service_requests sr
    LEFT JOIN vehicle_types vt ON sr.vehicle_type_id = vt.id
    WHERE sr.session_id = ?
    ORDER BY sr.created_at DESC
  `);
  return stmt.all(sessionId) as ServiceRequest[];
}

export function cancelRequest(requestId: string, sessionId?: string): ServiceRequest {
  const db = getDatabase();
  const req = getRequestById(requestId, sessionId);
  if (!req) {
    throw new Error(`Request "${requestId}" not found.`);
  }

  if (req.status === 'cancelled') {
    return req;
  }

  if (req.status === 'completed') {
    throw new Error(`Cannot cancel request "${requestId}" because it has already been completed.`);
  }

  const now = new Date().toISOString();

  // ATOMIC CANCELLATION TRANSACTION: RELEASE VEHICLE BACK TO POOL
  const cancelTx = db.transaction(() => {
    // 1. Mark request as cancelled
    const updateReqStmt = db.prepare(`
      UPDATE service_requests
      SET status = 'cancelled', updated_at = ?
      WHERE id = ?
    `);
    updateReqStmt.run(now, requestId);

    // 2. Increment available vehicle inventory count atomically
    const incStmt = db.prepare(`
      UPDATE available_vehicles
      SET count_available = count_available + 1,
          version = version + 1
      WHERE vehicle_type_id = ?
    `);
    incStmt.run(req.vehicle_type_id);
  });

  cancelTx();

  const updated = getRequestById(requestId);
  if (!updated) {
    throw new Error('Failed to retrieve updated request after cancellation');
  }
  return updated;
}

export function payRequest(input: PayInput): ServiceRequest {
  const db = getDatabase();
  const req = getRequestById(input.request_id, input.session_id);
  if (!req) {
    throw new Error(`Request "${input.request_id}" not found for this session.`);
  }

  if (req.status === 'cancelled') {
    throw new Error(`Cannot pay for a cancelled request.`);
  }

  if (req.payment_status === 'paid') {
    return req;
  }

  const now = new Date().toISOString();
  const confirmationCode =
    typeof input.payment_confirmation === 'string'
      ? input.payment_confirmation
      : `TXN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  const stmt = db.prepare(`
    UPDATE service_requests
    SET payment_status = 'paid',
        paid_at = ?,
        payment_confirmation = ?,
        updated_at = ?
    WHERE id = ?
  `);

  stmt.run(now, confirmationCode, now, input.request_id);

  const updated = getRequestById(input.request_id);
  if (!updated) {
    throw new Error('Failed to retrieve updated request after payment');
  }
  return updated;
}

export function advanceRequestStatus(requestId: string, newStatus: RequestStatus): ServiceRequest {
  const db = getDatabase();
  const req = getRequestById(requestId);
  if (!req) {
    throw new Error(`Request "${requestId}" not found.`);
  }

  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE service_requests
    SET status = ?, updated_at = ?
    WHERE id = ?
  `);
  stmt.run(newStatus, now, requestId);

  return getRequestById(requestId)!;
}
