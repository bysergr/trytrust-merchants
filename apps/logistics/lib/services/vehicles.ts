import { getDatabase } from '../db';
import { ServiceType, VehicleType } from '../types';

export function listVehicleTypes(service?: ServiceType): Array<VehicleType & { count_available: number }> {
  const db = getDatabase();
  let query = `
    SELECT 
      vt.id, vt.service, vt.name, vt.description, vt.capacity_kg, vt.passenger_capacity,
      vt.base_fare, vt.per_km_rate, vt.icon_url, vt.eta_minutes_base,
      COALESCE(av.count_available, 0) as count_available
    FROM vehicle_types vt
    LEFT JOIN available_vehicles av ON vt.id = av.vehicle_type_id
  `;
  const params: unknown[] = [];

  if (service) {
    query += ` WHERE vt.service = ?`;
    params.push(service);
  }

  query += ` ORDER BY vt.base_fare ASC`;

  const stmt = db.prepare(query);
  return (params.length > 0 ? stmt.all(...params) : stmt.all()) as Array<VehicleType & { count_available: number }>;
}

export function getVehicleTypeById(id: string): (VehicleType & { count_available: number }) | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT 
      vt.id, vt.service, vt.name, vt.description, vt.capacity_kg, vt.passenger_capacity,
      vt.base_fare, vt.per_km_rate, vt.icon_url, vt.eta_minutes_base,
      COALESCE(av.count_available, 0) as count_available
    FROM vehicle_types vt
    LEFT JOIN available_vehicles av ON vt.id = av.vehicle_type_id
    WHERE vt.id = ?
  `);
  const row = stmt.get(id) as (VehicleType & { count_available: number }) | undefined;
  return row || null;
}
