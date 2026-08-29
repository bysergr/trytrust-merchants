import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, 'app.db');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let dbInstance: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const db = new Database(DB_PATH);

  // SQLite configuration for concurrent reads/writes and data integrity
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');

  initSchema(db);

  dbInstance = db;
  return dbInstance;
}

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS airports (
      code TEXT PRIMARY KEY,
      city TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS flights (
      id TEXT PRIMARY KEY,
      flight_number TEXT NOT NULL,
      origin_airport_code TEXT NOT NULL REFERENCES airports(code) ON DELETE RESTRICT,
      destination_airport_code TEXT NOT NULL REFERENCES airports(code) ON DELETE RESTRICT,
      departure_at TEXT NOT NULL,
      arrival_at TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      base_price_economy INTEGER NOT NULL,
      base_price_business INTEGER NOT NULL,
      aircraft_type TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seats (
      id TEXT PRIMARY KEY,
      flight_id TEXT NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
      seat_number TEXT NOT NULL,
      cabin_class TEXT NOT NULL CHECK(cabin_class IN ('economy', 'business')),
      status TEXT NOT NULL CHECK(status IN ('available', 'held', 'booked')) DEFAULT 'available',
      held_until TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      price INTEGER NOT NULL,
      UNIQUE(flight_id, seat_number)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      booking_session_id TEXT UNIQUE NOT NULL,
      flight_id TEXT NOT NULL REFERENCES flights(id) ON DELETE RESTRICT,
      status TEXT NOT NULL CHECK(status IN ('draft', 'pending_payment', 'confirmed', 'expired', 'failed')) DEFAULT 'draft',
      passenger_name TEXT,
      passenger_document_id TEXT,
      contact_email TEXT,
      total_price INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      confirmed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS booking_seats (
      booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      seat_id TEXT NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
      PRIMARY KEY(booking_id, seat_id)
    );

    CREATE INDEX IF NOT EXISTS idx_flights_route ON flights(origin_airport_code, destination_airport_code, departure_at);
    CREATE INDEX IF NOT EXISTS idx_flights_departure ON flights(departure_at);
    CREATE INDEX IF NOT EXISTS idx_seats_flight_id ON seats(flight_id);
    CREATE INDEX IF NOT EXISTS idx_seats_status ON seats(status, held_until);
    CREATE INDEX IF NOT EXISTS idx_bookings_session ON bookings(booking_session_id);
    CREATE INDEX IF NOT EXISTS idx_booking_seats_booking ON booking_seats(booking_id);
    CREATE INDEX IF NOT EXISTS idx_booking_seats_seat ON booking_seats(seat_id);
  `);
}

export function resetDatabase(db: Database.Database): void {
  db.exec(`
    DROP TABLE IF EXISTS booking_seats;
    DROP TABLE IF EXISTS bookings;
    DROP TABLE IF EXISTS seats;
    DROP TABLE IF EXISTS flights;
    DROP TABLE IF EXISTS airports;
  `);
  initSchema(db);
}
