# Mami Market — Mercado Libre-Style Store & MCP Server

A high-performance marketplace web application inspired by Mercado Libre with read-only browsing and an express purchase flow, exposing both a modern Web UI and an **MCP (Model Context Protocol) server** powered by the same SQLite database and business logic layer.

---

## 1. Architecture Overview

```
                          ┌──────────────────────────┐
                          │   Next.js Web Frontend   │
                          │   (React 19, Tailwind,   │
                          │    shadcn/ui, App Rtr)   │
                          └─────────────┬────────────┘
                                        │  fetch()
                                        ▼
 ┌──────────────────────┐        ┌──────────────────────────┐
 │    MCP Clients       │        │  Next.js Route Handlers  │
 │ (Cursor, Claude,     │───────►│      app/api/...         │
 │  Opencode, Stdio/SSE)│        └─────────────┬────────────┘
 └──────────────────────┘                      │
            │                                  │
            ▼                                  ▼
 ┌──────────────────────────────────────────────────────────┐
 │               Shared Service Layer (lib/)                │
 │  • products.ts        • cart.ts          • checkout.ts   │
 │  • estimated-arrival  • server.ts (MCP)  • db.ts         │
 └──────────────────────────────┬───────────────────────────┘
                                │  Atomic Transactions (IMMEDIATE)
                                ▼
 ┌──────────────────────────────────────────────────────────┐
 │            Local SQLite Database (data/app.db)           │
 │  • products           • inventory        • carts         │
 │  • cart_items         • orders           • order_items   │
 └──────────────────────────────────────────────────────────┘
```

- **Logic Only in `/api/` & Shared Services:** All business rules (stock validation, cart management, atomic checkout, arrival estimation) reside strictly in `lib/services/` and are called by `app/api/...` Route Handlers and MCP tools.
- **Single Source of Truth:** The web frontend and MCP server operate against the exact same SQLite database (`data/app.db`) in WAL mode with concurrency protection.
- **Language Requirement:** 100% of user-facing strings (UI copy, tool descriptions, error messages, seed item descriptions, receipt labels) are in **English only**.

---

## 2. Technology Stack

- **Frontend & Backend:** Next.js (App Router) + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui.
- **Database:** Local SQLite database via `better-sqlite3` with WAL mode (`PRAGMA journal_mode = WAL`), foreign keys enabled, and immediate transaction locking.
- **MCP Server:** `@modelcontextprotocol/sdk` supporting both Stdio CLI transport (`scripts/mcp-server.ts`) and Streamable HTTP endpoint (`/api/mcp`).
- **Concurrency & Locking:** SQLite `IMMEDIATE` transaction isolation combined with optimistic row versioning in `inventory`.

---

## 3. Database Schema & Automatic Reset Behavior

The database file is stored locally at `data/app.db` (ignored in `.gitignore`).

### Schema Tables:
1. `products`: `id`, `sku`, `name`, `description`, `properties`, `price`, `category`, `image_url`, `created_at`
2. `inventory`: `product_id` (FK), `current_stock`, `version`
3. `carts`: `id`, `session_id` (unique server-generated capability token), `status` (`open`, `checked_out`, `abandoned`), `created_at`, `updated_at`
4. `cart_items`: `id`, `cart_id` (FK), `product_id` (FK), `quantity`, `frozen_unit_price`
5. `orders`: `id`, `cart_id` (FK), `total`, `status` (`pending`, `paid`, `failed`), `delivery_address`, `estimated_arrival_at`, `created_at`
6. `order_items`: `id`, `order_id` (FK), `product_id` (FK), `quantity`, `unit_price`

### Reset & Seed on Startup:
The database resets and seeds all 22 required products before development and build steps via the npm `seed` script (hooked into `predev` and `prebuild`):

```bash
# Manually reset and seed the database
pnpm seed
```

---

## 4. Product Catalog (22 Seeded Items)

| Code / SKU | Product Name | Properties | Price (COP) | Category | Initial Stock |
|---|---|---|---|---|---|
| 10 | Yupi Rizadas Mayonesa | 105 g | $2,500 COP | Snacks & Chips | 45 |
| 11 | Yupi Rizadas Limón | 105 g | $2,500 COP | Snacks & Chips | 35 |
| 14 | Yupi Tocinetas / El Golpe | 45 g | $2,000 COP | Snacks & Chips | 50 |
| 20 | Las Caseritas Rosquitas | ~16 g/unit | $2,200 COP | Bakery & Snacks | 40 |
| 23 | Bimbo Chocoso | 65 g | $2,300 COP | Bakery & Cakes | 30 |
| 30 | Festival Limón | 403 g | $1,800 COP | Cookies & Biscuits | 60 |
| 31 | Festival Chocolate | 403 g | $1,800 COP | Cookies & Biscuits | 55 |
| 32 | Festival Vainilla | 403 g | $1,800 COP | Cookies & Biscuits | 50 |
| 34 | Tosh Crackers Fusión de Cereales | 25.5–229 g | $1,750 COP | Cookies & Biscuits | 40 |
| 36 | Jumbo Chocolate con Maní | 40 g | $2,000 COP | Confectionery & Chocolates | 75 |
| 38 | Gol Mega | 53 g | $2,200 COP | Confectionery & Chocolates | 45 |
| 40 | Alpin Chocolate | 200 ml | $2,800 COP | Dairy & Beverages | 35 |
| 42 | Alpina Avena Original | 280 g | $2,700 COP | Dairy & Beverages | 30 |
| 43 | Alquería Avena Pro Auténtica | 220 ml | $3,200 COP | Dairy & Beverages | 25 |
| 47 | Ducales | 403 g | $1,700 COP | Cookies & Biscuits | 65 |
| 51 | Coca-Cola Zero | 600 ml | $3,200 COP | Beverages & Sodas | 50 |
| 52 | Coca-Cola Original | 400 ml | $3,200 COP | Beverages & Sodas | 60 |
| 55 | Brisa Lima-Limón | 400/600 ml | $2,800 COP | Beverages & Waters | 40 |
| 56 | Brisa Manzana | 400/600 ml | $2,800 COP | Beverages & Waters | 40 |
| 57 | Postobón Manzana | 400 ml | $2,950 COP | Beverages & Sodas | 45 |
| 66 | Hit Mora | 500 ml | $3,250 COP | Beverages & Juices | 35 |
| 69 | Mr. Tea Limón Menta | 500 ml | $2,800 COP | Beverages & Teas | 30 |

---

## 5. Session ID & Estimated Delivery Calculation

### 5.1 Session ID Mechanism (Spec 2026-07-28 Compliant)
- Protocol-level `Mcp-Session-Id` headers were removed from the MCP specification (2026-07-28).
- The `session_id` is an **opaque application-level capability token**, generated server-side with `crypto.randomUUID()`.
- **Web:** Managed via secure `httpOnly` cookie (`mami_session_id`) set by `/api/cart`.
- **MCP:** Returned in the output of `add_to_cart` and reused as a parameter in `remove_from_cart`, `review_cart`, and `pay`.
- **Immutability:** Clients cannot choose or forge session IDs. An invalid or checked-out session returns a clear error.

### 5.2 Estimated Arrival Calculation
Calculated as a random moment within the next 4 hours from purchase time:
$$\text{estimated\_arrival\_at} = \text{now} + \text{random}(15\text{min}, 4\text{h})$$
Implemented in `lib/services/estimated-arrival.ts` and shared across `/api/checkout` and MCP `pay`.

---

## 6. MCP Server Tools (6 Tools)

All tools share the same service layer and return responses in English:

1. **`list_products`**
   - Input: `{ page?: number, limit?: number, category?: string }`
   - Output: Paginated catalog items with stock and formatted prices.
2. **`search_products`**
   - Input: `{ query: string, category?: string, limit?: number }`
   - Output: Matching products ranked by relevance.
3. **`add_to_cart`**
   - Input: `{ session_id?: string, product_id: string, quantity: number }`
   - Output: Updated cart details and `session_id`. If `session_id` is omitted, auto-generates a new one.
4. **`remove_from_cart`**
   - Input: `{ session_id: string, product_id: string, quantity?: number }`
   - Output: Updated cart state after item removal or quantity reduction.
5. **`review_cart`**
   - Input: `{ session_id: string }`
   - Output: Cart items breakdown, quantities, subtotals, and total in COP.
6. **`pay`**
   - Input: `{ session_id: string, delivery_address: string | object }`
   - Output: Order receipt with order ID, total, items, and calculated arrival time.

---

## 7. Race Condition Prevention

Checkout execution uses SQLite `IMMEDIATE` transaction locking (`db.transaction(...).immediate()`) and optimistic row version checks (`version = version + 1 WHERE product_id = ? AND version = ? AND current_stock >= ?`).

Simultaneous attempts to buy the last unit in stock result in:
- Exactly **one** purchase succeeding.
- The other purchase failing gracefully with an `"Insufficient stock"` error.
- Final inventory remaining strictly non-negative ($0$).

---

## 8. Getting Started & Running Tests

### Install Dependencies:
```bash
pnpm install
```

### Run the Web Application:
```bash
pnpm dev
# Open http://localhost:3000
```

### Build for Production:
```bash
pnpm build
```

### Run Standalone MCP Server (Stdio):
```bash
pnpm mcp
```

### Run Automated MCP Tools Verification:
```bash
pnpm test:mcp
```

### Run Automated Concurrency / Race Condition Test:
```bash
pnpm test:race
```

---

## 9. MCP Client Configuration (e.g., Claude Desktop or Cursor)

```json
{
  "mcpServers": {
    "mami-store": {
      "command": "npx",
      "args": ["tsx", "scripts/mcp-server.ts"],
      "cwd": "/path/to/apps/mami"
    }
  }
}
```
