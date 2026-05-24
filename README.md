# Allo Earth — Multi-Warehouse Inventory Reservation & Fulfillment

A high-performance, medical-tech inventory management and order reservation platform built on **Next.js (App Router)**, **Prisma**, **PostgreSQL**, and **Tailwind CSS**. 

This application implements **concurrency-safe stock holds (race-condition free)** and multi-location logistics tracking modeled after enterprise ERP solutions like Oracle NetSuite, with full tracking and fulfillment lifecycle capabilities.

---

## 🚀 What Was Done (Completed Features)

### 1. Concurrency-Safe Stock Holds (Race-Condition Free)
- **Problem solved:** When multiple shoppers check out concurrent orders for the last remaining unit of a medical product, standard database check-then-write steps result in double-allocation (over-selling).
- **Solution:** Checkout holds are acquired inside a PostgreSQL transaction using an explicit row-level write lock (`SELECT ... FOR UPDATE` via Prisma raw query). This serializes checkout threads for the same product and warehouse, ensuring zero race conditions under heavy load.

### 2. Adaptive Hold Durations
- **System Logic:** Hold reservation timers scale dynamically based on the stock pressure of the target warehouse:
  - **High Stock (Available >= 20 units):** Generates a relaxed **15-minute hold** to encourage shopping cart retention.
  - **Medium Stock (Available 6-19 units):** Generates a standard **7-minute hold**.
  - **Low Stock (Available <= 5 units):** Generates a fast-paced **3-minute hold** to quickly release clinical stock back into the pool if abandoned.

### 3. Role-Based Authentication & Guard Middleware
- Secure authentication system using custom **JWT cookies** (no external database session table overhead).
- **Two roles:** `USER` (normal shoppers) and `ADMIN` (logistics staff).
- Protected App Router pages and `/api/admin/*` API endpoints.

### 4. Admin Dashboard Console (NetSuite Styling)
- **KPI Metrics:** Real-time summary of Total Physical Stock, Active Locked Holds, Est. Inventory Value (calculated dynamically), and checkout conversion rates.
- **Supply Chain Adjustments & Transfers:** Direct controls to manually increment/decrement stock at specific hubs or execute inter-warehouse transfers (e.g., shipping units from NA Hub to APAC Hub).
- **10x Concurrency Simulator:** A built-in browser load test. It adjusts product stock to exactly `1`, fires 10 parallel reservation requests simultaneously, and displays terminal logs proving that exactly 1 request succeeds (201) and 9 are blocked with Conflict (409).

### 5. Fulfillment & Global Shipping Queue
- **Fulfillment Panel (`/admin/shipping`):** A dedicated console page for administrators to manage paid orders. Clicking **Pack & Ship** opens a packing validation modal, auto-generates shipping numbers, and shifts order status to `SHIPPED`.
- **Live Logistics Monitor (`/orders`):** A public storefront-style tracking page for customers. It displays active orders, origin warehouse hubs, dispatch status (Awaiting Ship vs. Shipped), carrier tracking IDs, and a live logistical log stream.
- **HIPAA/GDPR Compliance:** Customer names, emails, and delivery coordinates are strictly omitted/anonymized in the public view to adhere to global health privacy standards.

### 6. Local Device Image Uploads
- A dedicated image upload handler (`/api/admin/upload`) that allows administrators to upload product photos directly from their local device. Images are saved locally into a custom directory and resolved instantly on the storefront.

---

## 🧠 Why We Built It This Way (Architectural Decisions)

1. **Pessimistic Row-Level Locks (`SELECT FOR UPDATE`):**
   - *Why:* Optimistic locking (using version fields) works well in low-contention systems, but under extreme high-contention flash sales, it forces users to fail repeatedly and retry checkout. Pessimistic locks serialize checkout attempts at the database tier, ensuring the first checkout request successfully reserves the item while subsequent ones receive a clean, immediate "out of stock" response.
2. **Double Expiry Sweep Strategy:**
   - *Why:* Running standard cron-only background sweeps can result in temporary inventory lock-ups if the cron server goes down. We combined a **Write-Time/Read-Time Lazy Sweep** (clearing expired reservations whenever user traffic hits the page) with a **Production Background Cron** (`/api/cron/release-expired`) to guarantee real-time inventory accuracy under any scenario.
3. **Anonymized REST Streams for Public Tracking:**
   - *Why:* Medical products are subject to strict privacy regulations. Exposing customer emails or names on a public tracking screen is illegal under HIPAA. The `/api/orders` endpoint selectively returns only SKU, warehouse regions, status, and truncated order hashes, keeping the frontend interactive while maintaining privacy.

---

## 🛠️ Setup & Local Running

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **Hosted PostgreSQL** connection string (Neon, Supabase, etc.)

### 2. Configure Variables (`.env`)
Create a `.env` file in the project root:
```bash
DATABASE_URL="postgresql://username:password@hostname:5432/dbname?sslmode=require"
JWT_SECRET="allo_health_super_secret_session_jwt_key_12345!"
CRON_SECRET="allo_health_cron_secret_token_12345!"
```

### 3. Database Sync & Seed
```bash
# Push database models and enums (creates tables and SHIPPED status)
npx prisma db push

# Generate Prisma Client
npx prisma generate

# Seed initial medical-grade products, regional hubs, and accounts
npm run db:seed
```

### 4. Dev Server
```bash
npm run dev
```

#### Seeded Accounts
- **User:** `user@allo.earth` / `user123`
- **Admin:** `admin@allo.earth` / `admin123`

---

## 📋 What Needs to Be Done (Future Scaling & Checklist)

To transition this application from a prototype to a production-ready global enterprise system, the following features should be implemented:

- [ ] **Redis-Backed Distributed Locks (`Redlock`):**
  - *Why:* In a globally distributed cluster with read-replicas, locking at the PostgreSQL level introduces performance bottlenecks. Running Redis (e.g. Upstash) in front of the database allows memory-based distributed locks, handling hundreds of thousands of requests per second with sub-millisecond latencies.
- [ ] **Event-Driven Audit Logging (Kafka / SQS):**
  - *Why:* Currently, audit logs are written synchronously in the same transaction block as checkout, adding database overhead. Offloading audit logs to a message queue ensures asynchronous ingestion and processing.
- [ ] **Interactive Map Visualizer:**
  - *Why:* Render a global canvas map (using Mapbox/Leaflet) displaying live shipping nodes, highlighting real-time routing paths from regional warehouses (NA, EU, APAC) to anonymous shipping destinations.
- [ ] **Multi-Tenant Hub Controls:**
  - *Why:* Implement fine-grained RBAC so warehouse administrators can only see, adjust, and fulfill shipments belonging to their assigned regional hub (e.g., EU managers cannot dispatch NA orders).
- [ ] **Playwright E2E Concurrency Testing Suite:**
  - *Why:* Programmatic assertions using real browser sessions to simulate parallel checkout flows and verify hold-expiry timer state cleanups.

---

## 🌐 Production Hosting Guide

### 1. Deploy Frontend on Vercel
1. Push your repository to **GitHub / GitLab**.
2. Log into the [Vercel Dashboard](https://vercel.com/) and click **Add New Project**.
3. Import your repository.
4. Add the following **Environment Variables** in Vercel settings:
   - `DATABASE_URL` (Your production Neon/Supabase PostgreSQL string)
   - `JWT_SECRET` (A secure random string)
   - `CRON_SECRET` (A secure random string)
5. Click **Deploy**. Vercel will automatically build the Next.js production bundle.

### 2. Configure Production Database (Neon Postgres)
Ensure that you run database schema migrations against your live production database:
```bash
DATABASE_URL="your-production-database-url" npx prisma db push
```

### 3. Setup Recurring Cleanup Job (Vercel Cron)
To automate the release of expired stock holds in production:
1. In your project, configure a `vercel.json` file to ping the cron endpoint:
   ```json
   {
     "crons": [{
       "path": "/api/cron/release-expired",
       "schedule": "*/1 * * * *"
     }]
   }
   ```
2. Set up the authorization header mapping using Vercel system cron variables to verify the request originates securely.
