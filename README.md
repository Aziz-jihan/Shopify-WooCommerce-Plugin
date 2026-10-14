# Shopify & WooCommerce PostgreSQL Data Sync Engine

A production-ready custom integration service built with **TypeScript**, **React**, **Express.js**, and **PostgreSQL (via Prisma ORM)**. It connects to **Shopify** and **WooCommerce**, performs a historical initial sync of **Customers**, **Orders**, and **Products**, and registers HMAC-verified **webhooks** for real-time synchronization.

---

## 🏗 Architecture Overview

```text
Shopify / WooCommerce
       │
       │ Webhooks (HMAC-SHA256 verified)
       ▼
 Express.js API (/api/webhooks/:platform/:storeId)
       │
       ├─► 1. Verify HMAC Signature
       ├─► 2. Acknowledge HTTP 200 OK (< 50ms)
       ├─► 3. Log into webhook_events
       └─► 4. In-Memory Worker:
               Fetch Canonical Resource via Adapter API
               ▼
          PostgreSQL Database (Prisma Upsert)
          ├── stores
          ├── customers
          ├── orders
          ├── products
          └── webhook_events
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **PostgreSQL**: A running instance (local or hosted, e.g., Supabase, Neon, Railway, Docker).

### 2. Configure Database & Environment
Navigate to `server/` and update `.env`:
```bash
cd server
copy .env.example .env
```

Edit `server/.env`:
```env
PORT=5000
DATABASE_URL="postgresql://postgres:password@localhost:5432/ecommerce_sync?schema=public"
APP_BASE_URL="http://localhost:5000"
```
*(If testing webhooks locally with Shopify or WooCommerce, set `APP_BASE_URL` to your public ngrok or cloudflared tunnel URL, e.g., `https://xyz.ngrok-free.app`)*.

### 3. Initialize Database Schema
Generate Prisma client and push schema into your PostgreSQL database:
```bash
cd server
npm run prisma:generate
npm run prisma:push
```

### 4. Run Server & Client
In terminal 1 (Server):
```bash
cd server
npm run dev
# Running on http://localhost:5000
```

In terminal 2 (Client):
```bash
cd client
npm install
npm run dev
# Running on http://localhost:3000
```

---

## 🔑 How to Connect Platforms

### Connecting Shopify
1. In your Shopify Admin: Go to **Settings > Apps and sales channels > Develop apps**.
2. Click **Create an app** (e.g. "Customer Data Sync").
3. Under **Configuration > Admin API integration**, grant:
   - `read_customers`
   - `read_orders`
   - `read_products`
4. Click **Install app** and reveal the **Admin API access token** (starts with `shpat_...`).
5. In the UI, click **Connect Store**, select **Shopify**, enter your domain (`your-store.myshopify.com`), and paste your access token.

### Connecting WooCommerce
1. In your WordPress Admin: Go to **WooCommerce > Settings > Advanced > REST API**.
2. Click **Add Key**:
   - Description: "Data Sync Plugin"
   - Permissions: **Read/Write**
3. Copy the generated **Consumer Key** (`ck_...`) and **Consumer Secret** (`cs_...`).
4. In the UI, click **Connect Store**, select **WooCommerce**, enter your store URL, and paste the keys.

---

## 📡 Webhook Integration & Testing

When a store is connected:
1. The server automatically registers webhook subscriptions on the store using its API:
   - **Shopify**: `CUSTOMERS_CREATE`, `CUSTOMERS_UPDATE`, `ORDERS_CREATE`, `ORDERS_UPDATED`, `PRODUCTS_CREATE`, `PRODUCTS_UPDATE`
   - **WooCommerce**: `customer.created`, `customer.updated`, `order.created`, `order.updated`, `product.created`, `product.updated`
2. When an event fires, the webhook controller verifies the cryptographic HMAC signature (`X-Shopify-Hmac-Sha256` or `X-WC-Webhook-Signature`).
3. To prevent timeout errors (Shopify requires response in under 5 seconds), the endpoint immediately acknowledges `200 OK` and delegates retrieval to an asynchronous worker.
4. The worker fetches the canonical, full record from the platform API and upserts into PostgreSQL.

---

## 📂 Project Structure

```text
├── server/
│   ├── prisma/
│   │   └── schema.prisma           # Multi-tenant PostgreSQL Schema
│   ├── src/
│   │   ├── adapters/
│   │   │   ├── types.ts            # ECommerceAdapter interface & unified models
│   │   │   ├── shopify.adapter.ts  # Shopify GraphQL Admin API Client & HMAC
│   │   │   ├── woocommerce.adapter.ts # WooCommerce REST v3 Client & HMAC
│   │   │   └── adapter.factory.ts  # Instantiates adapter per store
│   │   ├── controllers/
│   │   │   ├── store.controller.ts # Connect, list, view data, trigger sync
│   │   │   └── webhook.controller.ts # Validates HMAC, acknowledges 200 OK
│   │   ├── services/
│   │   │   ├── sync.service.ts     # Historical batch paginated sync
│   │   │   └── webhook.service.ts  # In-memory queue & re-fetch worker
│   │   ├── middleware/
│   │   │   └── rawBody.ts          # Preserves raw body buffer for HMAC checks
│   │   ├── routes/
│   │   │   └── api.routes.ts       # Express router definitions
│   │   ├── db.ts                   # Prisma client singleton
│   │   └── index.ts                # Express app entrypoint
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ConnectStoreModal.tsx # Onboarding wizard with help tips
│   │   │   ├── CustomersTable.tsx    # Customer table with search & totals
│   │   │   ├── OrdersTable.tsx       # Order details & items
│   │   │   ├── ProductsTable.tsx     # Product catalog & pricing
│   │   │   ├── WebhookLogs.tsx       # Live real-time webhook event stream
│   │   │   └── StoreDetail.tsx       # Store overview & sync trigger
│   │   ├── App.tsx                   # Main dashboard view
│   │   ├── api.ts                    # Typed API client
│   │   └── index.css                 # Tailwind styles
│   └── package.json
```
