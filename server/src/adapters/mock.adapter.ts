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
      storeName: this.platform === 'shopify' ? 'বাংলার ফ্যাশন হাউস (Shopify)' : 'ঐতিহ্য ক্লথিং স্টোর (WooCommerce)',
    };
  }

  async fetchCustomers(cursorOrPage?: string | number, limit = 50): Promise<PaginatedResult<StandardCustomer>> {
    const mockCustomers: StandardCustomer[] = [
      {
        platformCustomerId: 'cust_101',
        email: 'abdur.rahman@example.com',
        firstName: 'আব্দুর',
        lastName: 'রহমান',
        phone: '+8801711223344',
        ordersCount: 5,
        totalSpent: 12500.00,
        currency: 'TK',
        addresses: [
          {
            address1: 'বাড়ি নং ১২, রোড নং ৫, ধানমন্ডি',
            city: 'ঢাকা',
            province: 'ঢাকা বিভাগ',
            country: 'বাংলাদেশ',
            zip: '১২০৫',
          },
        ],
        rawData: { source: 'mock', tier: 'প্রিমিয়াম গ্রাহক' },
        platformCreatedAt: new Date(Date.now() - 30 * 86400000),
        platformUpdatedAt: new Date(),
      },
      {
        platformCustomerId: 'cust_102',
        email: 'nusrat.jahan@example.com',
        firstName: 'নুসরাত',
        lastName: 'জাহান',
        phone: '+8801819876543',
        ordersCount: 8,
        totalSpent: 24800.00,
        currency: 'TK',
        addresses: [
          {
            address1: 'হোল্ডিং ৪৫, জিইসি মোড়',
            city: 'চট্টগ্রাম',
            province: 'চট্টগ্রাম বিভাগ',
            country: 'বাংলাদেশ',
            zip: '৪০০০',
          },
        ],
        rawData: { source: 'mock', tier: 'ভিআইপি গ্রাহক' },
        platformCreatedAt: new Date(Date.now() - 60 * 86400000),
        platformUpdatedAt: new Date(),
      },
      {
        platformCustomerId: 'cust_103',
        email: 'tanvir.ahmed@example.com',
        firstName: 'তানভীর',
        lastName: 'আহমেদ',
        phone: '+8801912345678',
        ordersCount: 3,
        totalSpent: 7200.00,
        currency: 'TK',
        addresses: [
          {
            address1: 'উপশহর ব্লক-বি',
            city: 'সিলেট',
            province: 'সিলেট বিভাগ',
            country: 'বাংলাদেশ',
            zip: '৩১০০',
          },
        ],
        rawData: { source: 'mock' },
        platformCreatedAt: new Date(Date.now() - 15 * 86400000),
        platformUpdatedAt: new Date(),
      },
      {
        platformCustomerId: 'cust_104',
        email: 'sadia.islam@example.com',
        firstName: 'সাদিয়া',
        lastName: 'ইসলাম',
        phone: '+8801611002233',
        ordersCount: 2,
        totalSpent: 4500.00,
        currency: 'TK',
        addresses: [
          {
            address1: 'সেক্টর ৪, উত্তরা',
            city: 'ঢাকা',
            province: 'ঢাকা বিভাগ',
            country: 'বাংলাদেশ',
            zip: '১২৩০',
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
      firstName: 'নতুন',
      lastName: `গ্রাহক ${platformCustomerId}`,
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
        orderNumber: '#অর্ডার-১০০১',
        totalPrice: 4200.00,
        currency: 'TK',
        financialStatus: 'পরিশোধিত',
        fulfillmentStatus: 'ডেলিভারি সম্পন্ন',
        lineItems: [
          { title: 'প্রিমিয়াম সুতি পাঞ্জাবি', quantity: 1, price: '2800.00' },
          { title: 'সিল্ক পায়জামা', quantity: 1, price: '1400.00' },
        ],
        rawData: { mock: true },
        platformCreatedAt: new Date(Date.now() - 3 * 86400000),
      },
      {
        platformOrderId: 'ord_1002',
        platformCustomerId: 'cust_102',
        orderNumber: '#অর্ডার-১০০২',
        totalPrice: 12500.00,
        currency: 'TK',
        financialStatus: 'পরিশোধিত',
        fulfillmentStatus: 'ডেলিভারি সম্পন্ন',
        lineItems: [
          { title: 'জামদানি শাড়ি (লাল ও সোনালী কাজ)', quantity: 1, price: '12500.00' },
        ],
        rawData: { mock: true },
        platformCreatedAt: new Date(Date.now() - 10 * 86400000),
      },
      {
        platformOrderId: 'ord_1003',
        platformCustomerId: 'cust_103',
        orderNumber: '#অর্ডার-১০০৩',
        totalPrice: 3800.00,
        currency: 'TK',
        financialStatus: 'পরিশোধিত',
        fulfillmentStatus: 'প্রক্রিয়াধীন',
        lineItems: [
          { title: 'ফরমাল সুতি শার্ট', quantity: 2, price: '1900.00' },
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
      financialStatus: 'পরিশোধিত',
      fulfillmentStatus: 'ডেলিভারি সম্পন্ন',
      lineItems: [{ title: 'কাতান ওড়না', quantity: 1, price: '2200.00' }],
      rawData: { dynamicMock: true },
      platformCreatedAt: new Date(),
    };
  }

  async fetchProducts(cursorOrPage?: string | number, limit = 50): Promise<PaginatedResult<StandardProduct>> {
    const mockProducts: StandardProduct[] = [
      {
        platformProductId: 'prod_501',
        title: 'প্রিমিয়াম সুতি পাঞ্জাবি',
        handle: 'premium-cotton-panjabi',
        price: 2800.00,
        status: 'সক্রিয়',
        rawData: { mock: true },
      },
      {
        platformProductId: 'prod_502',
        title: 'ঢাকাই জামদানি শাড়ি',
        handle: 'dhakai-jamdani-saree',
        price: 12500.00,
        status: 'সক্রিয়',
        rawData: { mock: true },
      },
      {
        platformProductId: 'prod_503',
        title: 'ছেলেদের ক্যাজুয়াল শার্ট',
        handle: 'mens-casual-shirt',
        price: 1850.00,
        status: 'সক্রিয়',
        rawData: { mock: true },
      },
      {
        platformProductId: 'prod_504',
        title: 'ডিজাইনার লন থ্রি-পিস',
        handle: 'designer-lawn-three-piece',
        price: 4500.00,
        status: 'সক্রিয়',
        rawData: { mock: true },
      },
      {
        platformProductId: 'prod_505',
        title: 'খাদি সুতি ফতুয়া',
        handle: 'khadi-cotton-fotua',
        price: 1200.00,
        status: 'সক্রিয়',
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
      title: `পোশাক পণ্য ${platformProductId}`,
      handle: `apparel-product-${platformProductId}`,
      price: 1950.00,
      status: 'সক্রিয়',
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
