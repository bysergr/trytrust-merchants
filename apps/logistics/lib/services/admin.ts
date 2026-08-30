import { getDatabase } from '../db';
import { AdminUpdateRequestInput, ServiceRequest } from '../types';
import { getRequestById } from './requests';

export function listAllRequests(): ServiceRequest[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT 
      sr.*,
      vt.name as vehicle_type_name,
      vt.icon_url as vehicle_type_icon
    FROM service_requests sr
    LEFT JOIN vehicle_types vt ON sr.vehicle_type_id = vt.id
    ORDER BY sr.created_at DESC
  `);
  return stmt.all() as ServiceRequest[];
}

export function adminUpdateRequest(id: string, input: AdminUpdateRequestInput): ServiceRequest {
  const db = getDatabase();
  const existing = getRequestById(id);
  if (!existing) {
    throw new Error(`Request with ID "${id}" not found.`);
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  if (input.price !== undefined) {
    if (typeof input.price !== 'number' || isNaN(input.price) || input.price < 0) {
      throw new Error('Price must be a valid non-negative number.');
    }
    updates.push('price = ?');
    params.push(Math.round(input.price * 100) / 100);
  }

  if (input.scheduled_at !== undefined) {
    updates.push('scheduled_at = ?');
    params.push(input.scheduled_at && input.scheduled_at.trim() ? input.scheduled_at.trim() : null);
  }

  if (input.status !== undefined) {
    updates.push('status = ?');
    params.push(input.status);
  }

  if (updates.length === 0) {
    return existing;
  }

  const now = new Date().toISOString();
  updates.push('updated_at = ?');
  params.push(now);

  params.push(id);

  const query = `UPDATE service_requests SET ${updates.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...params);

  const updated = getRequestById(id);
  if (!updated) {
    throw new Error(`Failed to fetch updated request "${id}".`);
  }
  return updated;
}
