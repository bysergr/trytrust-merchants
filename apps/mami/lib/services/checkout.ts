import crypto from 'node:crypto';
import { getDatabase } from '../db';
import { Cart, DeliveryAddress, Order, OrderDetail } from '../types';
import { calculateEstimatedArrival } from './estimated-arrival';

export interface PayParams {
  sessionId: string;
  deliveryAddress: string | DeliveryAddress;
}

export function executeCheckout(params: PayParams): OrderDetail {
  const db = getDatabase();

  if (!params.sessionId) {
    throw new Error('Session ID is required to process checkout.');
  }

  if (!params.deliveryAddress) {
    throw new Error('Delivery address is required.');
  }

  // Format delivery address if object
  let formattedAddress = '';
  let parsedAddressObj: DeliveryAddress | string = params.deliveryAddress;
  if (typeof params.deliveryAddress === 'string') {
    formattedAddress = params.deliveryAddress.trim();
    if (!formattedAddress) {
      throw new Error('Delivery address cannot be empty.');
    }
  } else {
    const addr = params.deliveryAddress;
    if (!addr.street || !addr.street.trim() || !addr.city || !addr.city.trim()) {
      throw new Error('Street and City are required fields for the delivery address.');
    }
    formattedAddress = JSON.stringify(addr);
    parsedAddressObj = addr;
  }

  // Execute atomic immediate transaction
  const payTransaction = db.transaction(() => {
    // 1. Fetch and validate cart
    const cart = db.prepare(`SELECT * FROM carts WHERE session_id = ?`).get(params.sessionId) as Cart | undefined;
    if (!cart) {
      throw new Error(`Cart with session ID '${params.sessionId}' was not found.`);
    }

    if (cart.status !== 'open') {
      throw new Error(`Cart session '${params.sessionId}' is already ${cart.status}. Cannot checkout an inactive cart.`);
    }

    // 2. Fetch cart items
    interface ItemRow {
      product_id: string;
      sku: string;
      name: string;
      properties: string;
      image_url: string;
      quantity: number;
      frozen_unit_price: number;
      current_stock: number;
      version: number;
    }

    const items = db.prepare(`
      SELECT 
        ci.product_id,
        ci.quantity,
        ci.frozen_unit_price,
        p.sku,
        p.name,
        p.properties,
        p.image_url,
        COALESCE(i.current_stock, 0) as current_stock,
        COALESCE(i.version, 1) as version
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE ci.cart_id = ?
    `).all(cart.id) as ItemRow[];

    if (items.length === 0) {
      throw new Error('Cannot checkout an empty cart.');
    }

    // 3. Validate stock & decrement inventory atomically with optimistic concurrency control
    let orderTotal = 0;
    const orderItemsToInsert: Array<{
      id: string;
      product_id: string;
      sku: string;
      name: string;
      properties: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
      previous_stock?: number;
      remaining_stock?: number;
      image_url: string;
    }> = [];

    for (const item of items) {
      // Re-read row inside immediate transaction to guarantee fresh stock & version
      const invRow = db.prepare(`
        SELECT current_stock, version FROM inventory WHERE product_id = ?
      `).get(item.product_id) as { current_stock: number; version: number } | undefined;

      if (!invRow || invRow.current_stock < item.quantity) {
        const available = invRow ? invRow.current_stock : 0;
        throw new Error(
          `Insufficient stock for '${item.name}'. Requested: ${item.quantity}, available: ${available}.`
        );
      }

      // Decrement inventory verifying current version
      const updateResult = db.prepare(`
        UPDATE inventory 
        SET current_stock = current_stock - ?, version = version + 1
        WHERE product_id = ? AND version = ? AND current_stock >= ?
      `).run(item.quantity, item.product_id, invRow.version, item.quantity);

      if (updateResult.changes !== 1) {
        throw new Error(`Concurrent stock modification detected for '${item.name}'. Please try your order again.`);
      }

      const subtotal = item.quantity * item.frozen_unit_price;
      orderTotal += subtotal;

      orderItemsToInsert.push({
        id: crypto.randomUUID(),
        product_id: item.product_id,
        sku: item.sku,
        name: item.name,
        properties: item.properties,
        quantity: item.quantity,
        unit_price: item.frozen_unit_price,
        subtotal,
        previous_stock: invRow.current_stock,
        remaining_stock: invRow.current_stock - item.quantity,
        image_url: item.image_url,
      });
    }

    // 4. Calculate estimated delivery arrival (random moment within next 4 hours)
    const now = new Date();
    const arrival = calculateEstimatedArrival(now);

    // 5. Create order record
    const orderId = crypto.randomUUID();
    const nowIso = now.toISOString();

    db.prepare(`
      INSERT INTO orders (id, cart_id, total, status, delivery_address, estimated_arrival_at, created_at)
      VALUES (?, ?, ?, 'paid', ?, ?, ?)
    `).run(orderId, cart.id, orderTotal, formattedAddress, arrival.iso, nowIso);

    // 6. Insert order items
    const insertOrderItem = db.prepare(`
      INSERT INTO order_items (id, order_id, product_id, quantity, unit_price)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const oi of orderItemsToInsert) {
      insertOrderItem.run(oi.id, orderId, oi.product_id, oi.quantity, oi.unit_price);
    }

    // 7. Mark cart as checked out
    db.prepare(`
      UPDATE carts 
      SET status = 'checked_out', updated_at = ?
      WHERE id = ?
    `).run(nowIso, cart.id);

    // Return completed order detail
    const orderDetail: OrderDetail = {
      id: orderId,
      cart_id: cart.id,
      total: orderTotal,
      status: 'paid',
      delivery_address: formattedAddress,
      parsed_address: parsedAddressObj,
      estimated_arrival_at: arrival.iso,
      created_at: nowIso,
      items: orderItemsToInsert,
      currency: 'COP',
      formatted_arrival: arrival.formatted,
    };

    return orderDetail;
  });

  return payTransaction.immediate();
}

export function getOrderById(orderId: string): OrderDetail | null {
  const db = getDatabase();
  const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(orderId) as Order | undefined;
  if (!order) {
    return null;
  }

  interface OrderItemRow {
    product_id: string;
    sku: string;
    name: string;
    properties: string;
    image_url: string;
    quantity: number;
    unit_price: number;
  }

  const itemRows = db.prepare(`
    SELECT 
      oi.product_id,
      oi.quantity,
      oi.unit_price,
      p.sku,
      p.name,
      p.properties,
      p.image_url
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
    ORDER BY p.name ASC
  `).all(order.id) as OrderItemRow[];

  let parsedAddress: DeliveryAddress | string = order.delivery_address;
  try {
    if (order.delivery_address.startsWith('{')) {
      parsedAddress = JSON.parse(order.delivery_address);
    }
  } catch {
    parsedAddress = order.delivery_address;
  }

  const arrivalDate = new Date(order.estimated_arrival_at);
  const formattedArrival = `Estimated Arrival: ${arrivalDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} by ${arrivalDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })}`;

  return {
    id: order.id,
    cart_id: order.cart_id,
    total: order.total,
    status: order.status,
    delivery_address: order.delivery_address,
    parsed_address: parsedAddress,
    estimated_arrival_at: order.estimated_arrival_at,
    created_at: order.created_at,
    items: itemRows.map((r) => ({
      product_id: r.product_id,
      sku: r.sku,
      name: r.name,
      properties: r.properties,
      quantity: r.quantity,
      unit_price: r.unit_price,
      subtotal: r.quantity * r.unit_price,
      image_url: r.image_url,
    })),
    currency: 'COP',
    formatted_arrival: formattedArrival,
  };
}
