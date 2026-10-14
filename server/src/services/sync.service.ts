import { prisma } from '../db.js';
import { createAdapterForStore } from '../adapters/adapter.factory.js';
import { StandardCustomer, StandardOrder, StandardProduct } from '../adapters/types.js';

export class SyncService {
  /**
   * Run full initial sync for a specific store
   */
  static async runFullSync(storeId: string): Promise<{
    success: boolean;
    customersSynced: number;
    ordersSynced: number;
    productsSynced: number;
    error?: string;
  }> {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new Error(`Store with id ${storeId} not found.`);
    }

    // Set status to in_progress
    await prisma.store.update({
      where: { id: storeId },
      data: { syncStatus: 'in_progress' },
    });

    let customersCount = 0;
    let ordersCount = 0;
    let productsCount = 0;

    try {
      const adapter = createAdapterForStore(store);

      // 1. Sync Customers
      let customerCursor: string | number | undefined = undefined;
      let hasMoreCustomers = true;

      while (hasMoreCustomers) {
        const result = await adapter.fetchCustomers(customerCursor, 50);
        for (const customer of result.items) {
          await this.upsertCustomer(store.id, customer);
          customersCount++;
        }
        hasMoreCustomers = result.hasNextPage;
        customerCursor = result.nextCursor;
      }

      // 2. Sync Orders
      let orderCursor: string | number | undefined = undefined;
      let hasMoreOrders = true;

      while (hasMoreOrders) {
        const result = await adapter.fetchOrders(orderCursor, 50);
        for (const order of result.items) {
          await this.upsertOrder(store.id, order);
          ordersCount++;
        }
        hasMoreOrders = result.hasNextPage;
        orderCursor = result.nextCursor;
      }

      // 3. Sync Products
      let productCursor: string | number | undefined = undefined;
      let hasMoreProducts = true;

      while (hasMoreProducts) {
        const result = await adapter.fetchProducts(productCursor, 50);
        for (const product of result.items) {
          await this.upsertProduct(store.id, product);
          productsCount++;
        }
        hasMoreProducts = result.hasNextPage;
        productCursor = result.nextCursor;
      }

      // Mark store sync as completed
      await prisma.store.update({
        where: { id: storeId },
        data: {
          syncStatus: 'completed',
          lastSyncedAt: new Date(),
        },
      });

      return {
        success: true,
        customersSynced: customersCount,
        ordersSynced: ordersCount,
        productsSynced: productsCount,
      };
    } catch (err: any) {
      await prisma.store.update({
        where: { id: storeId },
        data: { syncStatus: 'failed' },
      });
      console.error(`[SyncService] Error during sync for store ${storeId}:`, err);
      return {
        success: false,
        customersSynced: customersCount,
        ordersSynced: ordersCount,
        productsSynced: productsCount,
        error: err.message,
      };
    }
  }

  static async upsertCustomer(storeId: string, data: StandardCustomer) {
    return prisma.customer.upsert({
      where: {
        storeId_platformCustomerId: {
          storeId,
          platformCustomerId: data.platformCustomerId,
        },
      },
      create: {
        storeId,
        platformCustomerId: data.platformCustomerId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        ordersCount: data.ordersCount,
        totalSpent: data.totalSpent,
        currency: data.currency,
        addresses: data.addresses,
        rawData: data.rawData,
        platformCreatedAt: data.platformCreatedAt,
        platformUpdatedAt: data.platformUpdatedAt,
      },
      update: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        ordersCount: data.ordersCount,
        totalSpent: data.totalSpent,
        currency: data.currency,
        addresses: data.addresses,
        rawData: data.rawData,
        platformUpdatedAt: data.platformUpdatedAt || new Date(),
      },
    });
  }

  static async upsertOrder(storeId: string, data: StandardOrder) {
    // If order has a customer, find the internal customer ID
    let internalCustomerId: string | null = null;
    if (data.platformCustomerId) {
      const customer = await prisma.customer.findUnique({
        where: {
          storeId_platformCustomerId: {
            storeId,
            platformCustomerId: data.platformCustomerId,
          },
        },
        select: { id: true },
      });
      if (customer) {
        internalCustomerId = customer.id;
      }
    }

    return prisma.order.upsert({
      where: {
        storeId_platformOrderId: {
          storeId,
          platformOrderId: data.platformOrderId,
        },
      },
      create: {
        storeId,
        customerId: internalCustomerId,
        platformOrderId: data.platformOrderId,
        orderNumber: data.orderNumber,
        totalPrice: data.totalPrice,
        currency: data.currency,
        financialStatus: data.financialStatus,
        fulfillmentStatus: data.fulfillmentStatus,
        lineItems: data.lineItems,
        rawData: data.rawData,
        platformCreatedAt: data.platformCreatedAt,
      },
      update: {
        customerId: internalCustomerId,
        orderNumber: data.orderNumber,
        totalPrice: data.totalPrice,
        currency: data.currency,
        financialStatus: data.financialStatus,
        fulfillmentStatus: data.fulfillmentStatus,
        lineItems: data.lineItems,
        rawData: data.rawData,
      },
    });
  }

  static async upsertProduct(storeId: string, data: StandardProduct) {
    return prisma.product.upsert({
      where: {
        storeId_platformProductId: {
          storeId,
          platformProductId: data.platformProductId,
        },
      },
      create: {
        storeId,
        platformProductId: data.platformProductId,
        title: data.title,
        handle: data.handle,
        price: data.price,
        status: data.status,
        rawData: data.rawData,
      },
      update: {
        title: data.title,
        handle: data.handle,
        price: data.price,
        status: data.status,
        rawData: data.rawData,
      },
    });
  }
}
