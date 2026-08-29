import { listProducts, searchProducts } from '../lib/services/products';
import { addToCart, removeFromCart, getCartBySessionId } from '../lib/services/cart';
import { executeCheckout, getOrderById } from '../lib/services/checkout';
import { seed } from './seed';

async function testAllMcpServices() {
  console.log('=== MCP & SERVICE LAYER TEST SUITE ===\n');

  // 1. Reset and seed database
  console.log('Step 1: Resetting and seeding database...');
  seed();
  console.log('✔ Seed complete.\n');

  // 2. Test list_products
  console.log('Step 2: Testing listProducts...');
  const listResult = listProducts({ page: 1, limit: 10 });
  console.log(`✔ Found ${listResult.total} products, page ${listResult.page}/${listResult.totalPages}`);
  if (listResult.products.length !== 10) throw new Error('Expected 10 products on page 1');

  // Test category filter
  const categoryFilter = listProducts({ category: 'Beverages & Sodas' });
  console.log(`✔ Found ${categoryFilter.products.length} products in 'Beverages & Sodas' category.`);

  // 3. Test search_products
  console.log('\nStep 3: Testing searchProducts...');
  const searchChips = searchProducts({ query: 'Rizadas' });
  console.log(`✔ Search for 'Rizadas' found ${searchChips.length} products:`, searchChips.map((p) => p.name));
  if (searchChips.length === 0) throw new Error("Expected to find 'Rizadas'");

  // 4. Test add_to_cart (New Session)
  console.log('\nStep 4: Testing add_to_cart (generating new session_id)...');
  const add1 = addToCart({
    productId: '10', // Yupi Rizadas Mayonesa
    quantity: 2,
  });
  console.log(`✔ Server generated session_id: ${add1.sessionId}`);
  console.log(`✔ Cart item count: ${add1.cartDetail.item_count}, Total: $${add1.cartDetail.total} COP`);
  const sessionId = add1.sessionId;

  // Add another product to existing session
  console.log('\nStep 5: Adding second item to existing cart session...');
  const add2 = addToCart({
    sessionId,
    productId: '51', // Coca-Cola Zero
    quantity: 3,
  });
  console.log(`✔ Cart updated. Items: ${add2.cartDetail.items.length}, Total items: ${add2.cartDetail.item_count}, Grand total: $${add2.cartDetail.total} COP`);

  // 6. Test review_cart
  console.log('\nStep 6: Testing review_cart...');
  const reviewed = getCartBySessionId(sessionId);
  if (!reviewed) throw new Error('Cart not found');
  console.log(`✔ Cart review: ${reviewed.items.length} unique products, Total: $${reviewed.total} COP`);
  for (const it of reviewed.items) {
    console.log(`   - ${it.name} (${it.properties}): ${it.quantity} x $${it.unit_price} = $${it.subtotal}`);
  }

  // 7. Test remove_from_cart
  console.log('\nStep 7: Testing remove_from_cart (decreasing quantity)...');
  const removed1 = removeFromCart({
    sessionId,
    productId: '51',
    quantity: 1, // 3 - 1 = 2 remaining
  });
  console.log(`✔ Subtracted 1 Coca-Cola Zero. New cart total: $${removed1.cartDetail.total} COP`);

  // 8. Test pay (Checkout)
  console.log('\nStep 8: Testing pay (atomic checkout)...');
  const address = {
    street: '742 Evergreen Terrace, Apt 4B',
    city: 'Bogotá',
    postal_code: '110111',
    recipient_name: 'Alex Johnson',
    notes: 'Please ring bell upon arrival',
  };

  const initialStock10 = searchProducts({ query: 'Yupi Rizadas Mayonesa' })[0].current_stock;

  const order = executeCheckout({
    sessionId,
    deliveryAddress: address,
  });

  console.log(`✔ Order created successfully!`);
  console.log(`   - Order ID: ${order.id}`);
  console.log(`   - Status: ${order.status}`);
  console.log(`   - Total Paid: $${order.total} COP`);
  console.log(`   - Estimated Arrival: ${order.estimated_arrival_at} (${order.formatted_arrival})`);

  // Verify stock decremented
  const updatedStock10 = searchProducts({ query: 'Yupi Rizadas Mayonesa' })[0].current_stock;
  console.log(`✔ Inventory verification: Product '10' stock went from ${initialStock10} -> ${updatedStock10} (-2)`);
  if (updatedStock10 !== initialStock10 - 2) throw new Error('Stock did not decrement accurately');

  // Verify order details retrieval
  const fetchedOrder = getOrderById(order.id);
  if (!fetchedOrder) throw new Error('Order lookup failed');
  console.log(`✔ Verified getOrderById: found order with ${fetchedOrder.items.length} line items.`);

  console.log('\n=== ALL MCP TOOLS & SERVICE TESTS PASSED SUCCESSFULLY! ===\n');
}

testAllMcpServices().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
