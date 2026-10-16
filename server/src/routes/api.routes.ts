import { Router } from 'express';
import { StoreController } from '../controllers/store.controller.js';
import { WebhookController } from '../controllers/webhook.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Protected Store routes (require API key authentication)
router.post('/stores/connect', requireAuth, StoreController.connect);
router.get('/stores', requireAuth, StoreController.list);
router.get('/stores/:id', requireAuth, StoreController.get);
router.post('/stores/:id/sync', requireAuth, StoreController.triggerSync);

// Protected Data viewing routes
router.get('/stores/:id/customers', requireAuth, StoreController.getCustomers);
router.get('/stores/:id/orders', requireAuth, StoreController.getOrders);
router.get('/stores/:id/products', requireAuth, StoreController.getProducts);
router.get('/stores/:id/webhooks', requireAuth, StoreController.getWebhookLogs);

// Realtime Webhook routes (authenticated via HMAC signatures)
router.post('/webhooks/shopify/:storeId', WebhookController.handleShopify);
router.post('/webhooks/shopify', WebhookController.handleShopify);
router.post('/webhooks/woocommerce/:storeId', WebhookController.handleWooCommerce);

export default router;
