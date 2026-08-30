import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { SEED_PRODUCTS } from './catalog-data';

export function getDatabasePath(): string {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }
  // In Vercel or AWS Lambda, the root filesystem is read-only.
  // /tmp is the only writable directory.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT) {
    return path.join('/tmp', 'mami-app.db');
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

  // Ensure data directory exists
  if (!fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir, { recursive: true });
    } catch {
      // ignore if directory exists or cannot be created
    }
  }

  const db = new Database(dbPath);
  
  // High concurrency settings
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
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      properties TEXT NOT NULL,
      price INTEGER NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory (
      product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
      current_stock INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS carts (
      id TEXT PRIMARY KEY,
      session_id TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('open', 'checked_out', 'abandoned')) DEFAULT 'open',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id TEXT PRIMARY KEY,
      cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      frozen_unit_price INTEGER NOT NULL,
      UNIQUE(cart_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      cart_id TEXT NOT NULL REFERENCES carts(id),
      total INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'paid', 'failed')) DEFAULT 'paid',
      delivery_address TEXT NOT NULL,
      estimated_arrival_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_carts_session_id ON carts(session_id);
    CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
    CREATE INDEX IF NOT EXISTS idx_orders_cart_id ON orders(cart_id);
  `);
}

export function seedDatabase(db: Database.Database): void {
  const insertProduct = db.prepare(`
    INSERT INTO products (id, sku, name, description, properties, price, category, image_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertInventory = db.prepare(`
    INSERT INTO inventory (product_id, current_stock, version)
    VALUES (?, ?, 1)
  `);

  const seedTransaction = db.transaction(() => {
    const now = new Date().toISOString();
    for (const item of SEED_PRODUCTS) {
      insertProduct.run(
        item.code, // using code as stable product id
        item.code, // sku
        item.name,
        item.description,
        item.properties,
        item.price,
        item.category,
        item.image_url,
        now
      );

      insertInventory.run(
        item.code,
        item.initial_stock
      );
    }
  });

  seedTransaction();
}

export function autoSeedIfEmpty(db: Database.Database): void {
  try {
    const countRow = db.prepare(`SELECT COUNT(*) as count FROM products`).get() as { count: number } | undefined;
    if (!countRow || countRow.count === 0) {
      seedDatabase(db);
    }
  } catch {
    // If table doesn't exist yet, re-init and seed
    initSchema(db);
    seedDatabase(db);
  }
}

export function resetDatabase(db: Database.Database): void {
  db.exec(`
    DROP TABLE IF EXISTS order_items;
    DROP TABLE IF EXISTS orders;
    DROP TABLE IF EXISTS cart_items;
    DROP TABLE IF EXISTS carts;
    DROP TABLE IF EXISTS inventory;
    DROP TABLE IF EXISTS products;
  `);
  initSchema(db);
  seedDatabase(db);
}
