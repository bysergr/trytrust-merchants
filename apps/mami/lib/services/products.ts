import { getDatabase } from '../db';
import { ProductWithStock } from '../types';

export interface ListProductsParams {
  page?: number;
  limit?: number;
  category?: string;
  sortBy?: 'name' | 'price_asc' | 'price_desc' | 'popular';
}

export interface ListProductsResult {
  products: ProductWithStock[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function listProducts(params: ListProductsParams = {}): ListProductsResult {
  const db = getDatabase();
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const offset = (page - 1) * limit;

  let countSql = `SELECT COUNT(*) as count FROM products p`;
  let selectSql = `
    SELECT 
      p.id,
      p.sku,
      p.name,
      p.description,
      p.properties,
      p.price,
      p.category,
      p.image_url,
      p.created_at,
      COALESCE(i.current_stock, 0) as current_stock,
      COALESCE(i.version, 1) as version
    FROM products p
    LEFT JOIN inventory i ON p.id = i.product_id
  `;

  const queryParams: unknown[] = [];
  const countParams: unknown[] = [];

  if (params.category && params.category !== 'all') {
    countSql += ` WHERE p.category = ?`;
    selectSql += ` WHERE p.category = ?`;
    queryParams.push(params.category);
    countParams.push(params.category);
  }

  // Ordering
  if (params.sortBy === 'price_asc') {
    selectSql += ` ORDER BY p.price ASC`;
  } else if (params.sortBy === 'price_desc') {
    selectSql += ` ORDER BY p.price DESC`;
  } else {
    selectSql += ` ORDER BY CAST(p.id AS INTEGER) ASC`;
  }

  selectSql += ` LIMIT ? OFFSET ?`;
  queryParams.push(limit, offset);

  const countRow = db.prepare(countSql).get(...countParams) as { count: number };
  const total = countRow ? countRow.count : 0;
  const products = db.prepare(selectSql).all(...queryParams) as ProductWithStock[];
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    products,
    total,
    page,
    limit,
    totalPages,
  };
}

export interface SearchProductsParams {
  query: string;
  category?: string;
  limit?: number;
}

export function searchProducts(params: SearchProductsParams): ProductWithStock[] {
  const db = getDatabase();
  const query = (params.query || '').trim();
  const limit = Math.max(1, Math.min(100, params.limit || 20));

  if (!query) {
    return listProducts({ limit, category: params.category }).products;
  }

  const searchPattern = `%${query}%`;
  let sql = `
    SELECT 
      p.id,
      p.sku,
      p.name,
      p.description,
      p.properties,
      p.price,
      p.category,
      p.image_url,
      p.created_at,
      COALESCE(i.current_stock, 0) as current_stock,
      COALESCE(i.version, 1) as version
    FROM products p
    LEFT JOIN inventory i ON p.id = i.product_id
    WHERE (
      p.name LIKE ? 
      OR p.description LIKE ? 
      OR p.category LIKE ? 
      OR p.sku LIKE ?
    )
  `;

  const queryParams: unknown[] = [searchPattern, searchPattern, searchPattern, searchPattern];

  if (params.category && params.category !== 'all') {
    sql += ` AND p.category = ?`;
    queryParams.push(params.category);
  }

  sql += `
    ORDER BY 
      CASE 
        WHEN LOWER(p.name) = LOWER(?) THEN 1
        WHEN LOWER(p.name) LIKE LOWER(?) THEN 2
        WHEN LOWER(p.category) LIKE LOWER(?) THEN 3
        ELSE 4
      END,
      CAST(p.id AS INTEGER) ASC
    LIMIT ?
  `;

  queryParams.push(query, `${query}%`, `${query}%`, limit);

  return db.prepare(sql).all(...queryParams) as ProductWithStock[];
}

export function getProductById(id: string): ProductWithStock | null {
  const db = getDatabase();
  const sql = `
    SELECT 
      p.id,
      p.sku,
      p.name,
      p.description,
      p.properties,
      p.price,
      p.category,
      p.image_url,
      p.created_at,
      COALESCE(i.current_stock, 0) as current_stock,
      COALESCE(i.version, 1) as version
    FROM products p
    LEFT JOIN inventory i ON p.id = i.product_id
    WHERE p.id = ? OR p.sku = ?
    LIMIT 1
  `;
  const row = db.prepare(sql).get(id, id) as ProductWithStock | undefined;
  return row || null;
}

export function getCategories(): string[] {
  const db = getDatabase();
  const rows = db.prepare(`SELECT DISTINCT category FROM products ORDER BY category ASC`).all() as Array<{ category: string }>;
  return rows.map((r) => r.category);
}

export interface UpdateProductParams {
  id: string;
  price?: number;
  current_stock?: number;
}

export function updateProduct(params: UpdateProductParams): ProductWithStock {
  const db = getDatabase();

  if (!params.id || typeof params.id !== 'string' || !params.id.trim()) {
    throw new Error('Product ID is required.');
  }

  if (params.price === undefined && params.current_stock === undefined) {
    throw new Error('At least one field to update (price or current_stock) must be provided.');
  }

  if (params.price !== undefined && params.price !== null) {
    if (typeof params.price !== 'number' || !Number.isInteger(params.price) || params.price < 0) {
      throw new Error('Price must be a non-negative integer.');
    }
  }

  if (params.current_stock !== undefined && params.current_stock !== null) {
    if (typeof params.current_stock !== 'number' || !Number.isInteger(params.current_stock) || params.current_stock < 0) {
      throw new Error('Current stock must be a non-negative integer.');
    }
  }

  const updateTx = db.transaction(() => {
    // Check product exists
    const existing = db.prepare(`SELECT id FROM products WHERE id = ? OR sku = ? LIMIT 1`).get(params.id, params.id) as { id: string } | undefined;
    if (!existing) {
      throw new Error(`Product with ID '${params.id}' was not found.`);
    }

    const productId = existing.id;

    if (params.price !== undefined && params.price !== null) {
      db.prepare(`UPDATE products SET price = ? WHERE id = ?`).run(params.price, productId);
    }

    if (params.current_stock !== undefined && params.current_stock !== null) {
      const invRow = db.prepare(`SELECT product_id FROM inventory WHERE product_id = ?`).get(productId);
      if (invRow) {
        db.prepare(`
          UPDATE inventory 
          SET current_stock = ?, version = version + 1 
          WHERE product_id = ?
        `).run(params.current_stock, productId);
      } else {
        db.prepare(`
          INSERT INTO inventory (product_id, current_stock, version) 
          VALUES (?, ?, 1)
        `).run(productId, params.current_stock);
      }
    }

    const updated = db.prepare(`
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.description,
        p.properties,
        p.price,
        p.category,
        p.image_url,
        p.created_at,
        COALESCE(i.current_stock, 0) as current_stock,
        COALESCE(i.version, 1) as version
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE p.id = ?
      LIMIT 1
    `).get(productId) as ProductWithStock;

    return updated;
  });

  return updateTx();
}
