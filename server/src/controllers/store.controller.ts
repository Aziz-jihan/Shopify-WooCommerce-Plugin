import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../db.js';
import { ShopifyAdapter } from '../adapters/shopify.adapter.js';
import { WooCommerceAdapter } from '../adapters/woocommerce.adapter.js';
import { SyncService } from '../services/sync.service.js';

export const storePublicSelect = {
  id: true,
  platform: true,
  storeDomain: true,
  storeName: true,
  syncStatus: true,
  lastSyncedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      customers: true,
      orders: true,
      products: true,
    },
  },
} as const;

export class StoreController {
  /**
   * Connect and validate a store (Shopify or WooCommerce)
   */
  static async connect(req: Request, res: Response): Promise<void> {
    try {
      const { platform, storeDomain, accessToken, apiKey, apiSecret } = req.body;

      if (!platform || !storeDomain) {
        res.status(400).json({ error: 'platform and storeDomain are required.' });
        return;
      }

      let storeName = storeDomain;
      const webhookSecret = crypto.randomBytes(24).toString('hex');

      // Test credentials with appropriate adapter
      if (platform === 'shopify') {
        if (!accessToken) {
          res.status(400).json({ error: 'Shopify Admin API Access Token (accessToken) is required.' });
          return;
        }
        if (!apiSecret) {
          res.status(400).json({ error: 'Shopify App Client Secret (apiSecret) is required for webhook signature verification.' });
          return;
        }
        const adapter = new ShopifyAdapter(storeDomain, accessToken);
        const test = await adapter.testConnection();
        if (!test.success) {
          res.status(400).json({ error: `Failed to connect to Shopify: ${test.error}` });
          return;
        }
        storeName = test.storeName || storeDomain;
      } else if (platform === 'woocommerce') {
        if (!apiKey || !apiSecret) {
          res.status(400).json({ error: 'WooCommerce Consumer Key (apiKey) and Secret (apiSecret) are required.' });
          return;
        }
        const adapter = new WooCommerceAdapter(storeDomain, apiKey, apiSecret, webhookSecret);
        const test = await adapter.testConnection();
        if (!test.success) {
          res.status(400).json({ error: `Failed to connect to WooCommerce: ${test.error}` });
          return;
        }
        storeName = test.storeName || storeDomain;
      } else {
        res.status(400).json({ error: 'Platform must be either "shopify" or "woocommerce".' });
        return;
      }

      // Upsert Store into Database
      const store = await prisma.store.upsert({
        where: {
          platform_storeDomain: {
            platform,
            storeDomain,
          },
        },
        create: {
          platform,
          storeDomain,
          storeName,
          accessToken: accessToken || null,
          apiKey: apiKey || null,
          apiSecret: apiSecret || null,
          webhookSecret,
        },
        update: {
          storeName,
          accessToken: accessToken || null,
          apiKey: apiKey || null,
          apiSecret: apiSecret || null,
          webhookSecret,
          syncStatus: 'idle',
        },
        select: storePublicSelect,
      });

      // Attempt to register webhooks if APP_BASE_URL is configured (e.g. ngrok or production domain)
      const appBaseUrl = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
      let webhookResults: any[] = [];
      try {
        if (platform === 'shopify') {
          const adapter = new ShopifyAdapter(storeDomain, accessToken);
          webhookResults = await adapter.registerWebhooks(appBaseUrl, store.id);
        } else {
          const adapter = new WooCommerceAdapter(storeDomain, apiKey, apiSecret, webhookSecret);
          webhookResults = await adapter.registerWebhooks(appBaseUrl, store.id);
        }
      } catch (err: any) {
        console.warn(`[StoreController] Webhook registration warning: ${err.message}`);
      }

      res.status(200).json({
        success: true,
        message: `Successfully connected ${platform} store: ${storeName}`,
        store,
        webhooks: webhookResults,
      });
    } catch (err: any) {
      console.error('[StoreController.connect] Error:', err);
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * List all connected stores with counts (credentials omitted)
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const stores = await prisma.store.findMany({
        orderBy: { createdAt: 'desc' },
        select: storePublicSelect,
      });

      res.json({ stores });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Get single store details (credentials omitted)
   */
  static async get(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const store = await prisma.store.findUnique({
        where: { id },
        select: storePublicSelect,
      });

      if (!store) {
        res.status(404).json({ error: 'Store not found' });
        return;
      }

      res.json({ store });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Trigger full initial sync in background
   */
  static async triggerSync(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const store = await prisma.store.findUnique({ where: { id } });
      if (!store) {
        res.status(404).json({ error: 'Store not found' });
        return;
      }

      // Start sync asynchronously
      SyncService.runFullSync(id).catch((err) => {
        console.error(`[Background Sync Error] Store ${id}:`, err);
      });

      res.status(202).json({
        success: true,
        message: 'Sync started in background.',
        storeId: id,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Fetch stored customers for a specific store
   */
  static async getCustomers(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { page = '1', limit = '50', search = '' } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const where: any = { storeId: id };
      if (search) {
        where.OR = [
          { email: { contains: search as string, mode: 'insensitive' } },
          { firstName: { contains: search as string, mode: 'insensitive' } },
          { lastName: { contains: search as string, mode: 'insensitive' } },
          { phone: { contains: search as string } },
        ];
      }

      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.customer.count({ where }),
      ]);

      res.json({
        customers,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Fetch stored orders for a specific store
   */
  static async getOrders(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const orders = await prisma.order.findMany({
        where: { storeId: id },
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      res.json({ orders });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Fetch stored products for a specific store
   */
  static async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const products = await prisma.product.findMany({
        where: { storeId: id },
        take: 100,
        orderBy: { createdAt: 'desc' },
      });

      res.json({ products });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Fetch recent webhook events
   */
  static async getWebhookLogs(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const events = await prisma.webhookEvent.findMany({
        where: id ? { storeId: id } : {},
        take: 50,
        orderBy: { createdAt: 'desc' },
      });

      res.json({ events });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
