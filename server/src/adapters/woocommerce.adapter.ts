import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import https from 'https';
import {
  ECommerceAdapter,
  PaginatedResult,
  StandardCustomer,
  StandardOrder,
  StandardProduct,
  WebhookRegistrationResult,
} from './types.js';

export class WooCommerceAdapter implements ECommerceAdapter {
  readonly platform = 'woocommerce' as const;
  private client: AxiosInstance;
  private storeUrl: string;
  private webhookSecret: string;
  private ignoreCert: boolean;

  constructor(storeUrl: string, consumerKey: string, consumerSecret: string, webhookSecret = '', ignoreCert = true) {
    // Normalize store URL: ensure https:// and strip trailing slash
    let cleanUrl = storeUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    cleanUrl = cleanUrl.replace(/\/$/, '');
    this.storeUrl = cleanUrl;
    this.webhookSecret = webhookSecret;
    this.ignoreCert = ignoreCert;

    const authHeader = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    const axiosConfig: any = {
      baseURL: `${this.storeUrl}/wp-json/wc/v3`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authHeader}`,
      },
      timeout: 60000, // increased timeout to 60s for slower stores
    };
    // If ignoreCert flag is true, allow self‑signed certificates
    if (this.ignoreCert) {
      axiosConfig.httpsAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
    }
    this.client = axios.create(axiosConfig);

  }

  async testConnection(): Promise<{ success: boolean; storeName?: string; error?: string }> {
    try {
      // Test by querying system status or 1 customer
      const response = await this.client.get('/system_status');
      const storeName = response.data?.environment?.site_title || this.storeUrl;
      return { success: true, storeName };
    } catch (err: any) {
      // If system_status is restricted, fallback to fetching 1 product/order
      try {
        await this.client.get('/products?per_page=1');
        return { success: true, storeName: this.storeUrl };
      } catch (innerErr: any) {
        const msg = innerErr.response?.data?.message || innerErr.message;
        return { success: false, error: `WooCommerce API Error: ${msg}` };
      }
    }
  }

  async fetchCustomers(page: number = 1, limit = 50): Promise<PaginatedResult<StandardCustomer>> {
    const pageNum = typeof page === 'number' ? page : parseInt(String(page), 10) || 1;
    const response = await this.client.get('/customers', {
      params: { page: pageNum, per_page: limit },
    });

    const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1', 10);
    const rawCustomers = response.data || [];

    const items: StandardCustomer[] = rawCustomers.map((c: any) => ({
      platformCustomerId: String(c.id),
      email: c.email || null,
      firstName: c.first_name || null,
      lastName: c.last_name || null,
      phone: c.billing?.phone || null,
      ordersCount: Number(c.orders_count || 0),
      totalSpent: parseFloat(c.total_spent || '0'),
      currency: 'USD',
      addresses: [c.billing, c.shipping].filter(Boolean),
      rawData: c,
      platformCreatedAt: c.date_created ? new Date(c.date_created) : null,
      platformUpdatedAt: c.date_modified ? new Date(c.date_modified) : null,
    }));

    return {
      items,
      hasNextPage: pageNum < totalPages,
      nextCursor: pageNum < totalPages ? pageNum + 1 : undefined,
    };
  }

  async fetchCustomerById(platformCustomerId: string): Promise<StandardCustomer | null> {
    try {
      const response = await this.client.get(`/customers/${platformCustomerId}`);
      const c = response.data;
      if (!c || !c.id) return null;

      return {
        platformCustomerId: String(c.id),
        email: c.email || null,
        firstName: c.first_name || null,
        lastName: c.last_name || null,
        phone: c.billing?.phone || null,
        ordersCount: Number(c.orders_count || 0),
        totalSpent: parseFloat(c.total_spent || '0'),
        currency: 'USD',
        addresses: [c.billing, c.shipping].filter(Boolean),
        rawData: c,
        platformCreatedAt: c.date_created ? new Date(c.date_created) : null,
        platformUpdatedAt: c.date_modified ? new Date(c.date_modified) : null,
      };
    } catch {
      return null;
    }
  }

  async fetchOrders(page: number = 1, limit = 50): Promise<PaginatedResult<StandardOrder>> {
    const pageNum = typeof page === 'number' ? page : parseInt(String(page), 10) || 1;
    const response = await this.client.get('/orders', {
      params: { page: pageNum, per_page: limit },
    });

    const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1', 10);
    const rawOrders = response.data || [];

    const items: StandardOrder[] = rawOrders.map((o: any) => ({
      platformOrderId: String(o.id),
      platformCustomerId: o.customer_id && o.customer_id !== 0 ? String(o.customer_id) : null,
      orderNumber: o.number ? String(o.number) : String(o.id),
      totalPrice: parseFloat(o.total || '0'),
      currency: o.currency || 'USD',
      financialStatus: o.status || null,
      fulfillmentStatus: o.status || null,
      lineItems: (o.line_items || []).map((li: any) => ({
        title: li.name,
        quantity: li.quantity,
        price: li.price,
      })),
      rawData: o,
      platformCreatedAt: o.date_created ? new Date(o.date_created) : null,
    }));

    return {
      items,
      hasNextPage: pageNum < totalPages,
      nextCursor: pageNum < totalPages ? pageNum + 1 : undefined,
    };
  }

  async fetchOrderById(platformOrderId: string): Promise<StandardOrder | null> {
    try {
      const response = await this.client.get(`/orders/${platformOrderId}`);
      const o = response.data;
      if (!o || !o.id) return null;

      return {
        platformOrderId: String(o.id),
        platformCustomerId: o.customer_id && o.customer_id !== 0 ? String(o.customer_id) : null,
        orderNumber: o.number ? String(o.number) : String(o.id),
        totalPrice: parseFloat(o.total || '0'),
        currency: o.currency || 'USD',
        financialStatus: o.status || null,
        fulfillmentStatus: o.status || null,
        lineItems: o.line_items || [],
        rawData: o,
        platformCreatedAt: o.date_created ? new Date(o.date_created) : null,
      };
    } catch {
      return null;
    }
  }

  async fetchProducts(page: number = 1, limit = 50): Promise<PaginatedResult<StandardProduct>> {
    const pageNum = typeof page === 'number' ? page : parseInt(String(page), 10) || 1;
    const response = await this.client.get('/products', {
      params: { page: pageNum, per_page: limit },
    });

    const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1', 10);
    const rawProducts = response.data || [];

    const items: StandardProduct[] = rawProducts.map((p: any) => ({
      platformProductId: String(p.id),
      title: p.name || 'Untitled',
      handle: p.slug || null,
      price: parseFloat(p.price || '0'),
      status: p.status || null,
      rawData: p,
    }));

    return {
      items,
      hasNextPage: pageNum < totalPages,
      nextCursor: pageNum < totalPages ? pageNum + 1 : undefined,
    };
  }

  async fetchProductById(platformProductId: string): Promise<StandardProduct | null> {
    try {
      const response = await this.client.get(`/products/${platformProductId}`);
      const p = response.data;
      if (!p || !p.id) return null;

      return {
        platformProductId: String(p.id),
        title: p.name || 'Untitled',
        handle: p.slug || null,
        price: parseFloat(p.price || '0'),
        status: p.status || null,
        rawData: p,
      };
    } catch {
      return null;
    }
  }

  async registerWebhooks(callbackBaseUrl: string, storeId: string): Promise<WebhookRegistrationResult[]> {
    const topics = [
      'customer.created',
      'customer.updated',
      'order.created',
      'order.updated',
      'product.created',
      'product.updated',
    ];

    const callbackUrl = `${callbackBaseUrl.replace(/\/$/, '')}/api/webhooks/woocommerce/${storeId}`;
    const results: WebhookRegistrationResult[] = [];

    // Query existing webhooks to avoid duplicates
    let existingWebhooks: any[] = [];
    try {
      const res = await this.client.get('/webhooks', { params: { per_page: 100 } });
      existingWebhooks = res.data || [];
    } catch {
      // ignore
    }

    for (const topic of topics) {
      const existing = existingWebhooks.find(
        (w: any) => w.topic === topic && w.delivery_url === callbackUrl
      );

      if (existing) {
        results.push({
          topic,
          success: true,
          webhookId: String(existing.id),
        });
        continue;
      }

      try {
        const response = await this.client.post('/webhooks', {
          name: `Sync Plugin - ${topic}`,
          topic,
          delivery_url: callbackUrl,
          secret: this.webhookSecret,
          status: 'active',
        });

        results.push({
          topic,
          success: true,
          webhookId: String(response.data.id),
        });
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message;
        results.push({ topic, success: false, error: msg });
      }
    }

    return results;
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string, secret: string): boolean {
    if (!signature || !secret || !rawBody) return false;
    try {
      const generated = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
      const sigBuf = Buffer.from(signature);
      const genBuf = Buffer.from(generated);
      if (sigBuf.length !== genBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, genBuf);
    } catch {
      return false;
    }
  }
}
