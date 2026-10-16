import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { captureRawBody } from './middleware/rawBody.js';
import apiRoutes from './routes/api.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configurable CORS origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server requests without Origin header (e.g. webhooks, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: origin ${origin} is not permitted.`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'x-api-key',
    'X-Shopify-Hmac-Sha256',
    'X-Shopify-Topic',
    'X-Shopify-Shop-Domain',
    'X-WC-Webhook-Signature',
    'X-WC-Webhook-Topic',
  ],
}));

// Express json with raw body capture for HMAC verification
app.use(express.json({
  verify: captureRawBody,
  limit: '10mb',
}));

app.use(express.urlencoded({ extended: true, verify: captureRawBody }));

// Healthcheck (public)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount API routes
app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 E-Commerce Sync Server running on port ${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log(`🛡️  CORS Allowed Origins: ${allowedOrigins.join(', ')}`);
  console.log(`===============================================`);
});

export default app;
