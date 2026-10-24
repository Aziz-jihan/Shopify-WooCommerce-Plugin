import { Router } from 'express';
import { StoreController } from '../controllers/store.controller.js';
import { WebhookController } from '../controllers/webhook.controller.js';
import { BridgeController } from '../controllers/bridge.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ==========================================
// 1. STATELESS AUTOMATE BRIDGE ROUTES (ZERO DB)
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

// ==========================================
// 2. LEGACY / DB-BACKED ROUTES (Optional)
// ==========================================
router.post('/stores/connect', requireAuth, StoreController.connect);
router.get('/stores', requireAuth, StoreController.list);
router.get('/stores/:id', requireAuth, StoreController.get);
router.post('/stores/:id/sync', requireAuth, StoreController.triggerSync);
router.get('/stores/:id/customers', requireAuth, StoreController.getCustomers);
router.get('/stores/:id/orders', requireAuth, StoreController.getOrders);
router.get('/stores/:id/products', requireAuth, StoreController.getProducts);
router.get('/stores/:id/webhooks', requireAuth, StoreController.getWebhookLogs);

// Webhook routes
router.post('/webhooks/shopify/:storeId', WebhookController.handleShopify);
router.post('/webhooks/shopify', WebhookController.handleShopify);
router.post('/webhooks/woocommerce/:storeId', WebhookController.handleWooCommerce);

export default router;
