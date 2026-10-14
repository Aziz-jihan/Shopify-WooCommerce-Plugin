export interface StandardCustomer {
  platformCustomerId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  ordersCount: number;
  totalSpent: number;
  currency: string;
  addresses: any[];
  rawData: any;
  platformCreatedAt: Date | null;
  platformUpdatedAt: Date | null;
}

export interface StandardOrder {
  platformOrderId: string;
  platformCustomerId: string | null;
  orderNumber: string | null;
  totalPrice: number;
  currency: string;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  lineItems: any[];
  rawData: any;
  platformCreatedAt: Date | null;
}

export interface StandardProduct {
  platformProductId: string;
  title: string;
  handle: string | null;
  price: number;
  status: string | null;
  rawData: any;
}

export interface PaginatedResult<T> {
  items: T[];
  hasNextPage: boolean;
  nextCursor?: string | number;
}

export interface WebhookRegistrationResult {
  topic: string;
  success: boolean;
  webhookId?: string;
  error?: string;
}

export interface ECommerceAdapter {
  platform: 'shopify' | 'woocommerce';
  testConnection(): Promise<{ success: boolean; storeName?: string; error?: string }>;
  fetchCustomers(cursorOrPage?: string | number, limit?: number): Promise<PaginatedResult<StandardCustomer>>;
  fetchCustomerById(platformCustomerId: string): Promise<StandardCustomer | null>;
  fetchOrders(cursorOrPage?: string | number, limit?: number): Promise<PaginatedResult<StandardOrder>>;
  fetchOrderById(platformOrderId: string): Promise<StandardOrder | null>;
  fetchProducts(cursorOrPage?: string | number, limit?: number): Promise<PaginatedResult<StandardProduct>>;
  fetchProductById(platformProductId: string): Promise<StandardProduct | null>;
  registerWebhooks(callbackBaseUrl: string, storeId: string): Promise<WebhookRegistrationResult[]>;
  verifyWebhookSignature(rawBody: Buffer, signature: string, secret: string): boolean;
}
