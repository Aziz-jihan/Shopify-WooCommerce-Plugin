import { Router } from 'express';
import { BridgeController } from '../controllers/bridge.controller.js';

const router = Router();

// ==========================================
// STATELESS AUTOMATE BRIDGE ROUTES (ZERO DB)
// ==========================================

// Connection Testers
router.all('/bridge/automate/test-connection', BridgeController.testAutoMateConnection);
router.post('/bridge/woocommerce/test-connection', BridgeController.testWooCommerceConnection);
router.post('/bridge/shopify/test-connection', BridgeController.testShopifyConnection);

// Instant Pass-Through Webhooks (Store -> AutoMate directly)
router.post('/bridge/webhook/order', BridgeController.handleOrderWebhook);
router.post('/bridge/webhook/product', BridgeController.handleProductWebhook);

// Batch Stream Sync (Store -> AutoMate directly with rate-limit pacing)
router.post('/bridge/sync/products', BridgeController.syncProductsStream);
router.post('/bridge/sync/orders', BridgeController.syncOrdersStream);

export default router;
