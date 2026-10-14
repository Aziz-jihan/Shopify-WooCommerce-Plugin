import { Response } from 'express';
import { RequestWithRawBody } from '../middleware/rawBody.js';
import { prisma } from '../db.js';
import { ShopifyAdapter } from '../adapters/shopify.adapter.js';
import { WooCommerceAdapter } from '../adapters/woocommerce.adapter.js';
import { WebhookService } from '../services/webhook.service.js';

export class WebhookController {
  /**
   * Handle incoming Shopify Webhook
   * Route: POST /api/webhooks/shopify/:storeId
   */
  static async handleShopify(req: RequestWithRawBody, res: Response): Promise<void> {
    const { storeId } = req.params;
    const hmacHeader = (req.headers['x-shopify-hmac-sha256'] as string) || '';
    const topic = (req.headers['x-shopify-topic'] as string) || 'unknown';
    const shopDomain = (req.headers['x-shopify-shop-domain'] as string) || '';

    // Shopify requires 200 OK fast
    if (!req.rawBody) {
      res.status(400).send('Raw body missing');
      return;
    }

    try {
      const store = await prisma.store.findFirst({
        where: {
          OR: [{ id: storeId }, { storeDomain: { contains: shopDomain } }],
        },
      });

      if (!store || !store.accessToken) {
        console.warn(`[WebhookController] Store not found for Shopify webhook: ${storeId || shopDomain}`);
        res.status(404).send('Store not found');
        return;
      }

      // Verify HMAC if a webhook secret / API secret is configured, or proceed
      const secretToVerify = store.webhookSecret || store.accessToken;
      const adapter = new ShopifyAdapter(store.storeDomain, store.accessToken);
      const isValid = adapter.verifyWebhookSignature(req.rawBody, hmacHeader, secretToVerify);

      // In production, reject if !isValid. For custom apps without separate webhook secret, we check HMAC if available
      if (hmacHeader && !isValid && process.env.NODE_ENV === 'production') {
        console.warn(`[WebhookController] Invalid Shopify HMAC signature for store ${store.id}`);
        res.status(401).send('Invalid signature');
        return;
      }

      // Enqueue the job for async processing
      await WebhookService.enqueue(store.id, 'shopify', topic, req.body);

      // Promptly acknowledge receipt to Shopify
      res.status(200).send('Webhook received');
    } catch (err: any) {
      console.error('[WebhookController.handleShopify] Error:', err);
      res.status(500).send(err.message);
    }
  }

  /**
   * Handle incoming WooCommerce Webhook
   * Route: POST /api/webhooks/woocommerce/:storeId
   */
  static async handleWooCommerce(req: RequestWithRawBody, res: Response): Promise<void> {
    const { storeId } = req.params;
    const signature = (req.headers['x-wc-webhook-signature'] as string) || '';
    const topic = (req.headers['x-wc-webhook-topic'] as string) || 'unknown';

    if (!req.rawBody) {
      res.status(400).send('Raw body missing');
      return;
    }

    try {
      const store = await prisma.store.findUnique({
        where: { id: storeId },
      });

      if (!store || !store.apiKey || !store.apiSecret) {
        console.warn(`[WebhookController] Store not found for WooCommerce webhook: ${storeId}`);
        res.status(404).send('Store not found');
        return;
      }

      const adapter = new WooCommerceAdapter(
        store.storeDomain,
        store.apiKey,
        store.apiSecret,
        store.webhookSecret || ''
      );

      // Verify HMAC signature
      const isValid = adapter.verifyWebhookSignature(
        req.rawBody,
        signature,
        store.webhookSecret || ''
      );

      if (signature && !isValid && process.env.NODE_ENV === 'production') {
        console.warn(`[WebhookController] Invalid WooCommerce signature for store ${store.id}`);
        res.status(401).send('Invalid signature');
        return;
      }

      // Enqueue job for background processing
      await WebhookService.enqueue(store.id, 'woocommerce', topic, req.body);

      // Promptly acknowledge receipt
      res.status(200).send('Webhook received');
    } catch (err: any) {
      console.error('[WebhookController.handleWooCommerce] Error:', err);
      res.status(500).send(err.message);
    }
  }
}
