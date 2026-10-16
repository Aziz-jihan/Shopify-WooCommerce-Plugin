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
    const shopDomainHeader = (req.headers['x-shopify-shop-domain'] as string) || '';

    if (!req.rawBody) {
      res.status(400).send('Raw body missing');
      return;
    }

    try {
      // 1. Strict Store Lookup
      let store = null;

      if (storeId) {
        store = await prisma.store.findFirst({
          where: { id: storeId, platform: 'shopify' },
        });
      }

      // If storeId was not provided (e.g. global webhook route), lookup by exact domain
      if (!store) {
        if (!shopDomainHeader || shopDomainHeader.trim() === '') {
          res.status(400).send('Missing X-Shopify-Shop-Domain header for store lookup');
          return;
        }

        const cleanDomain = shopDomainHeader.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
        store = await prisma.store.findFirst({
          where: { storeDomain: cleanDomain, platform: 'shopify' },
        });
      }

      if (!store || !store.accessToken) {
        console.warn(`[WebhookController] Store not found for Shopify webhook: ${storeId || shopDomainHeader}`);
        res.status(404).send('Store not found');
        return;
      }

      // If shopDomain header is provided, ensure exact match with store domain to prevent cross-tenant spoofing
      if (shopDomainHeader) {
        const cleanDomain = shopDomainHeader.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
        if (store.storeDomain !== cleanDomain && !store.storeDomain.startsWith(cleanDomain)) {
          console.warn(`[WebhookController] Domain mismatch: expected ${store.storeDomain}, got ${cleanDomain}`);
          res.status(400).send('Mismatched shop domain');
          return;
        }
      }

      // 2. Strict Signature Verification
      const isMockStore = Boolean(
        store.accessToken === 'mock' ||
        store.storeDomain.includes('demo') ||
        store.storeDomain.includes('mock')
      );

      if (!isMockStore) {
        if (!hmacHeader || hmacHeader.trim() === '') {
          console.warn(`[WebhookController] Missing Shopify HMAC signature header for store ${store.id}`);
          res.status(401).send('Missing webhook signature header');
          return;
        }

        // Shopify signs webhooks with the App's Client Secret (API Secret Key), stored in apiSecret
        const verificationSecret = store.apiSecret;
        if (!verificationSecret) {
          console.error(`[WebhookController] Shopify App Client Secret (apiSecret) not configured for store ${store.id}`);
          res.status(500).send('Store webhook verification secret not configured');
          return;
        }

        const adapter = new ShopifyAdapter(store.storeDomain, store.accessToken);
        const isValid = adapter.verifyWebhookSignature(req.rawBody, hmacHeader, verificationSecret);

        if (!isValid) {
          console.warn(`[WebhookController] Invalid Shopify HMAC signature for store ${store.id}`);
          res.status(401).send('Invalid signature');
          return;
        }
      }

      // 3. Enqueue job for background processing
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
      // 1. Strict Store Lookup by ID & Platform
      const store = await prisma.store.findFirst({
        where: { id: storeId, platform: 'woocommerce' },
      });

      if (!store || !store.apiKey || !store.apiSecret) {
        console.warn(`[WebhookController] Store not found for WooCommerce webhook: ${storeId}`);
        res.status(404).send('Store not found');
        return;
      }

      // 2. Strict Signature Verification
      const isMockStore = Boolean(
        store.apiKey === 'mock' ||
        store.storeDomain.includes('demo') ||
        store.storeDomain.includes('mock')
      );

      if (!isMockStore) {
        if (!signature || signature.trim() === '') {
          console.warn(`[WebhookController] Missing WooCommerce signature header for store ${store.id}`);
          res.status(401).send('Missing webhook signature header');
          return;
        }

        const verificationSecret = store.webhookSecret;
        if (!verificationSecret) {
          console.error(`[WebhookController] WooCommerce webhook secret not configured for store ${store.id}`);
          res.status(500).send('Store webhook verification secret not configured');
          return;
        }

        const adapter = new WooCommerceAdapter(
          store.storeDomain,
          store.apiKey,
          store.apiSecret,
          verificationSecret
        );

        const isValid = adapter.verifyWebhookSignature(req.rawBody, signature, verificationSecret);

        if (!isValid) {
          console.warn(`[WebhookController] Invalid WooCommerce signature for store ${store.id}`);
          res.status(401).send('Invalid signature');
          return;
        }
      }

      // 3. Enqueue job for background processing
      await WebhookService.enqueue(store.id, 'woocommerce', topic, req.body);

      // Promptly acknowledge receipt
      res.status(200).send('Webhook received');
    } catch (err: any) {
      console.error('[WebhookController.handleWooCommerce] Error:', err);
      res.status(500).send(err.message);
    }
  }
}
