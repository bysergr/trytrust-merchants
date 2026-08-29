import { getDatabase } from '../db';
import { Airport } from '../types';

export function listAirports(query?: string): Airport[] {
  const db = getDatabase();

  if (query && query.trim()) {
    const trimmed = `%${query.trim().toLowerCase()}%`;
    const stmt = db.prepare<[string, string]>(`
      SELECT code, city, name, created_at
      FROM airports
      WHERE LOWER(code) LIKE ? OR LOWER(city) LIKE ?
      ORDER BY city ASC
    `);
    return stmt.all(trimmed, trimmed) as Airport[];
  }

  const stmt = db.prepare(`
    SELECT code, city, name, created_at
    FROM airports
    ORDER BY city ASC
  `);
  return stmt.all() as Airport[];
}

export function getAirportByCode(code: string): Airport | undefined {
  const db = getDatabase();
  const stmt = db.prepare<[string]>(`
    SELECT code, city, name, created_at
    FROM airports
    WHERE code = ?
  `);
  return stmt.get(code.toUpperCase()) as Airport | undefined;
}

export function validateAirportCode(code: string): string {
  const normalized = code ? code.trim().toUpperCase() : '';
  if (!normalized) {
    throw new Error('Airport code is required. Call list_airports to see valid options.');
  }

  const airport = getAirportByCode(normalized);
  if (!airport) {
    throw new Error(`Unknown airport code: ${normalized}. Call list_airports to see valid options.`);
  }

  return normalized;
}
