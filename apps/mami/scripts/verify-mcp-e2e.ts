/* eslint-disable @typescript-eslint/no-explicit-any */
import http from 'node:http';
import { NextRequest } from 'next/server';
import { POST as mcpPost, GET as mcpGet, OPTIONS as mcpOptions } from '../app/api/mcp/route';
import { GET as productsGet } from '../app/api/products/route';
import { GET as cartGet, POST as cartPost, DELETE as cartDelete } from '../app/api/cart/route';
import { POST as checkoutPost } from '../app/api/checkout/route';
import { getDatabase } from '../lib/db';
import { seed } from './seed';

// ANSI colors for clean CLI reporting
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function logStep(step: number, title: string) {
  console.log(`\n${BOLD}${CYAN}[Step ${step}]${RESET} ${BOLD}${title}${RESET}`);
}

function logSuccess(msg: string) {
  console.log(`  ${GREEN}✔${RESET} ${msg}`);
}

function logInfo(msg: string) {
  console.log(`  ${DIM}ℹ ${msg}${RESET}`);
}

interface JsonRpcResponse {
  jsonrpc: string;
  id?: number | string | null;
  result?: {
    content?: Array<{ type: string; text: string }>;
    isError?: boolean;
    [key: string]: any;
  };
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

let rpcIdCounter = 1;

/**
 * Creates and starts a lightweight Node HTTP server dispatching requests to Next.js route handlers
 */
async function startHttpTestServer(): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  let serverPort = 0;

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://127.0.0.1:${serverPort}`);
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) {
          if (Array.isArray(value)) {
            for (const v of value) headers.append(key, v);
          } else {
            headers.set(key, value);
          }
        }
      }

      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const body = req.method !== 'GET' && req.method !== 'HEAD' && chunks.length > 0
        ? Buffer.concat(chunks)
        : undefined;

      const nextReq = new NextRequest(url.toString(), {
        method: req.method,
        headers,
        body,
      });

      let webRes: Response;

      if (url.pathname === '/api/mcp') {
        if (req.method === 'POST') {
          webRes = await mcpPost(nextReq);
        } else if (req.method === 'GET') {
          webRes = await mcpGet(nextReq);
        } else if (req.method === 'OPTIONS') {
          webRes = await mcpOptions(nextReq);
        } else {
          webRes = new Response('Method Not Allowed', { status: 405 });
        }
      } else if (url.pathname === '/api/products') {
        webRes = await productsGet(nextReq);
      } else if (url.pathname === '/api/cart') {
        if (req.method === 'GET') {
          webRes = await cartGet(nextReq);
        } else if (req.method === 'POST') {
          webRes = await cartPost(nextReq);
        } else if (req.method === 'DELETE') {
          webRes = await cartDelete(nextReq);
        } else {
          webRes = new Response('Method Not Allowed', { status: 405 });
        }
      } else if (url.pathname === '/api/checkout') {
        webRes = await checkoutPost(nextReq);
      } else {
        webRes = new Response('Not Found', { status: 404 });
      }

      res.statusCode = webRes.status;
      webRes.headers.forEach((val, key) => {
        res.setHeader(key, val);
      });

      const arrayBuffer = await webRes.arrayBuffer();
      res.end(Buffer.from(arrayBuffer));
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err.message || 'Internal Test Server Error' }));
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        serverPort = addr.port;
      }
      resolve();
    });
  });

  const baseUrl = `http://127.0.0.1:${serverPort}`;
  return {
    baseUrl,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

/**
 * Invokes an MCP tool via standard JSON-RPC HTTP POST to /api/mcp
 */
async function callMcpTool(baseUrl: string, toolName: string, args: Record<string, any> = {}): Promise<{
  isError: boolean;
  data: any;
  rawText: string;
  rawJsonRpc: JsonRpcResponse;
}> {
  const currentId = rpcIdCounter++;
  const payload = {
    jsonrpc: '2.0',
    id: currentId,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args,
    },
  };

  const response = await fetch(`${baseUrl}/api/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`MCP HTTP call failed with status ${response.status}: ${errText}`);
  }

  const rawText = await response.text();
  let jsonRpcResp: JsonRpcResponse | null = null;

  // Parse SSE format (lines starting with data: ) or direct JSON
  for (const line of rawText.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('data:')) {
      try {
        jsonRpcResp = JSON.parse(trimmed.slice(5).trim());
        break;
      } catch {
        // continue parsing
      }
    }
  }

  if (!jsonRpcResp) {
    try {
      jsonRpcResp = JSON.parse(rawText) as JsonRpcResponse;
    } catch {
      throw new Error(`Could not parse JSON-RPC response from MCP. Raw output: ${rawText}`);
    }
  }

  if (!jsonRpcResp) {
    throw new Error(`No JSON-RPC payload found in MCP response: ${rawText}`);
  }

  if (jsonRpcResp.error) {
    return {
      isError: true,
      data: jsonRpcResp.error,
      rawText: jsonRpcResp.error.message,
      rawJsonRpc: jsonRpcResp,
    };
  }

  const result = jsonRpcResp.result;
  const isError = Boolean(result?.isError);
  const textContent = result?.content?.find((c: any) => c.type === 'text')?.text || '';

  let parsedData: any = textContent;
  try {
    parsedData = JSON.parse(textContent);
  } catch {
    // If not json string, keep raw text
  }

  return {
    isError,
    data: parsedData,
    rawText: textContent,
    rawJsonRpc: jsonRpcResp,
  };
}

async function runVerification() {
  console.log(`${BOLD}========================================================================${RESET}`);
  console.log(`${BOLD}     MAMI STORE - COMPREHENSIVE E2E MCP & INVENTORY VERIFICATION       ${RESET}`);
  console.log(`${BOLD}========================================================================${RESET}`);

  // Start HTTP Test Server
  const { baseUrl, close } = await startHttpTestServer();
  logInfo(`HTTP Test Server active on ${baseUrl}`);

  try {
    // ------------------------------------------------------------------------
    // Step 1: Reset and reseed database
    // ------------------------------------------------------------------------
    logStep(1, 'Resetting and reseeding database');
    seed();
    logSuccess('Database dropped, recreated schema, and seeded 22 products.');

    // ------------------------------------------------------------------------
    // Step 2: Check initial stock of multiple products
    // ------------------------------------------------------------------------
    logStep(2, 'Checking initial stock of target products in database');
    const db = getDatabase();
    const inv10 = db.prepare('SELECT current_stock FROM inventory WHERE product_id = ?').get('10') as { current_stock: number };
    const inv30 = db.prepare('SELECT current_stock FROM inventory WHERE product_id = ?').get('30') as { current_stock: number };

    if (!inv10 || inv10.current_stock !== 45) {
      throw new Error(`Expected Product '10' (Yupi Rizadas Mayonesa) initial stock = 45, got: ${inv10?.current_stock}`);
    }
    if (!inv30 || inv30.current_stock !== 60) {
      throw new Error(`Expected Product '30' (Festival Limón) initial stock = 60, got: ${inv30?.current_stock}`);
    }

    logSuccess(`Product 10 ("Yupi Rizadas Mayonesa") confirmed initial stock: ${inv10.current_stock}`);
    logSuccess(`Product 30 ("Festival Limón") confirmed initial stock: ${inv30.current_stock}`);

    // ------------------------------------------------------------------------
    // Step 3: Test MCP tools search_products and list_products via HTTP JSON-RPC
    // ------------------------------------------------------------------------
    logStep(3, 'Testing MCP tools "search_products" and "list_products" via HTTP JSON-RPC to /api/mcp');

    // 3a. search_products for 'Rizadas'
    const searchRes1 = await callMcpTool(baseUrl, 'search_products', { query: 'Rizadas' });
    if (searchRes1.isError || !Array.isArray(searchRes1.data) || searchRes1.data.length === 0) {
      throw new Error(`MCP search_products('Rizadas') failed: ${searchRes1.rawText}`);
    }
    const item10 = searchRes1.data.find((p: any) => p.id === '10');
    if (!item10 || item10.stock !== 45) {
      throw new Error(`Expected product 10 in search results with stock 45, found: ${JSON.stringify(item10)}`);
    }
    logSuccess(`MCP search_products('Rizadas') returned ${searchRes1.data.length} matches. Product 10 stock: ${item10.stock}`);

    // 3b. search_products for 'Festival'
    const searchRes2 = await callMcpTool(baseUrl, 'search_products', { query: 'Festival' });
    if (searchRes2.isError || !Array.isArray(searchRes2.data) || searchRes2.data.length === 0) {
      throw new Error(`MCP search_products('Festival') failed: ${searchRes2.rawText}`);
    }
    const item30 = searchRes2.data.find((p: any) => p.id === '30');
    if (!item30 || item30.stock !== 60) {
      throw new Error(`Expected product 30 in search results with stock 60, found: ${JSON.stringify(item30)}`);
    }
    logSuccess(`MCP search_products('Festival') returned ${searchRes2.data.length} matches. Product 30 stock: ${item30.stock}`);

    // 3c. list_products with pagination
    const listRes = await callMcpTool(baseUrl, 'list_products', { page: 1, limit: 10 });
    if (listRes.isError || !listRes.data?.products || listRes.data.products.length !== 10) {
      throw new Error(`MCP list_products(page:1, limit:10) failed: ${listRes.rawText}`);
    }
    logSuccess(`MCP list_products returned page 1/3 with ${listRes.data.products.length} products (total: ${listRes.data.total})`);

    // ------------------------------------------------------------------------
    // Step 4: Test MCP tool add_to_cart for product 10 (qty: 5) and product 30 (qty: 10)
    // ------------------------------------------------------------------------
    logStep(4, 'Testing MCP tool "add_to_cart" (Product 10 qty: 5, Product 30 qty: 10)');

    // 4a. Add product 10 without session_id (generate session)
    const addRes1 = await callMcpTool(baseUrl, 'add_to_cart', {
      product_id: '10',
      quantity: 5,
    });
    if (addRes1.isError || !addRes1.data?.session_id) {
      throw new Error(`MCP add_to_cart (product 10) failed: ${addRes1.rawText}`);
    }

    const sessionId = addRes1.data.session_id;
    if (typeof sessionId !== 'string' || sessionId.length < 10) {
      throw new Error(`Invalid session_id generated: ${sessionId}`);
    }
    logSuccess(`Session ID successfully generated by server: ${BOLD}${sessionId}${RESET}`);
    logSuccess(`Added 5 units of Product 10. Subtotal: $${addRes1.data.cart?.items[0]?.subtotal_cop} COP`);

    // 4b. Add product 30 with the generated session_id
    const addRes2 = await callMcpTool(baseUrl, 'add_to_cart', {
      session_id: sessionId,
      product_id: '30',
      quantity: 10,
    });
    if (addRes2.isError || addRes2.data?.session_id !== sessionId) {
      throw new Error(`MCP add_to_cart (product 30) session mismatch: ${addRes2.rawText}`);
    }
    logSuccess(`Added 10 units of Product 30 to existing session. Cart item count: ${addRes2.data.cart?.item_count}`);

    // ------------------------------------------------------------------------
    // Step 5: Test MCP tool review_cart. Verify items and subtotals
    // ------------------------------------------------------------------------
    logStep(5, 'Testing MCP tool "review_cart" and verifying items, quantities & subtotals');

    const reviewRes = await callMcpTool(baseUrl, 'review_cart', { session_id: sessionId });
    if (reviewRes.isError || !reviewRes.data?.items) {
      throw new Error(`MCP review_cart failed: ${reviewRes.rawText}`);
    }

    const cart = reviewRes.data;
    if (cart.session_id !== sessionId) throw new Error('Cart session_id mismatch');
    if (cart.status !== 'open') throw new Error(`Expected cart status 'open', got '${cart.status}'`);
    if (cart.item_count !== 15) throw new Error(`Expected item_count 15 (5 + 10), got ${cart.item_count}`);

    const cartItem10 = cart.items.find((i: any) => i.product_id === '10');
    const cartItem30 = cart.items.find((i: any) => i.product_id === '30');

    if (!cartItem10 || cartItem10.quantity !== 5 || cartItem10.unit_price_cop !== 2500 || cartItem10.subtotal_cop !== 12500) {
      throw new Error(`Cart item 10 calculation incorrect: ${JSON.stringify(cartItem10)}`);
    }
    if (!cartItem30 || cartItem30.quantity !== 10 || cartItem30.unit_price_cop !== 1800 || cartItem30.subtotal_cop !== 18000) {
      throw new Error(`Cart item 30 calculation incorrect: ${JSON.stringify(cartItem30)}`);
    }

    const expectedTotal = 12500 + 18000; // 30,500 COP
    if (cart.total_cop !== expectedTotal) {
      throw new Error(`Expected cart total $${expectedTotal} COP, got $${cart.total_cop} COP`);
    }

    logSuccess(`Cart verified: ${cart.items.length} line items, total count: ${cart.item_count}`);
    logInfo(`  - Item 1: ${cartItem10.name} x${cartItem10.quantity} @ $${cartItem10.unit_price_cop} COP = $${cartItem10.subtotal_cop} COP`);
    logInfo(`  - Item 2: ${cartItem30.name} x${cartItem30.quantity} @ $${cartItem30.unit_price_cop} COP = $${cartItem30.subtotal_cop} COP`);
    logSuccess(`Grand Total COP: $${cart.total_cop.toLocaleString('en-US')} COP (${cart.formatted_total})`);

    // ------------------------------------------------------------------------
    // Step 6: Test MCP tool pay with delivery address
    // ------------------------------------------------------------------------
    logStep(6, 'Testing MCP tool "pay" with delivery address and verifying atomic receipt & stock transitions');

    const deliveryAddress = {
      street: 'Carrera 7 # 71-21, Torre A, Apt 801',
      city: 'Bogotá',
      postal_code: '110231',
      recipient_name: 'Ana Milena Gómez',
      phone: '+57 312 456 7890',
      notes: 'Dejar en recepción del edificio',
    };

    const payRes = await callMcpTool(baseUrl, 'pay', {
      session_id: sessionId,
      delivery_address: deliveryAddress,
    });

    if (payRes.isError || !payRes.data?.success) {
      throw new Error(`MCP pay failed: ${payRes.rawText}`);
    }

    const order = payRes.data;
    if (!order.order_id || typeof order.order_id !== 'string') {
      throw new Error('Missing or invalid order_id in payment response');
    }
    if (order.status !== 'paid') {
      throw new Error(`Expected status 'paid', got '${order.status}'`);
    }
    if (order.total_cop !== 30500) {
      throw new Error(`Expected total 30500, got ${order.total_cop}`);
    }

    // Verify previous_stock and remaining_stock for each item
    const orderItem10 = order.items.find((i: any) => i.product_id === '10');
    const orderItem30 = order.items.find((i: any) => i.product_id === '30');

    if (!orderItem10) throw new Error('Order missing item 10');
    if (!orderItem30) throw new Error('Order missing item 30');

    if (orderItem10.previous_stock !== 45 || orderItem10.remaining_stock !== 40) {
      throw new Error(`Product 10 stock delta mismatch! Expected 45 -> 40, got ${orderItem10.previous_stock} -> ${orderItem10.remaining_stock}`);
    }
    if (orderItem30.previous_stock !== 60 || orderItem30.remaining_stock !== 50) {
      throw new Error(`Product 30 stock delta mismatch! Expected 60 -> 50, got ${orderItem30.previous_stock} -> ${orderItem30.remaining_stock}`);
    }

    logSuccess(`Order ID generated: ${BOLD}${order.order_id}${RESET}`);
    logSuccess(`Payment status: ${BOLD}${order.status.toUpperCase()}${RESET}`);
    logSuccess(`Estimated Arrival: ${order.estimated_arrival_formatted}`);
    logSuccess(`Product 10 inventory transition: ${orderItem10.previous_stock} -> ${orderItem10.remaining_stock} (purchased: ${orderItem10.quantity_purchased})`);
    logSuccess(`Product 30 inventory transition: ${orderItem30.previous_stock} -> ${orderItem30.remaining_stock} (purchased: ${orderItem30.quantity_purchased})`);

    // ------------------------------------------------------------------------
    // Step 7: Immediately call MCP list_products and search_products again
    // ------------------------------------------------------------------------
    logStep(7, 'Verifying updated stock via MCP tools (search_products & list_products)');

    const searchAfter10 = await callMcpTool(baseUrl, 'search_products', { query: 'Rizadas Mayonesa' });
    const p10Mcp = searchAfter10.data.find((p: any) => p.id === '10');
    if (!p10Mcp || p10Mcp.stock !== 40) {
      throw new Error(`Expected MCP stock 40 for product 10, got: ${p10Mcp?.stock}`);
    }
    logSuccess(`MCP search_products confirmed Product 10 stock = ${p10Mcp.stock}`);

    const searchAfter30 = await callMcpTool(baseUrl, 'search_products', { query: 'Festival Limón' });
    const p30Mcp = searchAfter30.data.find((p: any) => p.id === '30');
    if (!p30Mcp || p30Mcp.stock !== 50) {
      throw new Error(`Expected MCP stock 50 for product 30, got: ${p30Mcp?.stock}`);
    }
    logSuccess(`MCP search_products confirmed Product 30 stock = ${p30Mcp.stock}`);

    const listAfter = await callMcpTool(baseUrl, 'list_products', { page: 1, limit: 30 });
    const p10List = listAfter.data.products.find((p: any) => p.id === '10');
    const p30List = listAfter.data.products.find((p: any) => p.id === '30');
    if (p10List.stock !== 40 || p30List.stock !== 50) {
      throw new Error(`MCP list_products stock mismatch: P10=${p10List.stock}, P30=${p30List.stock}`);
    }
    logSuccess(`MCP list_products confirmed Product 10 stock = ${p10List.stock}, Product 30 stock = ${p30List.stock}`);

    // ------------------------------------------------------------------------
    // Step 8: Call /api/products (the web API) and verify stock 40 and 50
    // ------------------------------------------------------------------------
    logStep(8, 'Verifying updated stock via Web API (/api/products)');

    // 8a. Query web API with search
    const webSearchRes = await fetch(`${baseUrl}/api/products?q=Rizadas`);
    if (!webSearchRes.ok) throw new Error(`Web API /api/products?q=Rizadas failed: ${webSearchRes.status}`);
    const webSearchData = await webSearchRes.json();
    const p10WebSearch = webSearchData.products.find((p: any) => p.id === '10');
    if (!p10WebSearch || p10WebSearch.current_stock !== 40) {
      throw new Error(`Web API returned incorrect stock for product 10: ${p10WebSearch?.current_stock}`);
    }
    logSuccess(`Web API GET /api/products?q=Rizadas -> Product 10 current_stock = ${p10WebSearch.current_stock}`);

    // 8b. Query web API with list
    const webListRes = await fetch(`${baseUrl}/api/products?limit=50`);
    if (!webListRes.ok) throw new Error(`Web API /api/products failed: ${webListRes.status}`);
    const webListData = await webListRes.json();
    const p10WebList = webListData.products.find((p: any) => p.id === '10');
    const p30WebList = webListData.products.find((p: any) => p.id === '30');

    if (!p10WebList || p10WebList.current_stock !== 40) {
      throw new Error(`Web API list returned incorrect stock for product 10: ${p10WebList?.current_stock}`);
    }
    if (!p30WebList || p30WebList.current_stock !== 50) {
      throw new Error(`Web API list returned incorrect stock for product 30: ${p30WebList?.current_stock}`);
    }
    logSuccess(`Web API GET /api/products -> Product 10 stock = ${p10WebList.current_stock}, Product 30 stock = ${p30WebList.current_stock}`);

    // ------------------------------------------------------------------------
    // Step 9: Attempt to purchase more than available stock (41 units of product 10)
    // ------------------------------------------------------------------------
    logStep(9, 'Testing over-order rejection (attempting 41 units of product 10 when only 40 are in stock)');

    // 9a. MCP add_to_cart rejection
    const overAddRes = await callMcpTool(baseUrl, 'add_to_cart', {
      product_id: '10',
      quantity: 41,
    });

    if (!overAddRes.isError) {
      throw new Error(`Expected MCP add_to_cart to reject quantity 41, but got success: ${JSON.stringify(overAddRes.data)}`);
    }
    logSuccess(`MCP add_to_cart correctly rejected over-order with: "${overAddRes.rawText}"`);

    // Verify stock was NOT modified
    const dbStockAfterReject = (db.prepare('SELECT current_stock FROM inventory WHERE product_id = ?').get('10') as any).current_stock;
    if (dbStockAfterReject !== 40) {
      throw new Error(`Inventory was corrupted by failed add_to_cart! Stock is ${dbStockAfterReject}, expected 40`);
    }
    logSuccess(`Database verified: Product 10 stock remains untouched at ${dbStockAfterReject}`);

    // 9b. Checkout stock rejection (atomic pay protection test)
    logInfo('Testing atomic checkout rejection when inventory drops before payment...');
    // Create a new cart with 40 units (valid right now)
    const legitCartRes = await callMcpTool(baseUrl, 'add_to_cart', {
      product_id: '10',
      quantity: 40,
    });
    const sessionForOverCheckout = legitCartRes.data.session_id;

    // Simulate concurrent stock reduction in DB directly (e.g. another buyer bought 1 unit)
    db.prepare('UPDATE inventory SET current_stock = 39, version = version + 1 WHERE product_id = ?').run('10');

    // Now attempt pay with 40 units when only 39 available
    const overPayRes = await callMcpTool(baseUrl, 'pay', {
      session_id: sessionForOverCheckout,
      delivery_address: deliveryAddress,
    });

    if (!overPayRes.isError) {
      throw new Error(`Expected MCP pay to fail due to insufficient stock, but it succeeded!`);
    }
    logSuccess(`MCP pay correctly rejected checkout with: "${overPayRes.rawText}"`);

    // Restore stock back to 40 for remaining tests
    db.prepare('UPDATE inventory SET current_stock = 40, version = version + 1 WHERE product_id = ?').run('10');

    // ------------------------------------------------------------------------
    // Step 10: Test removing from cart (remove_from_cart) and verifying session integrity
    // ------------------------------------------------------------------------
    logStep(10, 'Testing MCP tool "remove_from_cart" and session integrity');

    // 10a. Create cart with 2 products: 5 units of '11' and 4 units of '14'
    const cartRes1 = await callMcpTool(baseUrl, 'add_to_cart', {
      product_id: '11',
      quantity: 5,
    });
    const testSessionId = cartRes1.data.session_id;

    await callMcpTool(baseUrl, 'add_to_cart', {
      session_id: testSessionId,
      product_id: '14',
      quantity: 4,
    });

    const beforeRemoval = await callMcpTool(baseUrl, 'review_cart', { session_id: testSessionId });
    if (beforeRemoval.data.item_count !== 9 || beforeRemoval.data.items.length !== 2) {
      throw new Error(`Cart setup failed: expected 9 items in 2 lines, got ${beforeRemoval.data.item_count}`);
    }
    logSuccess(`Setup cart with session '${testSessionId}': 5x Product 11 + 4x Product 14 (Total 9 units)`);

    // 10b. Subtract 2 units from Product 11 (5 - 2 = 3)
    const removePartial = await callMcpTool(baseUrl, 'remove_from_cart', {
      session_id: testSessionId,
      product_id: '11',
      quantity: 2,
    });
    if (removePartial.isError) throw new Error(`remove_from_cart partial failed: ${removePartial.rawText}`);

    const item11AfterPartial = removePartial.data.cart.items.find((i: any) => i.product_id === '11');
    if (!item11AfterPartial || item11AfterPartial.quantity !== 3) {
      throw new Error(`Expected 3 units of Product 11 after subtracting 2, got: ${item11AfterPartial?.quantity}`);
    }
    logSuccess(`Decremented Product 11 by 2 units -> ${item11AfterPartial.quantity} remaining in cart`);

    // 10c. Remove Product 11 entirely (omit quantity or pass remaining)
    const removeFull = await callMcpTool(baseUrl, 'remove_from_cart', {
      session_id: testSessionId,
      product_id: '11',
    });
    if (removeFull.isError) throw new Error(`remove_from_cart full failed: ${removeFull.rawText}`);

    const reviewFinal = await callMcpTool(baseUrl, 'review_cart', { session_id: testSessionId });
    if (reviewFinal.data.items.length !== 1 || reviewFinal.data.items[0].product_id !== '14') {
      throw new Error(`Expected only Product 14 to remain in cart, got: ${JSON.stringify(reviewFinal.data.items)}`);
    }
    if (reviewFinal.data.item_count !== 4) {
      throw new Error(`Expected item_count 4, got: ${reviewFinal.data.item_count}`);
    }
    if (reviewFinal.data.session_id !== testSessionId) {
      throw new Error(`Session ID changed unexpectedly! Original: ${testSessionId}, got: ${reviewFinal.data.session_id}`);
    }
    logSuccess(`Removed Product 11 completely. Only Product 14 (4 units) remains.`);
    logSuccess(`Session integrity preserved: Session ID remained identical throughout all operations.`);

    // ------------------------------------------------------------------------
    // Summary
    // ------------------------------------------------------------------------
    console.log(`\n${BOLD}${GREEN}========================================================================${RESET}`);
    console.log(`${BOLD}${GREEN}    ✔ ALL 10 E2E MCP & INVENTORY VERIFICATION TESTS PASSED 100%!        ${RESET}`);
    console.log(`${BOLD}${GREEN}========================================================================${RESET}\n`);

  } finally {
    await close();
  }
}

runVerification().catch((err) => {
  console.error(`\n${BOLD}${RED}Verification test failed:${RESET}`, err);
  process.exit(1);
});
