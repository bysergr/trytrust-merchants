import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { listProducts, searchProducts } from '../services/products';
import { addToCart, removeFromCart, getCartBySessionId } from '../services/cart';
import { executeCheckout } from '../services/checkout';
import { DeliveryAddress } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerMcpTools(server: any): void {
  // 1. list_products
  server.tool(
    'list_products',
    'List available products in the catalog with pagination and optional category filtering.',
    {
      page: z.number().int().min(1).optional().describe('Page number (default: 1)'),
      limit: z.number().int().min(1).max(100).optional().describe('Number of items per page (default: 20)'),
      category: z.string().optional().describe('Filter by category name (e.g. "Snacks & Chips", "Beverages & Sodas", etc.)'),
    },
    async ({ page, limit, category }: { page?: number; limit?: number; category?: string }) => {
      try {
        const result = listProducts({ page, limit, category });
        const formatted = {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          products: result.products.map((p) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            description: p.description,
            properties: p.properties,
            price_cop: p.price,
            formatted_price: `$${p.price.toLocaleString('en-US')} COP`,
            stock: p.current_stock,
            category: p.category,
          })),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formatted, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error listing products';
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${message}` }],
        };
      }
    }
  );

  // 2. search_products
  server.tool(
    'search_products',
    'Search products in the catalog by query keyword (matches title, description, or category).',
    {
      query: z.string().describe('Search query keyword'),
      category: z.string().optional().describe('Optional category filter'),
      limit: z.number().int().min(1).max(100).optional().describe('Maximum number of products to return (default: 20)'),
    },
    async ({ query, category, limit }: { query: string; category?: string; limit?: number }) => {
      try {
        const products = searchProducts({ query, category, limit });
        const formatted = products.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          description: p.description,
          properties: p.properties,
          price_cop: p.price,
          formatted_price: `$${p.price.toLocaleString('en-US')} COP`,
          stock: p.current_stock,
          category: p.category,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formatted, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error searching products';
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${message}` }],
        };
      }
    }
  );

  // 3. add_to_cart
  server.tool(
    'add_to_cart',
    'Add an item to the shopping cart. If session_id is not provided, the server generates a new one and returns it. Always preserve the returned session_id for subsequent cart operations.',
    {
      session_id: z.string().optional().describe('Cart session ID. Omit on initial call to generate a new session ID.'),
      product_id: z.string().describe('The product ID or SKU to add'),
      quantity: z.number().int().min(1).describe('Quantity of the product to add'),
    },
    async ({ session_id, product_id, quantity }: { session_id?: string; product_id: string; quantity: number }) => {
      try {
        const result = addToCart({
          sessionId: session_id,
          productId: product_id,
          quantity,
        });

        const output = {
          message: `Successfully added ${quantity} item(s) to cart.`,
          session_id: result.sessionId,
          cart: {
            cart_id: result.cartDetail.cart_id,
            status: result.cartDetail.status,
            item_count: result.cartDetail.item_count,
            total_cop: result.cartDetail.total,
            formatted_total: `$${result.cartDetail.total.toLocaleString('en-US')} COP`,
            items: result.cartDetail.items.map((i) => ({
              product_id: i.product_id,
              name: i.name,
              properties: i.properties,
              unit_price_cop: i.unit_price,
              quantity: i.quantity,
              subtotal_cop: i.subtotal,
              available_stock: i.available_stock,
            })),
          },
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(output, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add item to cart';
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${message}` }],
        };
      }
    }
  );

  // 4. remove_from_cart
  server.tool(
    'remove_from_cart',
    'Remove a product from the shopping cart or decrease its quantity.',
    {
      session_id: z.string().describe('The active cart session ID'),
      product_id: z.string().describe('The product ID or SKU to remove'),
      quantity: z.number().int().min(1).optional().describe('Optional quantity to subtract. If omitted or >= current quantity, item is removed entirely.'),
    },
    async ({ session_id, product_id, quantity }: { session_id: string; product_id: string; quantity?: number }) => {
      try {
        const result = removeFromCart({
          sessionId: session_id,
          productId: product_id,
          quantity,
        });

        const output = {
          message: 'Cart updated successfully.',
          session_id: result.sessionId,
          cart: {
            cart_id: result.cartDetail.cart_id,
            status: result.cartDetail.status,
            item_count: result.cartDetail.item_count,
            total_cop: result.cartDetail.total,
            formatted_total: `$${result.cartDetail.total.toLocaleString('en-US')} COP`,
            items: result.cartDetail.items.map((i) => ({
              product_id: i.product_id,
              name: i.name,
              properties: i.properties,
              unit_price_cop: i.unit_price,
              quantity: i.quantity,
              subtotal_cop: i.subtotal,
              available_stock: i.available_stock,
            })),
          },
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(output, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to remove item from cart';
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${message}` }],
        };
      }
    }
  );

  // 5. review_cart
  server.tool(
    'review_cart',
    'Review all items, quantities, subtotals, and total price in the active cart before checkout.',
    {
      session_id: z.string().describe('The active cart session ID'),
    },
    async ({ session_id }: { session_id: string }) => {
      try {
        const cartDetail = getCartBySessionId(session_id);
        if (!cartDetail) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Error: Cart with session ID '${session_id}' not found.` }],
          };
        }

        const output = {
          session_id: cartDetail.session_id,
          cart_id: cartDetail.cart_id,
          status: cartDetail.status,
          item_count: cartDetail.item_count,
          total_cop: cartDetail.total,
          formatted_total: `$${cartDetail.total.toLocaleString('en-US')} COP`,
          items: cartDetail.items.map((i) => ({
            product_id: i.product_id,
            sku: i.sku,
            name: i.name,
            properties: i.properties,
            unit_price_cop: i.unit_price,
            quantity: i.quantity,
            subtotal_cop: i.subtotal,
            available_stock: i.available_stock,
          })),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(output, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to review cart';
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${message}` }],
        };
      }
    }
  );

  // 6. pay
  server.tool(
    'pay',
    'Execute atomic checkout and payment for the active cart. Validates stock, decrements inventory, creates order, and calculates estimated arrival time.',
    {
      session_id: z.string().describe('The active cart session ID'),
      delivery_address: z.union([
        z.string().describe('Plain text delivery address'),
        z.object({
          street: z.string().describe('Street address and apartment/unit number'),
          city: z.string().describe('City name'),
          postal_code: z.string().optional().describe('Postal / Zip code'),
          recipient_name: z.string().optional().describe('Name of recipient'),
          phone: z.string().optional().describe('Contact phone number'),
          notes: z.string().optional().describe('Delivery instructions or access notes'),
        }),
      ]).describe('Delivery destination address'),
    },
    async ({ session_id, delivery_address }: { session_id: string; delivery_address: string | DeliveryAddress }) => {
      try {
        const order = executeCheckout({
          sessionId: session_id,
          deliveryAddress: delivery_address,
        });

        const output = {
          success: true,
          message: 'Payment simulated successfully. Order confirmed!',
          order_id: order.id,
          status: order.status,
          total_cop: order.total,
          formatted_total: `$${order.total.toLocaleString('en-US')} COP`,
          delivery_address: order.parsed_address,
          estimated_arrival_at: order.estimated_arrival_at,
          estimated_arrival_formatted: order.formatted_arrival,
          created_at: order.created_at,
          items: order.items.map((i) => ({
            product_id: i.product_id,
            sku: i.sku,
            name: i.name,
            properties: i.properties,
            quantity: i.quantity,
            unit_price_cop: i.unit_price,
            subtotal_cop: i.subtotal,
          })),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(output, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Checkout and payment failed';
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${message}` }],
        };
      }
    }
  );
}

export function createStoreMcpServer(): McpServer {
  const server = new McpServer({
    name: 'mami-store-mcp',
    version: '1.0.0',
  });

  registerMcpTools(server);
  return server;
}
