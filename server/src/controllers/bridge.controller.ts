import { Request, Response } from 'express';
import axios from 'axios';
import { AutoMateClient } from '../services/automate.client.js';
import { AutoMateTransformer } from '../services/automate.transformer.js';
import { ShopifyAdapter } from '../adapters/shopify.adapter.js';
import { WooCommerceAdapter } from '../adapters/woocommerce.adapter.js';

export class BridgeController {
  /**
   * Helper to resolve AutoMate credentials from headers, body, or server .env
   */
  private static resolveAutoMateClient(req: Request): AutoMateClient {
    const headerBaseUrl = req.headers['x-automate-base-url'] as string;
    const headerToken = req.headers['x-automate-token'] as string;
    const bodyBaseUrl = req.body?.automateBaseUrl;
    const bodyToken = req.body?.automateToken;

    const baseUrl = headerBaseUrl || bodyBaseUrl || process.env.AUTOMATE_BASE_URL;
    const token = headerToken || bodyToken || process.env.AUTOMATE_TOKEN;

    if (!baseUrl || !token) {
      throw new Error('AutoMate Base URL and Token are required (send via headers x-automate-base-url and x-automate-token or .env).');
    }

    return new AutoMateClient(baseUrl, token);
  }

  /**
   * Test connection to AutoMate
   * GET/POST /api/bridge/automate/test-connection
   */
  static async testAutoMateConnection(req: Request, res: Response): Promise<void> {
    try {
      const client = BridgeController.resolveAutoMateClient(req);
      const result = await client.testConnection();
      if (result.success) {
        res.json({ ok: true, shop: result.shop, store: result.store });
      } else {
        res.status(401).json({ ok: false, error: result.error });
      }
    } catch (err: any) {
      res.status(400).json({ ok: false, error: err.message });
    }
  }

  /**
   * Test connection to WooCommerce Store
   * POST /api/bridge/woocommerce/test-connection
   */
  static async testWooCommerceConnection(req: Request, res: Response): Promise<void> {
    try {
      const { storeUrl, consumerKey, consumerSecret } = req.body;

      if (!storeUrl || !consumerKey || !consumerSecret) {
        res.status(400).json({ ok: false, error: 'storeUrl, consumerKey, and consumerSecret are required.' });
        return;
      }

      const adapter = new WooCommerceAdapter(storeUrl, consumerKey, consumerSecret);
      const test = await adapter.testConnection();
      if (test.success) {
        res.json({ ok: true, storeName: test.storeName });
      } else {
        res.status(400).json({ ok: false, error: test.error });
      }
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  /**
   * Test connection to Shopify Store
   * POST /api/bridge/shopify/test-connection
   */
  static async testShopifyConnection(req: Request, res: Response): Promise<void> {
    try {
      const { storeDomain, accessToken } = req.body;

      if (!storeDomain || !accessToken) {
        res.status(400).json({ ok: false, error: 'storeDomain and accessToken are required.' });
        return;
      }

      const adapter = new ShopifyAdapter(storeDomain, accessToken);
      const test = await adapter.testConnection();
      if (test.success) {
        res.json({ ok: true, storeName: test.storeName });
      } else {
        res.status(400).json({ ok: false, error: test.error });
      }
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  /**
   * Instant Webhook Pass-Through for Orders (WooCommerce / Shopify / Custom)
   * POST /api/bridge/webhook/order
   */
  static async handleOrderWebhook(req: Request, res: Response): Promise<void> {
    try {
      const automate = BridgeController.resolveAutoMateClient(req);
      const rawPayload = req.body;

      if (!rawPayload) {
        res.status(400).json({ ok: false, error: 'No order payload received' });
        return;
      }

      const platform = (req.headers['x-platform'] as string) || (req.headers['x-shopify-topic'] ? 'shopify' : 'woocommerce');
      let automatePayload;

      if (platform === 'shopify') {
        automatePayload = AutoMateTransformer.transformShopifyOrder(rawPayload);
      } else {
        automatePayload = AutoMateTransformer.transformWooCommerceOrder(rawPayload);
      }

      console.log(`[Bridge] Instantly forwarding order #${automatePayload.order_id} to AutoMate...`);
      const result = await automate.createWebOrder(automatePayload);

      console.log(`[Bridge] AutoMate response: orderId=${result.orderId}, invoiceId=${result.invoiceId}, duplicate=${result.duplicate}`);
      res.status(200).json({
        ok: true,
        message: 'Order forwarded directly to AutoMate',
        autoMateResponse: result,
      });
    } catch (err: any) {
      console.error('[Bridge] Failed to forward order to AutoMate:', err.message);
      res.status(err.status || 500).json({
        ok: false,
        error: err.message,
        code: err.code,
        details: err.details,
      });
    }
  }

  /**
   * Instant Webhook Pass-Through for Products
   * POST /api/bridge/webhook/product
   */
  static async handleProductWebhook(req: Request, res: Response): Promise<void> {
    try {
      const automate = BridgeController.resolveAutoMateClient(req);
      const rawPayload = req.body;

      if (!rawPayload) {
        res.status(400).json({ ok: false, error: 'No product payload received' });
        return;
      }

      const platform = (req.headers['x-platform'] as string) || (req.headers['x-shopify-topic'] ? 'shopify' : 'woocommerce');
      let automatePayload;

      if (platform === 'shopify') {
        automatePayload = AutoMateTransformer.transformShopifyProduct(rawPayload);
      } else {
        automatePayload = AutoMateTransformer.transformWooCommerceProduct(rawPayload);
      }

      console.log(`[Bridge] Instantly syncing product #${automatePayload.product_id} (${automatePayload.name}) to AutoMate...`);
      const result = await automate.syncProduct(automatePayload);

      console.log(`[Bridge] AutoMate product synced: productId=${result.productId}, variants=${result.variants}`);
      res.status(200).json({
        ok: true,
        message: 'Product synced directly to AutoMate',
        autoMateResponse: result,
      });
    } catch (err: any) {
      console.error('[Bridge] Failed to forward product to AutoMate:', err.message);
      res.status(err.status || 500).json({
        ok: false,
        error: err.message,
        code: err.code,
        details: err.details,
      });
    }
  }

  /**
   * Batch Fetch from WooCommerce/Shopify and Stream directly to AutoMate (Zero DB)
   * POST /api/bridge/sync/products
   */
  static async syncProductsStream(req: Request, res: Response): Promise<void> {
    const { platform = 'woocommerce', storeUrl, storeDomain, consumerKey, consumerSecret, accessToken } = req.body;

    try {
      const automate = BridgeController.resolveAutoMateClient(req);
      let productsToSync: any[] = [];

      if (platform === 'woocommerce') {
        if (!storeUrl || !consumerKey || !consumerSecret) {
          res.status(400).json({ ok: false, error: 'WooCommerce storeUrl, consumerKey, and consumerSecret are required.' });
          return;
        }

        let cleanUrl = storeUrl.trim().replace(/\/$/, '');
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
          cleanUrl = `https://${cleanUrl}`;
        }

        const authHeader = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
        const wcResponse = await axios.get(`${cleanUrl}/wp-json/wc/v3/products`, {
          headers: { Authorization: `Basic ${authHeader}` },
          params: { per_page: 50 },
          timeout: 20000,
        });
        productsToSync = wcResponse.data || [];
      } else if (platform === 'shopify') {
        if (!storeDomain || !accessToken) {
          res.status(400).json({ ok: false, error: 'Shopify storeDomain and accessToken are required.' });
          return;
        }

        const adapter = new ShopifyAdapter(storeDomain, accessToken);
        const fetched = await adapter.fetchProducts(undefined, 50);
        productsToSync = fetched.items.map((i) => ({
          id: i.platformProductId,
          title: i.title,
          price: i.price,
          status: i.status,
          body_html: '',
        }));
      }

      console.log(`[Bridge] Fetched ${productsToSync.length} products. Streaming directly to AutoMate...`);

      const results = [];
      for (const p of productsToSync) {
        const payload = platform === 'shopify' 
          ? AutoMateTransformer.transformShopifyProduct(p) 
          : AutoMateTransformer.transformWooCommerceProduct(p);

        try {
          const amRes = await automate.syncProduct(payload);
          results.push({ id: payload.product_id, name: payload.name, success: true, autoMate: amRes });
        } catch (itemErr: any) {
          results.push({ id: payload.product_id, name: payload.name, success: false, error: itemErr.message });
        }

        // 500ms pacing as requested by AutoMate rate-limit spec (max 2 requests/sec)
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      res.json({
        ok: true,
        totalFetched: productsToSync.length,
        synced: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        items: results,
      });
    } catch (err: any) {
      console.error('[Bridge] Batch sync failed:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  /**
   * Batch Fetch Orders from WooCommerce/Shopify and Stream directly to AutoMate (Zero DB)
   * POST /api/bridge/sync/orders
   */
  static async syncOrdersStream(req: Request, res: Response): Promise<void> {
    const { platform = 'woocommerce', storeUrl, storeDomain, consumerKey, consumerSecret, accessToken } = req.body;

    try {
      const automate = BridgeController.resolveAutoMateClient(req);
      let ordersToSync: any[] = [];

      if (platform === 'shopify') {
        if (!storeDomain || !accessToken) {
          res.status(400).json({ ok: false, error: 'Shopify storeDomain and accessToken are required.' });
          return;
        }

        const adapter = new ShopifyAdapter(storeDomain, accessToken);
        const fetched = await adapter.fetchOrders(undefined, 25);
        ordersToSync = fetched.items.map((o) => ({
          id: o.platformOrderId,
          name: o.orderNumber,
          total_price: o.totalPrice,
          financial_status: o.financialStatus,
          customer: {
            first_name: 'Customer',
            last_name: o.platformCustomerId,
            phone: '',
          },
          shipping_address: {
            address1: '',
            city: '',
            country: '',
          },
          line_items: o.lineItems.map((li) => ({
            title: li.title,
            quantity: li.quantity,
            price: li.price,
            sku: `SKU-${li.title.replace(/\s+/g, '-').toUpperCase()}`,
          })),
        }));
      } else if (platform === 'woocommerce') {
        if (!storeUrl || !consumerKey || !consumerSecret) {
          res.status(400).json({ ok: false, error: 'WooCommerce storeUrl, consumerKey, and consumerSecret are required.' });
          return;
        }

        let cleanUrl = storeUrl.trim().replace(/\/$/, '');
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
          cleanUrl = `https://${cleanUrl}`;
        }

        const authHeader = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
        const wcResponse = await axios.get(`${cleanUrl}/wp-json/wc/v3/orders`, {
          headers: { Authorization: `Basic ${authHeader}` },
          params: { per_page: 25, status: 'processing,completed' },
          timeout: 20000,
        });
        ordersToSync = wcResponse.data || [];
      }

      console.log(`[Bridge] Fetched ${ordersToSync.length} orders. Streaming directly to AutoMate...`);

      const results = [];
      for (const o of ordersToSync) {
        const payload = platform === 'shopify'
          ? AutoMateTransformer.transformShopifyOrder(o)
          : AutoMateTransformer.transformWooCommerceOrder(o);

        try {
          const amRes = await automate.createWebOrder(payload);
          results.push({ order_id: payload.order_id, name: payload.name, success: true, autoMate: amRes });
        } catch (itemErr: any) {
          results.push({ order_id: payload.order_id, name: payload.name, success: false, error: itemErr.message });
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      res.json({
        ok: true,
        totalFetched: ordersToSync.length,
        synced: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        items: results,
      });
    } catch (err: any) {
      console.error('[Bridge] Batch order sync failed:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  }
}
