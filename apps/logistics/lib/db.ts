import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { seedDatabase } from './seed-data';

/**
 * Returns the SQLite database file path.
 *
 * CRITICAL VERCEL / SERVERLESS RULE:
 * On Vercel and AWS Lambda, the entire filesystem is read-only except for `/tmp`.
 * Attempting to write to `data/app.db` or root dirs causes immediate ENOENT or EROFS errors.
 * Hence, in serverless environments we route to `/tmp/logistics-app.db`.
 */
export function getDatabasePath(): string {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }

  // Detect serverless environment (Vercel, AWS Lambda)
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT) {
    return path.join('/tmp', 'logistics-app.db');
  }

  return path.join(process.cwd(), 'data', 'app.db');
}

let dbInstance: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = getDatabasePath();
  const dbDir = path.dirname(dbPath);

  // Ensure database directory exists
  if (!fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir, { recursive: true });
    } catch {
      // ignore if directory exists or cannot be created
    }
  }

  const db = new Database(dbPath);

  // Configure SQLite for high concurrency and resilience
  try {
    db.pragma('journal_mode = WAL');
  } catch {
    db.pragma('journal_mode = DELETE');
  }
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');

  initSchema(db);
  autoSeedIfEmpty(db);

  dbInstance = db;
  return dbInstance;
}

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicle_types (
      id TEXT PRIMARY KEY,
      service TEXT NOT NULL CHECK(service IN ('ride', 'package', 'freight')),
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      capacity_kg REAL,
      passenger_capacity INTEGER,
      base_fare REAL NOT NULL,
      per_km_rate REAL NOT NULL,
      icon_url TEXT NOT NULL,
      eta_minutes_base INTEGER NOT NULL DEFAULT 5
    );

    CREATE TABLE IF NOT EXISTS available_vehicles (
      id TEXT PRIMARY KEY,
      vehicle_type_id TEXT UNIQUE NOT NULL REFERENCES vehicle_types(id) ON DELETE CASCADE,
      count_available INTEGER NOT NULL CHECK(count_available >= 0),
      version INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS service_requests (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      service TEXT NOT NULL CHECK(service IN ('ride', 'package', 'freight')),
      vehicle_type_id TEXT NOT NULL REFERENCES vehicle_types(id) ON DELETE RESTRICT,
      pickup_address TEXT NOT NULL,
      pickup_lat REAL NOT NULL,
      pickup_lng REAL NOT NULL,
      dropoff_address TEXT NOT NULL,
      dropoff_lat REAL NOT NULL,
      dropoff_lng REAL NOT NULL,
      distance_km REAL NOT NULL,
      duration_minutes INTEGER NOT NULL,
      scheduled_at TEXT,
      status TEXT NOT NULL CHECK(status IN ('quoted', 'requested', 'matched', 'en_route', 'completed', 'cancelled')) DEFAULT 'matched',
      price REAL NOT NULL,
      estimated_arrival_at TEXT NOT NULL,
      package_description TEXT,
      package_weight_kg REAL,
      cargo_description TEXT,
      cargo_weight_kg REAL,
      driver_name TEXT,
      driver_plate TEXT,
      driver_rating REAL,
      payment_status TEXT NOT NULL CHECK(payment_status IN ('pending', 'paid')) DEFAULT 'pending',
      paid_at TEXT,
      payment_confirmation TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_requests_session ON service_requests(session_id);
    CREATE INDEX IF NOT EXISTS idx_requests_service ON service_requests(service);
    CREATE INDEX IF NOT EXISTS idx_requests_status ON service_requests(status);
    CREATE INDEX IF NOT EXISTS idx_requests_created ON service_requests(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_vehicle_types_service ON vehicle_types(service);
  `);
}

export function autoSeedIfEmpty(db: Database.Database): void {
  try {
    const row = db.prepare(`SELECT COUNT(*) as count FROM vehicle_types`).get() as { count: number } | undefined;
    if (!row || row.count === 0) {
      seedDatabase(db);
    }
  } catch {
    initSchema(db);
    seedDatabase(db);
  }
}

export function resetDatabase(db: Database.Database): void {
  db.exec(`
    DROP TABLE IF EXISTS service_requests;
    DROP TABLE IF EXISTS available_vehicles;
    DROP TABLE IF EXISTS vehicle_types;
  `);
  initSchema(db);
  seedDatabase(db);
}
