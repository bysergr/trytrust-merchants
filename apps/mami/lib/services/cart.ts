import crypto from 'node:crypto';
import { getDatabase } from '../db';
import { Cart, CartDetail } from '../types';
import { getProductById } from './products';

/**
 * Validates and retrieves an existing cart or creates a new one with a cryptographically
 * random session_id if no sessionId was provided.
 */
export function getOrCreateCart(sessionId?: string): { cart: Cart; isNew: boolean } {
  const db = getDatabase();

  if (sessionId) {
    const existing = db.prepare(`SELECT * FROM carts WHERE session_id = ?`).get(sessionId) as Cart | undefined;
    if (existing) {
      if (existing.status !== 'open') {
        throw new Error(`Cart session '${sessionId}' is already ${existing.status}. Please start a new cart.`);
      }
      return { cart: existing, isNew: false };
    }
    // If client supplied a session_id that does not exist, reject it (cannot fabricate session_ids)
    throw new Error(`Cart session '${sessionId}' not found. Leave session_id empty to create a new cart.`);
  }

  // Generate server-side UUID
  const newId = crypto.randomUUID();
  const newSessionId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO carts (id, session_id, status, created_at, updated_at)
    VALUES (?, ?, 'open', ?, ?)
  `).run(newId, newSessionId, now, now);

  const newCart = db.prepare(`SELECT * FROM carts WHERE id = ?`).get(newId) as Cart;
  return { cart: newCart, isNew: true };
}

/**
 * Returns full cart detail including items, prices, stock, and total.
 */
export function getCartBySessionId(sessionId: string): CartDetail | null {
  const db = getDatabase();
  const cart = db.prepare(`SELECT * FROM carts WHERE session_id = ?`).get(sessionId) as Cart | undefined;
  if (!cart) {
    return null;
  }

  return buildCartDetail(cart);
}

export function buildCartDetail(cart: Cart): CartDetail {
  const db = getDatabase();
  interface DbCartItemRow {
    cart_item_id: string;
    product_id: string;
    sku: string;
    name: string;
    description: string;
    properties: string;
    category: string;
    image_url: string;
    frozen_unit_price: number;
    quantity: number;
    current_stock: number;
  }

  const rows = db.prepare(`
    SELECT 
      ci.id as cart_item_id,
      ci.product_id,
      ci.quantity,
      ci.frozen_unit_price,
      p.sku,
      p.name,
      p.description,
      p.properties,
      p.category,
      p.image_url,
      COALESCE(i.current_stock, 0) as current_stock
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    LEFT JOIN inventory i ON p.id = i.product_id
    WHERE ci.cart_id = ?
    ORDER BY p.name ASC
  `).all(cart.id) as DbCartItemRow[];

  let total = 0;
  let itemCount = 0;

  const items = rows.map((r) => {
    const subtotal = r.quantity * r.frozen_unit_price;
    total += subtotal;
    itemCount += r.quantity;

    return {
      product_id: r.product_id,
      sku: r.sku,
      name: r.name,
      description: r.description,
      properties: r.properties,
      category: r.category,
      image_url: r.image_url,
      unit_price: r.frozen_unit_price,
      quantity: r.quantity,
      subtotal,
      available_stock: r.current_stock,
    };
  });

  return {
    cart_id: cart.id,
    session_id: cart.session_id,
    status: cart.status,
    items,
    item_count: itemCount,
    total,
    currency: 'COP',
  };
}

export interface AddToCartParams {
  sessionId?: string;
  productId: string;
  quantity: number;
}

export function addToCart(params: AddToCartParams): { cartDetail: CartDetail; sessionId: string; isNewSession: boolean } {
  const db = getDatabase();
  const quantity = Math.floor(params.quantity);

  if (isNaN(quantity) || quantity <= 0) {
    throw new Error('Quantity must be a positive integer greater than 0.');
  }

  // Validate product exists
  const product = getProductById(params.productId);
  if (!product) {
    throw new Error(`Product with ID or SKU '${params.productId}' not found.`);
  }

  // Get or create cart
  const { cart, isNew } = getOrCreateCart(params.sessionId);

  // Check existing quantity in cart
  const existingItem = db.prepare(`
    SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?
  `).get(cart.id, product.id) as { id: string; quantity: number } | undefined;

  const currentCartQty = existingItem ? existingItem.quantity : 0;
  const newTotalQty = currentCartQty + quantity;

  // Check inventory
  if (product.current_stock < newTotalQty) {
    throw new Error(
      `Cannot add ${quantity} unit(s) of '${product.name}'. Current stock is ${product.current_stock}, and you already have ${currentCartQty} in your cart.`
    );
  }

  const now = new Date().toISOString();

  // Insert or update cart_item
  const writeTx = db.transaction(() => {
    if (existingItem) {
      db.prepare(`
        UPDATE cart_items 
        SET quantity = ?, frozen_unit_price = ?
        WHERE id = ?
      `).run(newTotalQty, product.price, existingItem.id);
    } else {
      const newItemId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO cart_items (id, cart_id, product_id, quantity, frozen_unit_price)
        VALUES (?, ?, ?, ?, ?)
      `).run(newItemId, cart.id, product.id, quantity, product.price);
    }

    db.prepare(`UPDATE carts SET updated_at = ? WHERE id = ?`).run(now, cart.id);
  });

  writeTx();

  const cartDetail = buildCartDetail(cart);
  return {
    cartDetail,
    sessionId: cart.session_id,
    isNewSession: isNew,
  };
}

export interface RemoveFromCartParams {
  sessionId: string;
  productId: string;
  quantity?: number;
}

export function removeFromCart(params: RemoveFromCartParams): { cartDetail: CartDetail; sessionId: string } {
  const db = getDatabase();

  if (!params.sessionId) {
    throw new Error('Session ID is required to remove an item from the cart.');
  }

  const cart = db.prepare(`SELECT * FROM carts WHERE session_id = ?`).get(params.sessionId) as Cart | undefined;
  if (!cart) {
    throw new Error(`Cart session '${params.sessionId}' not found.`);
  }

  if (cart.status !== 'open') {
    throw new Error(`Cart session '${params.sessionId}' is already ${cart.status}.`);
  }

  // Find product by id or sku
  const product = getProductById(params.productId);
  const targetProductId = product ? product.id : params.productId;

  const existingItem = db.prepare(`
    SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?
  `).get(cart.id, targetProductId) as { id: string; quantity: number } | undefined;

  if (!existingItem) {
    throw new Error(`Product '${params.productId}' is not in the cart.`);
  }

  const now = new Date().toISOString();

  const writeTx = db.transaction(() => {
    if (params.quantity === undefined || params.quantity === null) {
      // Remove entirely
      db.prepare(`DELETE FROM cart_items WHERE id = ?`).run(existingItem.id);
    } else {
      const subtractQty = Math.floor(params.quantity);
      if (isNaN(subtractQty) || subtractQty <= 0) {
        throw new Error('Quantity to remove must be a positive integer.');
      }

      const remainingQty = existingItem.quantity - subtractQty;
      if (remainingQty <= 0) {
        db.prepare(`DELETE FROM cart_items WHERE id = ?`).run(existingItem.id);
      } else {
        db.prepare(`UPDATE cart_items SET quantity = ? WHERE id = ?`).run(remainingQty, existingItem.id);
      }
    }

    db.prepare(`UPDATE carts SET updated_at = ? WHERE id = ?`).run(now, cart.id);
  });

  writeTx();

  const cartDetail = buildCartDetail(cart);
  return {
    cartDetail,
    sessionId: cart.session_id,
  };
}
