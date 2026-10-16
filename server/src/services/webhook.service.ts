import { prisma } from '../db.js';
import { createAdapterForStore } from '../adapters/adapter.factory.js';
import { SyncService } from './sync.service.js';

interface WebhookJob {
  eventId: string;
  storeId: string;
  platform: 'shopify' | 'woocommerce';
  topic: string;
  payload: any;
}

export class WebhookService {
  private static queue: WebhookJob[] = [];
  private static isProcessing = false;

  /**
   * Enqueue a validated webhook event for asynchronous processing
   */
  static async enqueue(storeId: string, platform: 'shopify' | 'woocommerce', topic: string, payload: any): Promise<string> {
    // 1. Log the incoming event in database
    const event = await prisma.webhookEvent.create({
      data: {
        storeId,
        platform,
        topic,
        payload,
        status: 'pending',
      },
    });

    // 2. Add to in-memory queue
    this.queue.push({
      eventId: event.id,
      storeId,
      platform,
      topic,
      payload,
    });

    // 3. Trigger worker if not already running
    this.processQueue();

    return event.id;
  }

  private static async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) break;

      try {
        await this.handleJob(job);
        await prisma.webhookEvent.update({
          where: { id: job.eventId },
          data: {
            status: 'processed',
            processedAt: new Date(),
          },
        });
      } catch (err: any) {
        console.error(`[WebhookService] Failed to process webhook job ${job.eventId}:`, err);
        await prisma.webhookEvent.update({
          where: { id: job.eventId },
          data: {
            status: 'failed',
            errorMessage: err.message,
            processedAt: new Date(),
          },
        });
      }
    }

    this.isProcessing = false;
  }

  private static async handleJob(job: WebhookJob) {
    const { storeId, platform, topic, payload } = job;

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new Error(`Store ${storeId} not found for webhook job.`);
    }

    const adapter = createAdapterForStore(store);
    const normalizedTopic = topic.toLowerCase().replace('/', '.').replace('_', '.');

    // ─── 1. Customer Events ──────────────────────────────────────────
    if (normalizedTopic.includes('customer')) {
      const customerId = String(payload.id || payload.legacyResourceId || payload.customer_id);
      if (!customerId) {
        throw new Error(`Unable to extract Customer ID from webhook topic: ${topic}`);
      }

      console.log(`[WebhookService] Fetching fresh Customer (${customerId}) from ${platform}...`);
      let fullCustomer = await adapter.fetchCustomerById(customerId);
      if (!fullCustomer) {
        console.log(`[WebhookService] Re-fetch returned null, falling back to direct payload for Customer ${customerId}`);
        fullCustomer = {
          platformCustomerId: customerId,
          email: payload.email || null,
          firstName: payload.first_name || payload.firstName || null,
          lastName: payload.last_name || payload.lastName || null,
          phone: payload.phone || payload.billing?.phone || null,
          ordersCount: Number(payload.orders_count || payload.numberOfOrders || 0),
          totalSpent: parseFloat(payload.total_spent || payload.amountSpent?.amount || '0'),
          currency: payload.currency || 'USD',
          addresses: payload.addresses || (payload.defaultAddress ? [payload.defaultAddress] : []),
          rawData: payload,
          platformCreatedAt: payload.created_at ? new Date(payload.created_at) : new Date(),
          platformUpdatedAt: payload.updated_at ? new Date(payload.updated_at) : new Date(),
        };
      }
      await SyncService.upsertCustomer(store.id, fullCustomer);
      console.log(`[WebhookService] Successfully updated Customer ${customerId} in database.`);
      return;
    }

    // ─── 2. Order Events ─────────────────────────────────────────────
    if (normalizedTopic.includes('order')) {
      const orderId = String(payload.id || payload.order_id);
      if (!orderId) {
        throw new Error(`Unable to extract Order ID from webhook topic: ${topic}`);
      }

      console.log(`[WebhookService] Fetching fresh Order (${orderId}) from ${platform}...`);
      let fullOrder = await adapter.fetchOrderById(orderId);
      if (!fullOrder) {
        console.log(`[WebhookService] Re-fetch returned null, falling back to direct payload for Order ${orderId}`);
        const customerId = payload.customer?.id || payload.customer_id ? String(payload.customer?.id || payload.customer_id) : null;
        fullOrder = {
          platformOrderId: orderId,
          platformCustomerId: customerId,
          orderNumber: payload.order_number ? String(payload.order_number) : (payload.name || orderId),
          totalPrice: parseFloat(payload.total_price || payload.total || '0'),
          currency: payload.currency || 'USD',
          financialStatus: payload.financial_status || payload.status || 'paid',
          fulfillmentStatus: payload.fulfillment_status || 'unfulfilled',
          lineItems: payload.line_items || [],
          rawData: payload,
          platformCreatedAt: payload.created_at ? new Date(payload.created_at) : new Date(),
        };
      }
      await SyncService.upsertOrder(store.id, fullOrder);
      console.log(`[WebhookService] Successfully updated Order ${orderId} in database.`);

      // Also refresh the associated customer's totals if customer ID is present
      if (fullOrder.platformCustomerId) {
        const freshCustomer = await adapter.fetchCustomerById(fullOrder.platformCustomerId);
        if (freshCustomer) {
          await SyncService.upsertCustomer(store.id, freshCustomer);
        }
      }
      return;
    }

    // ─── 3. Product Events ───────────────────────────────────────────
    if (normalizedTopic.includes('product')) {
      const productId = String(payload.id || payload.product_id);
      if (!productId) {
        throw new Error(`Unable to extract Product ID from webhook topic: ${topic}`);
      }

      console.log(`[WebhookService] Fetching fresh Product (${productId}) from ${platform}...`);
      let fullProduct = await adapter.fetchProductById(productId);
      if (!fullProduct) {
        console.log(`[WebhookService] Re-fetch returned null, falling back to direct payload for Product ${productId}`);
        fullProduct = {
          platformProductId: productId,
          title: payload.title || payload.name || 'Untitled Product',
          handle: payload.handle || payload.slug || null,
          price: parseFloat(payload.price || payload.variants?.[0]?.price || '0'),
          status: payload.status || 'active',
          rawData: payload,
        };
      }
      await SyncService.upsertProduct(store.id, fullProduct);
      console.log(`[WebhookService] Successfully updated Product ${productId} in database.`);
      return;
    }

    // ─── 4. App Uninstalled Event ────────────────────────────────────
    if (normalizedTopic.includes('uninstalled')) {
      await prisma.store.update({
        where: { id: storeId },
        data: { syncStatus: 'failed' },
      });
      console.log(`[WebhookService] App uninstalled event processed for store ${storeId}.`);
    }
  }
}
