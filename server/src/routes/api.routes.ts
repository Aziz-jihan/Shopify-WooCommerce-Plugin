import { Router } from 'express';
import { StoreController } from '../controllers/store.controller.js';
import { WebhookController } from '../controllers/webhook.controller.js';

const router = Router();

// Store routes
router.post('/stores/connect', StoreController.connect);
router.get('/stores', StoreController.list);
router.get('/stores/:id', StoreController.get);
router.post('/stores/:id/sync', StoreController.triggerSync);

// Data viewing routes
router.get('/stores/:id/customers', StoreController.getCustomers);
router.get('/stores/:id/orders', StoreController.getOrders);
router.get('/stores/:id/products', StoreController.getProducts);
router.get('/stores/:id/webhooks', StoreController.getWebhookLogs);

// Realtime Webhook routes
router.post('/webhooks/shopify/:storeId', WebhookController.handleShopify);
router.post('/webhooks/shopify', WebhookController.handleShopify); // fallback for global
router.post('/webhooks/woocommerce/:storeId', WebhookController.handleWooCommerce);

export default router;
