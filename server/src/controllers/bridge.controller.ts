import { Request, Response } from 'express';
import axios from 'axios';
import https from 'https';
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
      const { storeUrl, consumerKey, consumerSecret, ignoreCert = true } = req.body;

      if (!storeUrl || !consumerKey || !consumerSecret) {
        res.status(400).json({ ok: false, error: 'storeUrl, consumerKey, and consumerSecret are required.' });
        return;
      }

      const adapter = new WooCommerceAdapter(storeUrl, consumerKey, consumerSecret, '', ignoreCert);
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
    const { platform = 'woocommerce', storeUrl, storeDomain, consumerKey, consumerSecret, accessToken, limit, ignoreCert = true } = req.body;

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
        const httpsAgent = new https.Agent({ rejectUnauthorized: !ignoreCert, keepAlive: true });
        
        try {
          const wcResponse = await axios.get(`${cleanUrl}/wp-json/wc/v3/products`, {
            headers: { Authorization: `Basic ${authHeader}` },
            params: { per_page: limit || 20 },
            timeout: 60000,
            httpsAgent,
          });
          productsToSync = wcResponse.data || [];
        } catch (fetchErr: any) {
          const errDetail = fetchErr.response?.data?.message || fetchErr.message;
          throw new Error(`WooCommerce API Error (Products): ${errDetail}`);
        }
      } else if (platform === 'shopify') {
        if (!storeDomain || !accessToken) {
          res.status(400).json({ ok: false, error: 'Shopify storeDomain and accessToken are required.' });
          return;
        }

        const adapter = new ShopifyAdapter(storeDomain, accessToken);
        const fetched = await adapter.fetchProducts(undefined, limit || 20);
        productsToSync = fetched.items.map((i) => {
          const raw = i.rawData || {};
          return {
            id: i.platformProductId,
            title: i.title,
            price: i.price,
            status: i.status,
            descriptionHtml: raw.descriptionHtml || '',
            variants: raw.variants || [],
          };
        });
      }

      console.log(`[Bridge] Fetched ${productsToSync.length} products. Streaming directly to AutoMate...`);

      const results = [];
      for (const p of productsToSync) {
        let variations: any[] = [];
        if (platform === 'woocommerce' && (p.type === 'variable' || (Array.isArray(p.variations) && p.variations.length > 0))) {
          if (Array.isArray(p.variations) && typeof p.variations[0] === 'object') {
            variations = p.variations;
          } else {
            try {
              let cleanUrl = storeUrl.trim().replace(/\/$/, '');
              if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
                cleanUrl = `https://${cleanUrl}`;
              }
              const authHeader = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
              const httpsAgent = new https.Agent({ rejectUnauthorized: !ignoreCert, keepAlive: true });
              const varRes = await axios.get(`${cleanUrl}/wp-json/wc/v3/products/${p.id}/variations`, {
                headers: { Authorization: `Basic ${authHeader}` },
                params: { per_page: 100 },
                timeout: 30000,
                httpsAgent,
              });
              variations = varRes.data || [];
              console.log(`[Bridge] Fetched ${variations.length} variations for WC product #${p.id} (${p.name})`);
            } catch (varErr: any) {
              console.warn(`[Bridge] Warning: Could not fetch variations for WC product #${p.id}:`, varErr.message);
            }
          }
        }

        const payload = platform === 'shopify' 
          ? AutoMateTransformer.transformShopifyProduct(p) 
          : AutoMateTransformer.transformWooCommerceProduct(p, variations);

        try {
          const amRes = await automate.syncProduct(payload);
          results.push({
            id: payload.product_id,
            name: payload.name,
            variantsCount: payload.variants ? payload.variants.length : 0,
            success: true,
            autoMate: amRes,
          });
        } catch (itemErr: any) {
          results.push({
            id: payload.product_id,
            name: payload.name,
            variantsCount: payload.variants ? payload.variants.length : 0,
            success: false,
            error: itemErr.message,
          });
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
    const { platform = 'woocommerce', storeUrl, storeDomain, consumerKey, consumerSecret, accessToken, limit, ignoreCert = true } = req.body;

    try {
      const automate = BridgeController.resolveAutoMateClient(req);
      let ordersToSync: any[] = [];

      if (platform === 'shopify') {
        if (!storeDomain || !accessToken) {
          res.status(400).json({ ok: false, error: 'Shopify storeDomain and accessToken are required.' });
          return;
        }

        const adapter = new ShopifyAdapter(storeDomain, accessToken);
        const fetched = await adapter.fetchOrders(undefined, limit || 20);
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
        const httpsAgent = new https.Agent({ rejectUnauthorized: !ignoreCert, keepAlive: true });

        try {
          const wcResponse = await axios.get(`${cleanUrl}/wp-json/wc/v3/orders`, {
            headers: { Authorization: `Basic ${authHeader}` },
            params: { per_page: limit || 20, status: 'processing,completed' },
            timeout: 60000,
            httpsAgent,
          });
          ordersToSync = wcResponse.data || [];
        } catch (fetchErr: any) {
          // If status filter failed or was slow, try falling back to general order query without status filter
          try {
            const fallbackResponse = await axios.get(`${cleanUrl}/wp-json/wc/v3/orders`, {
              headers: { Authorization: `Basic ${authHeader}` },
              params: { per_page: limit || 20 },
              timeout: 60000,
              httpsAgent,
            });
            ordersToSync = fallbackResponse.data || [];
          } catch (innerErr: any) {
            const errDetail = innerErr.response?.data?.message || fetchErr.response?.data?.message || fetchErr.message;
            throw new Error(`WooCommerce API Error (Orders): ${errDetail}`);
          }
        }
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
