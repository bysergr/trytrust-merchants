import Database from 'better-sqlite3';
import { VehicleType } from './types';

export const INITIAL_VEHICLE_TYPES: Array<VehicleType & { initial_available: number }> = [
  // --- RIDE SERVICES (BOGOTÁ MOBILITY) ---
  {
    id: 'ride-economy',
    service: 'ride',
    name: 'Logistics City Economy',
    description: 'Everyday affordable rides with verified drivers in Bogotá',
    capacity_kg: null,
    passenger_capacity: 4,
    base_fare: 6800,
    per_km_rate: 1850,
    icon_url: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80',
    eta_minutes_base: 3,
    initial_available: 12,
  },
  {
    id: 'ride-comfort',
    service: 'ride',
    name: 'Logistics Comfort Plus',
    description: 'Spacious legroom in newer, premium sedans across Bogotá',
    capacity_kg: null,
    passenger_capacity: 4,
    base_fare: 11500,
    per_km_rate: 2600,
    icon_url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80',
    eta_minutes_base: 4,
    initial_available: 8,
  },
  {
    id: 'ride-xl',
    service: 'ride',
    name: 'Logistics XL Executive',
    description: 'SUVs for up to 6 passengers, luggage to El Dorado Airport & groups',
    capacity_kg: null,
    passenger_capacity: 6,
    base_fare: 18500,
    per_km_rate: 3800,
    icon_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
    eta_minutes_base: 6,
    initial_available: 6,
  },
  {
    id: 'ride-black',
    service: 'ride',
    name: 'Logistics Black VIP',
    description: 'Executive black car service for financial district & luxury travel',
    capacity_kg: null,
    passenger_capacity: 4,
    base_fare: 26000,
    per_km_rate: 4900,
    icon_url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80',
    eta_minutes_base: 5,
    initial_available: 4,
  },

  // --- PACKAGE SERVICES (LOGISTICS EXPRESS ENVÍOS) ---
  {
    id: 'pkg-motorcycle',
    service: 'package',
    name: 'Logistics Express Moto',
    description: 'Fastest door-to-door courier through Bogotá traffic for parcels up to 10kg',
    capacity_kg: 10,
    passenger_capacity: 0,
    base_fare: 5200,
    per_km_rate: 1350,
    icon_url: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=80',
    eta_minutes_base: 3,
    initial_available: 15,
  },
  {
    id: 'pkg-courier-van',
    service: 'package',
    name: 'Logistics Courier Van',
    description: 'Covered express delivery van for boxes & corporate packages up to 150kg',
    capacity_kg: 150,
    passenger_capacity: 0,
    base_fare: 16500,
    per_km_rate: 2900,
    icon_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
    eta_minutes_base: 5,
    initial_available: 7,
  },

  // --- FREIGHT SERVICES (LOGISTICS CARGA & FLETES BOGOTÁ) ---
  {
    id: 'freight-cargo-van',
    service: 'freight',
    name: 'Logistics Cargo Sprinter',
    description: 'Commercial van for furniture, appliances, and retail transport up to 800kg',
    capacity_kg: 800,
    passenger_capacity: 0,
    base_fare: 48000,
    per_km_rate: 4200,
    icon_url: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=800&q=80',
    eta_minutes_base: 8,
    initial_available: 6,
  },
  {
    id: 'freight-box-truck',
    service: 'freight',
    name: 'Logistics Freight Box Truck (16ft)',
    description: 'Hydraulic lift truck for pallets, warehouse transfers & office moves up to 3,500kg',
    capacity_kg: 3500,
    passenger_capacity: 0,
    base_fare: 120000,
    per_km_rate: 6800,
    icon_url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80',
    eta_minutes_base: 12,
    initial_available: 5,
  },
  {
    id: 'freight-heavy-semi',
    service: 'freight',
    name: 'Logistics Heavy Freight (Semi/Flatbed)',
    description: 'Industrial semi/flatbed for machinery, building materials, and heavy cargo up to 15,000kg',
    capacity_kg: 15000,
    passenger_capacity: 0,
    base_fare: 260000,
    per_km_rate: 11800,
    icon_url: 'https://images.unsplash.com/photo-1501700493788-fa1a4fc9fe62?auto=format&fit=crop&w=800&q=80',
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

    // Insert sample initial Bogotá requests if none exist
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
      const sample1Eta = new Date(now.getTime() + 12 * 60 * 1000).toISOString();
      insertSampleReq.run({
        id: 'req-bogota-ride-01',
        session_id: 'seed-sample-session',
        service: 'ride',
        vehicle_type_id: 'ride-economy',
        pickup_address: 'Parque de la 93, Calle 93A # 13-25, Chicó, Bogotá',
        pickup_lat: 4.6768,
        pickup_lng: -74.0536,
        dropoff_address: 'Aeropuerto Internacional El Dorado, Terminal 1, Bogotá',
        dropoff_lat: 4.7016,
        dropoff_lng: -74.1469,
        distance_km: 14.8,
        duration_minutes: 28,
        scheduled_at: null,
        status: 'en_route',
        price: 34180,
        estimated_arrival_at: sample1Eta,
        package_description: null,
        package_weight_kg: null,
        cargo_description: null,
        cargo_weight_kg: null,
        driver_name: 'Santiago Ramirez',
        driver_plate: 'GHT-812 (Gris Chevrolet Onix)',
        driver_rating: 4.96,
        payment_status: 'paid',
        paid_at: sample1CreatedAt,
        payment_confirmation: 'TXN-BOG-001',
        created_at: sample1CreatedAt,
        updated_at: sample1CreatedAt,
      });

      const sample2CreatedAt = new Date(now.getTime() - 45 * 60 * 1000).toISOString();
      const sample2Eta = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
      insertSampleReq.run({
        id: 'req-bogota-pkg-02',
        session_id: 'seed-sample-session',
        service: 'package',
        vehicle_type_id: 'pkg-motorcycle',
        pickup_address: 'Torre Colpatria, Carrera 7 # 24-89, Centro Internacional, Bogotá',
        pickup_lat: 4.6144,
        pickup_lng: -74.0694,
        dropoff_address: 'Zona T, Calle 82 # 12-35, Bogotá',
        dropoff_lat: 4.6669,
        dropoff_lng: -74.0531,
        distance_km: 6.4,
        duration_minutes: 18,
        scheduled_at: null,
        status: 'completed',
        price: 13840,
        estimated_arrival_at: sample2Eta,
        package_description: 'Documentos notariales y contratos firmados',
        package_weight_kg: 1.8,
        cargo_description: null,
        cargo_weight_kg: null,
        driver_name: 'Andres Felipe Ospina',
        driver_plate: 'MOTO-XYZ-45D',
        driver_rating: 4.98,
        payment_status: 'paid',
        paid_at: sample2CreatedAt,
        payment_confirmation: 'TXN-BOG-002',
        created_at: sample2CreatedAt,
        updated_at: sample2CreatedAt,
      });

      const sample3CreatedAt = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
      const sample3Eta = new Date(now.getTime() + 45 * 60 * 1000).toISOString();
      insertSampleReq.run({
        id: 'req-bogota-freight-03',
        session_id: 'seed-sample-session',
        service: 'freight',
        vehicle_type_id: 'freight-box-truck',
        pickup_address: 'Zona Franca Fontibón, Calle 13 # 106-95, Bogotá',
        pickup_lat: 4.6825,
        pickup_lng: -74.1534,
        dropoff_address: 'Parque Industrial Siberia, Vía Cota - Bogotá',
        dropoff_lat: 4.7431,
        dropoff_lng: -74.1542,
        distance_km: 18.5,
        duration_minutes: 42,
        scheduled_at: null,
        status: 'matched',
        price: 245800,
        estimated_arrival_at: sample3Eta,
        package_description: null,
        package_weight_kg: null,
        cargo_description: '3 estibas con equipos de refrigeración industrial',
        cargo_weight_kg: 1950,
        driver_name: 'Hector Jaime Morales',
        driver_plate: 'WDF-901 (Camión Hino 300)',
        driver_rating: 4.93,
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
