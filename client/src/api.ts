const BASE_URL = '/api';
const API_KEY = (import.meta as any).env?.VITE_API_KEY || 'dev-secret-key-1234';

function getHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'X-API-Key': API_KEY,
    ...extra,
  };
}

export interface Store {
  id: string;
  platform: 'shopify' | 'woocommerce';
  storeDomain: string;
  storeName: string | null;
  syncStatus: 'idle' | 'in_progress' | 'completed' | 'failed';
  lastSyncedAt: string | null;
  createdAt: string;
  _count?: {
    customers: number;
    orders: number;
    products: number;
  };
}

export interface Customer {
  id: string;
  platformCustomerId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  ordersCount: number;
  totalSpent: string | number;
  currency: string;
  addresses: any[];
  platformCreatedAt: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  platformOrderId: string;
  orderNumber: string | null;
  totalPrice: string | number;
  currency: string;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  lineItems: any[];
  platformCreatedAt: string | null;
  customer?: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
}

export interface Product {
  id: string;
  platformProductId: string;
  title: string;
  handle: string | null;
  price: string | number;
  status: string | null;
  createdAt: string;
}

export interface WebhookEvent {
  id: string;
  platform: string;
  topic: string;
  status: 'pending' | 'processed' | 'failed';
  errorMessage: string | null;
  payload: any;
  createdAt: string;
  processedAt: string | null;
}

export const api = {
  async connectStore(payload: {
    platform: 'shopify' | 'woocommerce';
    storeDomain: string;
    accessToken?: string;
    apiKey?: string;
    apiSecret?: string;
    isMock?: boolean;
  }) {
    const res = await fetch(`${BASE_URL}/stores/connect`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to connect store');
    return data;
  },

  async listStores(): Promise<{ stores: Store[] }> {
    const res = await fetch(`${BASE_URL}/stores`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to list stores');
    return data;
  },

  async getStore(id: string): Promise<{ store: Store }> {
    const res = await fetch(`${BASE_URL}/stores/${id}`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch store');
    return data;
  },

  async triggerSync(id: string) {
    const res = await fetch(`${BASE_URL}/stores/${id}/sync`, {
      method: 'POST',
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to trigger sync');
    return data;
  },

  async getStoreCustomers(id: string, page = 1, search = '') {
    const params = new URLSearchParams({ page: String(page), search });
    const res = await fetch(`${BASE_URL}/stores/${id}/customers?${params}`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch customers');
    return data;
  },

  async getStoreOrders(id: string): Promise<{ orders: Order[] }> {
    const res = await fetch(`${BASE_URL}/stores/${id}/orders`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch orders');
    return data;
  },

  async getStoreProducts(id: string): Promise<{ products: Product[] }> {
    const res = await fetch(`${BASE_URL}/stores/${id}/products`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch products');
    return data;
  },

  async getWebhookLogs(id: string): Promise<{ events: WebhookEvent[] }> {
    const res = await fetch(`${BASE_URL}/stores/${id}/webhooks`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch webhooks');
    return data;
  },
};
