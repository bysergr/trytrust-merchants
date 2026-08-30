# Logistics & Mobility Platform + MCP Server

A unified logistics and mobility web platform and Model Context Protocol (MCP) server built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, **shadcn/ui**, and **better-sqlite3**.

Offers three core service lines under one cohesive brand:
1. **Passenger Rides** (City Economy, Comfort Plus, XL, VIP) — On-demand ride-hailing with live driver matching.
2. **Package Delivery** (Express Envíos) — Same-day door-to-door courier dispatch via motorcycle and van.
3. **Freight & Cargo** (Logistics Carga) — Heavy freight moves with cargo vans, 16ft box trucks, and flatbeds.

All three services share the exact same database and business logic layer, consumable interchangeably via the modern **Logistics Web UI** or via the **8 MCP Tools** (Stdio / HTTP SSE).

---

## 1. Stack & Architecture

- **Framework:** Next.js 16 App Router (Node.js runtime)
- **Styling & UI:** Tailwind CSS v4, tw-animate-css, Lucide icons, responsive map-centric design
- **Database:** SQLite via `better-sqlite3` with dynamic serverless storage and automatic seed-on-empty
- **MCP Server:** `@modelcontextprotocol/sdk` + `mcp-handler` (Stdio transport + HTTP `/api/mcp` endpoint)
- **Validation:** Zod schemas for all tool inputs and API payloads
- **Language:** English only throughout UI, API, MCP tools, errors, and admin portal

---

## 2. Vercel & Serverless SQLite Implementation

Deploying SQLite to serverless environments (Vercel, AWS Lambda) requires two critical architectural rules:

### A. Dynamic Database Path (`lib/db.ts`)
* **Problem:** Vercel functions run in read-only sandboxes. Attempting to write to `data/app.db` or root directories throws `EROFS: read-only file system` or `unable to open database file`.
* **Solution:** `lib/db.ts` detects serverless environments (`process.env.VERCEL`, `process.env.AWS_LAMBDA_FUNCTION_NAME`, `process.env.LAMBDA_TASK_ROOT`). In serverless, it redirects the database path to `/tmp/logistics-app.db` (the only writable directory in Lambda containers). In local development, it preserves `data/app.db`.
* **Auto-Seed on Cold Start (`autoSeedIfEmpty`):** Because `/tmp` is wiped between cold starts, `lib/db.ts` checks on every database connection whether the database is empty; if so, it immediately runs schema creation (`initSchema`) and populates vehicle types and inventory pools (`seedDatabase`), ensuring zero downtime or manual steps.

### B. Native Binary Handling (`next.config.ts`)
* **Problem:** Bundlers (Turbopack / Webpack) attempting to trace and bundle native C++ binaries (`better-sqlite3.node`) corrupt module resolution in serverless environments.
* **Solution:** `next.config.ts` declares:
  ```ts
  const nextConfig: NextConfig = {
    serverExternalPackages: ['better-sqlite3'],
    images: {
      remotePatterns: [
        { protocol: 'https', hostname: 'commons.wikimedia.org' },
        { protocol: 'https', hostname: 'upload.wikimedia.org' },
      ],
    },
  };
  ```
  This ensures Next.js treats `better-sqlite3` as an external runtime dependency and loads the prebuilt native binary properly.

---

## 3. Data Model & Concurrency Control

### Core Tables
* `vehicle_types`: Catalog of vehicles per service (`ride`, `package`, `freight`), base fares, per-km rates, weight/passenger limits, and Wikimedia Commons vehicle photos.
* `available_vehicles`: Inventory pool tracking `count_available` and `version` per vehicle type.
* `service_requests`: Immutable request records with server-generated `session_id`, coordinates, status, upfront pricing, ETA, and assigned driver details.

### Atomic Matching & Race Condition Mitigation (Section 8)
* The shared resource is `available_vehicles.count_available`.
* Every match operation (`request_ride`, `request_package_delivery`, `request_freight`) executes within an atomic database transaction using **optimistic concurrency control (`version` column)**:
  ```sql
  UPDATE available_vehicles 
  SET count_available = count_available - 1, version = version + 1 
  WHERE vehicle_type_id = ? AND version = ? AND count_available > 0;
  ```
  If `changes === 0` (due to stock depletion or concurrent contention), the request fails gracefully with a descriptive error.
* `cancel_request` atomically increments `count_available` back into the pool.

---

## 4. MCP Server — 8 Available Tools

All tools share the same service layer under `lib/services/` and are accessible via Stdio or HTTP `/api/mcp`:

1. **`list_vehicle_types`** — `{ service: "ride" | "package" | "freight" }`  
   Lists available vehicle types with base fares, per-km rates, capacities, and stock.
2. **`get_quote`** — `{ service, vehicle_type_id, pickup_address, dropoff_address, scheduled_at? }`  
   Calculates upfront fare estimate, distance in km, and duration ETA without creating an order.
3. **`request_ride`** — `{ session_id?, vehicle_type_id, pickup_address, dropoff_address, scheduled_at? }`  
   Matches a ride, locks vehicle inventory, assigns a driver, and returns tracking info.
4. **`request_package_delivery`** — `{ session_id?, vehicle_type_id, pickup_address, dropoff_address, package_description, package_weight_kg, scheduled_at? }`  
   Dispatches a motorcycle or van courier for parcel delivery.
5. **`request_freight`** — `{ session_id?, vehicle_type_id, pickup_address, dropoff_address, cargo_description, cargo_weight_kg, scheduled_at? }`  
   Dispatches a commercial freight van, box truck, or heavy semi flatbed.
6. **`track_request`** — `{ session_id, request_id }`  
   Returns live trip status (`matched`, `en_route`, `completed`), driver info, and ETA.
7. **`cancel_request`** — `{ session_id, request_id }`  
   Cancels an active request and atomically restores the vehicle to the fleet pool.
8. **`pay`** — `{ session_id, request_id, payment_confirmation? }`  
   Finalizes payment for a request and generates a transaction receipt.

---

## 5. Unauthenticated `/admin` Route (Prototype Only)

Per project requirements, the `/admin` route is built **without authentication** for rapid demonstration.
* Features a single clean table of all `service_requests`.
* Allows inline editing of **`price`** and **`scheduled_at`** fields.
* Saving calls `PATCH /api/admin/requests/:id` to persist changes via the shared service layer.
* Prominently displays a warning banner noting this is a prototype-only decision.

---

## 6. Development & Testing Commands

### Setup & Seed
```bash
# Install dependencies
pnpm install

# Seed local database (8 vehicle types, inventory pool, initial requests)
pnpm seed
```

### Run Web Application
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) for the Logistics Web App or [http://localhost:3000/admin](http://localhost:3000/admin) for the Admin table.

### Run MCP Server (Stdio)
```bash
pnpm mcp
```

### Run Verification Test Suite
```bash
# Test all 8 MCP tools end-to-end
pnpm test:mcp

# Test MCP HTTP/SSE route handlers
pnpm test:route

# Test race condition concurrency mitigation
pnpm test:race

# Test API service layer integration
pnpm test:api
```

### Production Build & Linting
```bash
pnpm lint
pnpm build
```
