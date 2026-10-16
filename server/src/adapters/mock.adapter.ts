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
      storeName: this.platform === 'shopify' ? 'Banglar Fashion House (Shopify)' : 'Aarong Heritage Apparel (WooCommerce)',
    };
  }

  async fetchCustomers(cursorOrPage?: string | number, limit = 50): Promise<PaginatedResult<StandardCustomer>> {
    const mockCustomers: StandardCustomer[] = [
      {
        platformCustomerId: 'cust_101',
        email: 'abdur.rahman@example.com',
        firstName: 'Abdur',
        lastName: 'Rahman',
        phone: '+8801711223344',
        ordersCount: 5,
        totalSpent: 12500.00,
        currency: 'TK',
        addresses: [
          {
            address1: 'House 12, Road 5, Dhanmondi',
            city: 'Dhaka',
            province: 'Dhaka Division',
            country: 'Bangladesh',
            zip: '1205',
          },
        ],
        rawData: { source: 'mock', tier: 'Gold Customer' },
        platformCreatedAt: new Date(Date.now() - 30 * 86400000),
        platformUpdatedAt: new Date(),
      },
      {
        platformCustomerId: 'cust_102',
        email: 'nusrat.jahan@example.com',
        firstName: 'Nusrat',
        lastName: 'Jahan',
        phone: '+8801819876543',
        ordersCount: 8,
        totalSpent: 24800.00,
        currency: 'TK',
        addresses: [
          {
            address1: 'Holding 45, GEC Circle',
            city: 'Chittagong',
            province: 'Chittagong Division',
            country: 'Bangladesh',
            zip: '4000',
          },
        ],
        rawData: { source: 'mock', tier: 'VIP Customer' },
        platformCreatedAt: new Date(Date.now() - 60 * 86400000),
        platformUpdatedAt: new Date(),
      },
      {
        platformCustomerId: 'cust_103',
        email: 'tanvir.ahmed@example.com',
        firstName: 'Tanvir',
        lastName: 'Ahmed',
        phone: '+8801912345678',
        ordersCount: 3,
        totalSpent: 7200.00,
        currency: 'TK',
        addresses: [
          {
            address1: 'Uposhohor Block-B',
            city: 'Sylhet',
            province: 'Sylhet Division',
            country: 'Bangladesh',
            zip: '3100',
          },
        ],
        rawData: { source: 'mock' },
        platformCreatedAt: new Date(Date.now() - 15 * 86400000),
        platformUpdatedAt: new Date(),
      },
      {
        platformCustomerId: 'cust_104',
        email: 'sadia.islam@example.com',
        firstName: 'Sadia',
        lastName: 'Islam',
        phone: '+8801611002233',
        ordersCount: 2,
        totalSpent: 4500.00,
        currency: 'TK',
        addresses: [
          {
            address1: 'Sector 4, Uttara',
            city: 'Dhaka',
            province: 'Dhaka Division',
            country: 'Bangladesh',
            zip: '1230',
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

    return {
      platformCustomerId,
      email: `customer_${platformCustomerId}@example.com`,
      firstName: 'Kazi',
      lastName: `Nazrul ${platformCustomerId}`,
      phone: '+8801700000000',
      ordersCount: 1,
      totalSpent: 2500.00,
      currency: 'TK',
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
        orderNumber: '#ORD-1001',
        totalPrice: 4200.00,
        currency: 'TK',
        financialStatus: 'paid',
        fulfillmentStatus: 'fulfilled',
        lineItems: [
          { title: 'Premium Cotton Panjabi', quantity: 1, price: '2800.00' },
          { title: 'Silk Pajama', quantity: 1, price: '1400.00' },
        ],
        rawData: { mock: true },
        platformCreatedAt: new Date(Date.now() - 3 * 86400000),
      },
      {
        platformOrderId: 'ord_1002',
        platformCustomerId: 'cust_102',
        orderNumber: '#ORD-1002',
        totalPrice: 12500.00,
        currency: 'TK',
        financialStatus: 'paid',
        fulfillmentStatus: 'fulfilled',
        lineItems: [
          { title: 'Dhakai Jamdani Saree (Red & Zari Work)', quantity: 1, price: '12500.00' },
        ],
        rawData: { mock: true },
        platformCreatedAt: new Date(Date.now() - 10 * 86400000),
      },
      {
        platformOrderId: 'ord_1003',
        platformCustomerId: 'cust_103',
        orderNumber: '#ORD-1003',
        totalPrice: 3800.00,
        currency: 'TK',
        financialStatus: 'paid',
        fulfillmentStatus: 'in_transit',
        lineItems: [
          { title: 'Formal Cotton Shirt', quantity: 2, price: '1900.00' },
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
      totalPrice: 2200.00,
      currency: 'TK',
      financialStatus: 'paid',
      fulfillmentStatus: 'fulfilled',
      lineItems: [{ title: 'Katan Dupatta', quantity: 1, price: '2200.00' }],
      rawData: { dynamicMock: true },
      platformCreatedAt: new Date(),
    };
  }

  async fetchProducts(cursorOrPage?: string | number, limit = 50): Promise<PaginatedResult<StandardProduct>> {
    const mockProducts: StandardProduct[] = [
      {
        platformProductId: 'prod_501',
        title: 'Premium Cotton Panjabi',
        handle: 'premium-cotton-panjabi',
        price: 2800.00,
        status: 'active',
        rawData: { mock: true },
      },
      {
        platformProductId: 'prod_502',
        title: 'Dhakai Jamdani Saree',
        handle: 'dhakai-jamdani-saree',
        price: 12500.00,
        status: 'active',
        rawData: { mock: true },
      },
      {
        platformProductId: 'prod_503',
        title: 'Men Casual Slim Fit Shirt',
        handle: 'men-casual-slim-fit-shirt',
        price: 1850.00,
        status: 'active',
        rawData: { mock: true },
      },
      {
        platformProductId: 'prod_504',
        title: 'Designer Lawn Three Piece',
        handle: 'designer-lawn-three-piece',
        price: 4500.00,
        status: 'active',
        rawData: { mock: true },
      },
      {
        platformProductId: 'prod_505',
        title: 'Khadi Cotton Kurta Fotua',
        handle: 'khadi-cotton-kurta-fotua',
        price: 1200.00,
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
      title: `Apparel Item ${platformProductId}`,
      handle: `apparel-item-${platformProductId}`,
      price: 1950.00,
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
