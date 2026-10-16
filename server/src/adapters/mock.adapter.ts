import {
  ECommerceAdapter,
  PaginatedResult,
  StandardCustomer,
  StandardOrder,
  StandardProduct,
  WebhookRegistrationResult,
} from './types.js';

export class MockAdapter implements ECommerceAdapter {
  readonly platform: 'shopify' | 'woocommerce';
  private storeDomain: string;

  constructor(platform: 'shopify' | 'woocommerce' = 'shopify', storeDomain = 'demo-store.myshopify.com') {
    this.platform = platform;
    this.storeDomain = storeDomain;
  }

  async testConnection(): Promise<{ success: boolean; storeName?: string; error?: string }> {
    return {
      success: true,
      storeName: this.platform === 'shopify' ? 'Demo Shopify Apparel Store' : 'Demo WooCommerce Electronics',
    };
  }

  async fetchCustomers(cursorOrPage?: string | number, limit = 50): Promise<PaginatedResult<StandardCustomer>> {
    const mockCustomers: StandardCustomer[] = [
      {
        platformCustomerId: 'cust_101',
        email: 'sarah.connor@example.com',
        firstName: 'Sarah',
        lastName: 'Connor',
        phone: '+1-555-0199',
        ordersCount: 4,
        totalSpent: 489.50,
        currency: 'USD',
        addresses: [
          {
            address1: '404 Resistance Way',
            city: 'Los Angeles',
            province: 'California',
            country: 'United States',
            zip: '90001',
          },
        ],
        rawData: { source: 'mock', tier: 'VIP' },
        platformCreatedAt: new Date(Date.now() - 30 * 86400000),
        platformUpdatedAt: new Date(),
      },
      {
        platformCustomerId: 'cust_102',
        email: 'bruce.wayne@waynecorp.com',
        firstName: 'Bruce',
        lastName: 'Wayne',
        phone: '+1-555-0100',
        ordersCount: 12,
        totalSpent: 4850.00,
        currency: 'USD',
        addresses: [
          {
            address1: '1007 Mountain Drive',
            city: 'Gotham',
            province: 'New Jersey',
            country: 'United States',
            zip: '07001',
          },
        ],
        rawData: { source: 'mock', tier: 'Enterprise' },
        platformCreatedAt: new Date(Date.now() - 60 * 86400000),
        platformUpdatedAt: new Date(),
      },
      {
        platformCustomerId: 'cust_103',
        email: 'tony.stark@starkindustries.com',
        firstName: 'Tony',
        lastName: 'Stark',
        phone: '+1-555-0188',
        ordersCount: 8,
        totalSpent: 3200.75,
        currency: 'USD',
        addresses: [
          {
            address1: '10880 Malibu Point',
            city: 'Malibu',
            province: 'California',
            country: 'United States',
            zip: '90265',
          },
        ],
        rawData: { source: 'mock' },
        platformCreatedAt: new Date(Date.now() - 15 * 86400000),
        platformUpdatedAt: new Date(),
      },
      {
        platformCustomerId: 'cust_104',
        email: 'peter.parker@dailybugle.com',
        firstName: 'Peter',
        lastName: 'Parker',
        phone: '+1-555-0144',
        ordersCount: 1,
        totalSpent: 45.00,
        currency: 'USD',
        addresses: [
          {
            address1: '20 Ingram Street',
            city: 'Forest Hills',
            province: 'New York',
            country: 'United States',
            zip: '11375',
          },
        ],
        rawData: { source: 'mock' },
        platformCreatedAt: new Date(Date.now() - 5 * 86400000),
        platformUpdatedAt: new Date(),
      },
    ];

    return {
      items: mockCustomers,
      hasNextPage: false,
    };
  }

  async fetchCustomerById(platformCustomerId: string): Promise<StandardCustomer | null> {
    const list = (await this.fetchCustomers()).items;
    const found = list.find((c) => c.platformCustomerId === platformCustomerId);
    if (found) return found;

    // Return dynamic mock customer if searched by unknown ID
    return {
      platformCustomerId,
      email: `customer_${platformCustomerId}@example.com`,
      firstName: 'Test',
      lastName: `User ${platformCustomerId}`,
      phone: '+1-555-0000',
      ordersCount: 1,
      totalSpent: 125.00,
      currency: 'USD',
      addresses: [],
      rawData: { dynamicMock: true },
      platformCreatedAt: new Date(),
      platformUpdatedAt: new Date(),
    };
  }

  async fetchOrders(cursorOrPage?: string | number, limit = 50): Promise<PaginatedResult<StandardOrder>> {
    const mockOrders: StandardOrder[] = [
      {
        platformOrderId: 'ord_1001',
        platformCustomerId: 'cust_101',
        orderNumber: '#1001',
        totalPrice: 199.50,
        currency: 'USD',
        financialStatus: 'paid',
        fulfillmentStatus: 'fulfilled',
        lineItems: [
          { title: 'Wireless Noise Canceling Headphones', quantity: 1, price: '199.50' },
        ],
        rawData: { mock: true },
        platformCreatedAt: new Date(Date.now() - 3 * 86400000),
      },
      {
        platformOrderId: 'ord_1002',
        platformCustomerId: 'cust_102',
        orderNumber: '#1002',
        totalPrice: 2450.00,
        currency: 'USD',
        financialStatus: 'paid',
        fulfillmentStatus: 'fulfilled',
        lineItems: [
          { title: 'Ultra High Definition OLED Monitor 48"', quantity: 2, price: '1225.00' },
        ],
        rawData: { mock: true },
        platformCreatedAt: new Date(Date.now() - 10 * 86400000),
      },
      {
        platformOrderId: 'ord_1003',
        platformCustomerId: 'cust_103',
        orderNumber: '#1003',
        totalPrice: 850.00,
        currency: 'USD',
        financialStatus: 'paid',
        fulfillmentStatus: 'unfulfilled',
        lineItems: [
          { title: 'Mechanical Keyboard Custom Edition', quantity: 1, price: '350.00' },
          { title: 'Carbon Fiber Ergonomic Desk Chair', quantity: 1, price: '500.00' },
        ],
        rawData: { mock: true },
        platformCreatedAt: new Date(Date.now() - 1 * 86400000),
      },
    ];

    return {
      items: mockOrders,
      hasNextPage: false,
    };
  }

  async fetchOrderById(platformOrderId: string): Promise<StandardOrder | null> {
    const list = (await this.fetchOrders()).items;
    const found = list.find((o) => o.platformOrderId === platformOrderId);
    if (found) return found;

    return {
      platformOrderId,
      platformCustomerId: 'cust_101',
      orderNumber: `#${platformOrderId}`,
      totalPrice: 99.99,
      currency: 'USD',
      financialStatus: 'paid',
      fulfillmentStatus: 'fulfilled',
      lineItems: [{ title: 'Simulated Webhook Order Item', quantity: 1, price: '99.99' }],
      rawData: { dynamicMock: true },
      platformCreatedAt: new Date(),
    };
  }

  async fetchProducts(cursorOrPage?: string | number, limit = 50): Promise<PaginatedResult<StandardProduct>> {
    const mockProducts: StandardProduct[] = [
      {
        platformProductId: 'prod_501',
        title: 'Wireless Noise Canceling Headphones',
        handle: 'wireless-noise-canceling-headphones',
        price: 199.50,
        status: 'active',
        rawData: { mock: true },
      },
      {
        platformProductId: 'prod_502',
        title: 'Ultra High Definition OLED Monitor 48"',
        handle: 'ultra-hd-oled-monitor-48',
        price: 1225.00,
        status: 'active',
        rawData: { mock: true },
      },
      {
        platformProductId: 'prod_503',
        title: 'Mechanical Keyboard Custom Edition',
        handle: 'mechanical-keyboard-custom',
        price: 350.00,
        status: 'active',
        rawData: { mock: true },
      },
      {
        platformProductId: 'prod_504',
        title: 'Carbon Fiber Ergonomic Desk Chair',
        handle: 'carbon-fiber-desk-chair',
        price: 500.00,
        status: 'active',
        rawData: { mock: true },
      },
    ];

    return {
      items: mockProducts,
      hasNextPage: false,
    };
  }

  async fetchProductById(platformProductId: string): Promise<StandardProduct | null> {
    const list = (await this.fetchProducts()).items;
    const found = list.find((p) => p.platformProductId === platformProductId);
    if (found) return found;

    return {
      platformProductId,
      title: `Simulated Product ${platformProductId}`,
      handle: `simulated-product-${platformProductId}`,
      price: 49.99,
      status: 'active',
      rawData: { dynamicMock: true },
    };
  }

  async registerWebhooks(callbackBaseUrl: string, storeId: string): Promise<WebhookRegistrationResult[]> {
    return [
      { topic: 'CUSTOMERS_CREATE', success: true, webhookId: 'mock_wh_1' },
      { topic: 'CUSTOMERS_UPDATE', success: true, webhookId: 'mock_wh_2' },
      { topic: 'ORDERS_CREATE', success: true, webhookId: 'mock_wh_3' },
      { topic: 'ORDERS_UPDATED', success: true, webhookId: 'mock_wh_4' },
      { topic: 'PRODUCTS_CREATE', success: true, webhookId: 'mock_wh_5' },
      { topic: 'PRODUCTS_UPDATE', success: true, webhookId: 'mock_wh_6' },
    ];
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string, secret: string): boolean {
    return true; // Always valid in mock / test mode
  }
}
