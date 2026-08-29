import { getDatabase, resetDatabase } from '../lib/db';
import { SEED_PRODUCTS } from '../lib/catalog-data';

export function seed() {
  const db = getDatabase();
  console.log('[Database] Resetting database tables...');
  resetDatabase(db);

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
  console.log(`[Database] Successfully seeded ${SEED_PRODUCTS.length} products with initial inventory!`);
}

// Run directly if executed as a script
if (require.main === module || process.argv[1]?.includes('seed')) {
  seed();
}
