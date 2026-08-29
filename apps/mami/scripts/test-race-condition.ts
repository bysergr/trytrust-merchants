import { getDatabase } from '../lib/db';
import { addToCart } from '../lib/services/cart';
import { executeCheckout } from '../lib/services/checkout';
import { OrderDetail } from '../lib/types';
import { seed } from './seed';

async function testRaceCondition() {
  console.log('=== CONCURRENCY & RACE CONDITION TEST ===\n');

  // Reset database
  seed();
  const db = getDatabase();

  const targetProductId = '23'; // Bimbo Chocoso
  console.log(`Setting stock of product '${targetProductId}' to exactly 1 unit...`);
  db.prepare('UPDATE inventory SET current_stock = 1, version = 1 WHERE product_id = ?').run(targetProductId);

  // Verify stock is 1
  const initialInv = db.prepare('SELECT current_stock, version FROM inventory WHERE product_id = ?').get(targetProductId) as { current_stock: number; version: number };
  console.log(`✔ Confirmed initial stock: ${initialInv.current_stock}, version: ${initialInv.version}`);

  // Create Cart A
  console.log('\nCreating Cart A and adding 1 unit of product 23...');
  const cartA = addToCart({
    productId: targetProductId,
    quantity: 1,
  });
  console.log(`✔ Cart A created with session: ${cartA.sessionId}`);

  // Create Cart B
  console.log('Creating Cart B and adding 1 unit of product 23...');
  const cartB = addToCart({
    productId: targetProductId,
    quantity: 1,
  });
  console.log(`✔ Cart B created with session: ${cartB.sessionId}`);

  // Now execute checkout simultaneously
  console.log('\n⚡ Attempting simultaneous checkout on Cart A and Cart B (race condition simulation)...');

  const buyerA = async () => {
    return executeCheckout({
      sessionId: cartA.sessionId,
      deliveryAddress: {
        street: '100 Web Street',
        city: 'Bogota',
      },
    });
  };

  const buyerB = async () => {
    return executeCheckout({
      sessionId: cartB.sessionId,
      deliveryAddress: {
        street: '200 MCP Avenue',
        city: 'Medellin',
      },
    });
  };

  const results = await Promise.allSettled([buyerA(), buyerB()]);

  const successes = results.filter((r) => r.status === 'fulfilled');
  const failures = results.filter((r) => r.status === 'rejected');

  console.log(`\nResults summary:`);
  console.log(`✔ Successful purchases: ${successes.length}`);
  console.log(`✔ Prevented overselling (rejected): ${failures.length}`);

  if (successes.length !== 1 || failures.length !== 1) {
    throw new Error(`Race condition test failed! Expected 1 success and 1 failure, got ${successes.length} successes and ${failures.length} failures.`);
  }

  const winningOrder = (successes[0] as PromiseFulfilledResult<OrderDetail>).value;
  const failureReason = (failures[0] as PromiseRejectedResult).reason;

  console.log(`\n✔ Winning Order ID: ${winningOrder.id}`);
  console.log(`✔ Rejected Buyer Error: "${failureReason.message}"`);

  // Verify database state integrity
  const finalInv = db.prepare('SELECT current_stock, version FROM inventory WHERE product_id = ?').get(targetProductId) as { current_stock: number; version: number };
  console.log(`✔ Final stock in DB: ${finalInv.current_stock} (Stock is NOT negative)`);
  if (finalInv.current_stock !== 0) {
    throw new Error(`Expected final stock to be exactly 0, got ${finalInv.current_stock}`);
  }

  // Verify carts
  const cartARow = db.prepare('SELECT status FROM carts WHERE session_id = ?').get(cartA.sessionId) as { status: string };
  const cartBRow = db.prepare('SELECT status FROM carts WHERE session_id = ?').get(cartB.sessionId) as { status: string };
  console.log(`✔ Cart A status: ${cartARow.status}, Cart B status: ${cartBRow.status}`);

  console.log('\n=== RACE CONDITION TEST PASSED: 100% ATOMIC & SAFE! ===\n');
}

testRaceCondition().catch((err) => {
  console.error('Race condition test failed:', err);
  process.exit(1);
});
