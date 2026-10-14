import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { captureRawBody } from './middleware/rawBody.js';
import apiRoutes from './routes/api.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Shopify-Hmac-Sha256', 'X-Shopify-Topic', 'X-Shopify-Shop-Domain', 'X-WC-Webhook-Signature', 'X-WC-Webhook-Topic'],
}));

// Express json with raw body capture for HMAC verification
app.use(express.json({
  verify: captureRawBody,
  limit: '10mb',
}));

app.use(express.urlencoded({ extended: true, verify: captureRawBody }));

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount API routes
app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 E-Commerce Sync Server running on port ${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log(`===============================================`);
});

export default app;
