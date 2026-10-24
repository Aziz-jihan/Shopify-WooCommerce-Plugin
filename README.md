# Shopify & WooCommerce AutoMate Bridge Plugin

A lightweight, **zero-database, stateless integration service** built with **TypeScript**, **React**, and **Express.js**. It connects directly to **Shopify** and **WooCommerce**, streaming orders and product catalogs directly to **AutoMate** via the official AutoMate Website Store Plugin API contract without storing or persisting any records locally.

---

## 🏗 Architecture Overview

```text
Shopify / WooCommerce (Store)
       │
       │ Webhooks (Live order/product events) or Batch Sync
       ▼
 Express.js Stateless Bridge API
       │
       ├─► 1. Parse & validate event
       ├─► 2. In-memory schema transform (AutoMate contract)
       │       - Phone number normalization (BD 01XXXXXXXXX)
       │       - HTML sanitization from descriptions
       │       - Deduplication-safe order_id attachment
       │       - 500ms request pacing for catalog streams (max 2 req/sec)
       ▼
 AutoMate Store API (Server-to-Server, Bearer Token Auth)
       ├── POST /create-web-order
       ├── POST /sync-products
       └── GET/POST /test-connection
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v20/v22/v24)
- **Zero Database Requirement**: No PostgreSQL, MySQL, or SQLite required.

### 2. Configure Environment
Navigate to `server/`:
```bash
cd server
copy .env.example .env
```

`server/.env`:
```env
PORT=5000
ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
AUTOMATE_BASE_URL="https://api.example.com/v1/store"
AUTOMATE_TOKEN="your_43_character_automate_token"
```

### 3. Install & Run
```bash
# Install dependencies
npm run install:all

# Run development servers
# Terminal 1:
npm run dev:server

# Terminal 2:
npm run dev:client
```

Dashboard runs on `http://localhost:3000` and API runs on `http://localhost:5000`.

---

## 📡 AutoMate Webhook Endpoints

Configure these webhook URLs in your WooCommerce or Shopify store admin:

- **Order Webhook**: `https://<your-server-domain>/api/bridge/webhook/order`
- **Product Webhook**: `https://<your-server-domain>/api/bridge/webhook/product`

---

## 📂 Project Structure

```text
├── server/
│   ├── src/
│   │   ├── adapters/
│   │   │   ├── types.ts                # ECommerceAdapter interface & unified models
│   │   │   ├── shopify.adapter.ts      # Shopify GraphQL Admin API Client
│   │   │   ├── woocommerce.adapter.ts  # WooCommerce REST v3 Client
│   │   │   └── adapter.factory.ts      # Adapter instantiation
│   │   ├── controllers/
│   │   │   └── bridge.controller.ts    # In-memory pass-through bridge & stream handlers
│   │   ├── services/
│   │   │   ├── automate.client.ts      # Typed client for AutoMate endpoints
│   │   │   └── automate.transformer.ts # In-memory transformers & normalizers
│   │   ├── routes/
│   │   │   └── api.routes.ts           # Stateless bridge routes
│   │   └── index.ts                    # Express app entrypoint
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── App.tsx                     # Stateless Bridge Dashboard UI
│   │   ├── api.ts                      # Client API caller
│   │   └── index.css                   # Tailwind styles
│   └── package.json
```
