import Database from 'better-sqlite3';
import { VehicleType } from './types';

export const INITIAL_VEHICLE_TYPES: Array<VehicleType & { initial_available: number }> = [
  // --- RIDE SERVICES ---
  {
    id: 'ride-economy',
    service: 'ride',
    name: 'UberX Economy',
    description: 'Affordable, everyday rides with top-rated drivers',
    capacity_kg: null,
    passenger_capacity: 4,
    base_fare: 7.50,
    per_km_rate: 1.65,
    icon_url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Audi_A8_D5_(2021)_IMG_8322.jpg',
    eta_minutes_base: 3,
    initial_available: 8,
  },
  {
    id: 'ride-comfort',
    service: 'ride',
    name: 'Uber Comfort',
    description: 'Spacious legroom in newer, premium cars',
    capacity_kg: null,
    passenger_capacity: 4,
    base_fare: 12.00,
    per_km_rate: 2.25,
    icon_url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Audi_A8_D5_(2021)_IMG_8322.jpg',
    eta_minutes_base: 4,
    initial_available: 5,
  },
  {
    id: 'ride-xl',
    service: 'ride',
    name: 'UberXL',
    description: 'Comfortable SUVs for up to 6 riders and extra luggage',
    capacity_kg: null,
    passenger_capacity: 6,
    base_fare: 18.50,
    per_km_rate: 2.95,
    icon_url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Nissan-S-Cargo-Lane-Motor-Museum-01.jpg',
    eta_minutes_base: 6,
    initial_available: 4,
  },

  // --- PACKAGE SERVICES (Uber Connect) ---
  {
    id: 'pkg-motorcycle',
    service: 'package',
    name: 'Motorcycle Courier',
    description: 'Fastest door-to-door delivery for parcels & documents up to 10kg',
    capacity_kg: 10,
    passenger_capacity: 0,
    base_fare: 5.50,
    per_km_rate: 1.20,
    icon_url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Norton_Motorcycle.jpg',
    eta_minutes_base: 3,
    initial_available: 10,
  },
  {
    id: 'pkg-courier-van',
    service: 'package',
    name: 'Courier Van Express',
    description: 'Enclosed weatherproof van for medium cargo and multi-box delivery up to 150kg',
    capacity_kg: 150,
    passenger_capacity: 0,
    base_fare: 15.00,
    per_km_rate: 2.10,
    icon_url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Nissan-S-Cargo-Lane-Motor-Museum-01.jpg',
    eta_minutes_base: 5,
    initial_available: 6,
  },

  // --- FREIGHT SERVICES (Uber Freight simplified) ---
  {
    id: 'freight-cargo-van',
    service: 'freight',
    name: 'Cargo Sprinter Van',
    description: 'Heavy payload van for furniture, appliances, and trade goods up to 800kg',
    capacity_kg: 800,
    passenger_capacity: 0,
    base_fare: 45.00,
    per_km_rate: 3.50,
    icon_url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Nissan-S-Cargo-Lane-Motor-Museum-01.jpg',
    eta_minutes_base: 8,
    initial_available: 5,
  },
  {
    id: 'freight-box-truck',
    service: 'freight',
    name: 'Commercial Box Truck (16ft)',
    description: 'Tail-lift box truck for palletized cargo and business moves up to 3,500kg',
    capacity_kg: 3500,
    passenger_capacity: 0,
    base_fare: 95.00,
    per_km_rate: 5.80,
    icon_url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Red_Ford_Cargo_Vintage_Vehicles_Shildon.jpg',
    eta_minutes_base: 12,
    initial_available: 4,
  },
  {
    id: 'freight-heavy-semi',
    service: 'freight',
    name: 'Heavy Freight Flatbed / Semi',
    description: 'Industrial heavy haul for machinery, building materials, and bulk up to 15,000kg',
    capacity_kg: 15000,
    passenger_capacity: 0,
    base_fare: 195.00,
    per_km_rate: 8.90,
    icon_url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Red_Ford_Cargo_Vintage_Vehicles_Shildon.jpg',
    eta_minutes_base: 20,
    initial_available: 3,
  },
];

export function seedDatabase(db: Database.Database): void {
  const insertVehicleType = db.prepare(`
    INSERT INTO vehicle_types (
      id, service, name, description, capacity_kg, passenger_capacity,
      base_fare, per_km_rate, icon_url, eta_minutes_base
    ) VALUES (
      @id, @service, @name, @description, @capacity_kg, @passenger_capacity,
      @base_fare, @per_km_rate, @icon_url, @eta_minutes_base
    )
    ON CONFLICT(id) DO UPDATE SET
      service = excluded.service,
      name = excluded.name,
      description = excluded.description,
      capacity_kg = excluded.capacity_kg,
      passenger_capacity = excluded.passenger_capacity,
      base_fare = excluded.base_fare,
      per_km_rate = excluded.per_km_rate,
      icon_url = excluded.icon_url,
      eta_minutes_base = excluded.eta_minutes_base
  `);

  const insertAvailableVehicle = db.prepare(`
    INSERT INTO available_vehicles (
      id, vehicle_type_id, count_available, version
    ) VALUES (
      @id, @vehicle_type_id, @count_available, 1
    )
    ON CONFLICT(vehicle_type_id) DO UPDATE SET
      count_available = excluded.count_available,
      version = version + 1
  `);

  const tx = db.transaction(() => {
    for (const v of INITIAL_VEHICLE_TYPES) {
      insertVehicleType.run({
        id: v.id,
        service: v.service,
        name: v.name,
        description: v.description,
        capacity_kg: v.capacity_kg,
        passenger_capacity: v.passenger_capacity ?? null,
        base_fare: v.base_fare,
        per_km_rate: v.per_km_rate,
        icon_url: v.icon_url,
        eta_minutes_base: v.eta_minutes_base ?? 5,
      });

      insertAvailableVehicle.run({
        id: `avail-${v.id}`,
        vehicle_type_id: v.id,
        count_available: v.initial_available,
      });
    }

    // Insert sample initial requests if none exist
    const countReqs = db.prepare(`SELECT COUNT(*) as c FROM service_requests`).get() as { c: number };
    if (countReqs.c === 0) {
      const now = new Date();
      const insertSampleReq = db.prepare(`
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

      const sample1CreatedAt = new Date(now.getTime() - 25 * 60 * 1000).toISOString();
      const sample1Eta = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
      insertSampleReq.run({
        id: 'req-sample-ride-01',
        session_id: 'seed-sample-session',
        service: 'ride',
        vehicle_type_id: 'ride-economy',
        pickup_address: 'Market St & 4th St, San Francisco, CA',
        pickup_lat: 37.7857,
        pickup_lng: -122.4064,
        dropoff_address: 'Pier 39, Fisherman\'s Wharf, San Francisco, CA',
        dropoff_lat: 37.8087,
        dropoff_lng: -122.4098,
        distance_km: 4.2,
        duration_minutes: 14,
        scheduled_at: null,
        status: 'en_route',
        price: 14.43,
        estimated_arrival_at: sample1Eta,
        package_description: null,
        package_weight_kg: null,
        cargo_description: null,
        cargo_weight_kg: null,
        driver_name: 'Marcus Vance',
        driver_plate: '7XYZ890 (Silver Camry)',
        driver_rating: 4.94,
        payment_status: 'paid',
        paid_at: sample1CreatedAt,
        payment_confirmation: 'TXN-SEED-001',
        created_at: sample1CreatedAt,
        updated_at: sample1CreatedAt,
      });

      const sample2CreatedAt = new Date(now.getTime() - 45 * 60 * 1000).toISOString();
      const sample2Eta = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
      insertSampleReq.run({
        id: 'req-sample-pkg-02',
        session_id: 'seed-sample-session',
        service: 'package',
        vehicle_type_id: 'pkg-motorcycle',
        pickup_address: '100 Montgomery St, Financial District, SF',
        pickup_lat: 37.7908,
        pickup_lng: -122.4019,
        dropoff_address: '550 16th St, Mission Bay, SF',
        dropoff_lat: 37.7675,
        dropoff_lng: -122.3921,
        distance_km: 3.8,
        duration_minutes: 10,
        scheduled_at: null,
        status: 'completed',
        price: 10.06,
        estimated_arrival_at: sample2Eta,
        package_description: 'Legal architectural blueprints and sample folder',
        package_weight_kg: 2.5,
        cargo_description: null,
        cargo_weight_kg: null,
        driver_name: 'Elena Rostova',
        driver_plate: 'MOTO-4421',
        driver_rating: 4.98,
        payment_status: 'paid',
        paid_at: sample2CreatedAt,
        payment_confirmation: 'TXN-SEED-002',
        created_at: sample2CreatedAt,
        updated_at: sample2CreatedAt,
      });

      const sample3CreatedAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
      const sample3Eta = new Date(now.getTime() + 35 * 60 * 1000).toISOString();
      insertSampleReq.run({
        id: 'req-sample-freight-03',
        session_id: 'seed-sample-session',
        service: 'freight',
        vehicle_type_id: 'freight-box-truck',
        pickup_address: 'Warehouse Hub 4, Oakland Port Industrial Pkwy',
        pickup_lat: 37.8044,
        pickup_lng: -122.2712,
        dropoff_address: 'Metro Distribution Center, San Jose, CA',
        dropoff_lat: 37.3382,
        dropoff_lng: -121.8863,
        distance_km: 68.5,
        duration_minutes: 58,
        scheduled_at: null,
        status: 'matched',
        price: 492.30,
        estimated_arrival_at: sample3Eta,
        package_description: null,
        package_weight_kg: null,
        cargo_description: '4 standard euro-pallets commercial solar inverter parts',
        cargo_weight_kg: 1850,
        driver_name: 'David K. O\'Connor',
        driver_plate: 'CA-COM-9912',
        driver_rating: 4.91,
        payment_status: 'pending',
        paid_at: null,
        payment_confirmation: null,
        created_at: sample3CreatedAt,
        updated_at: sample3CreatedAt,
      });
    }
  });

  tx();
}
