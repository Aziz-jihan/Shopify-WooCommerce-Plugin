import axios, { AxiosInstance } from 'axios';

export interface AutoMateErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface AutoMateTestConnectionResponse {
  ok: boolean;
  shop: string;
  store: string;
}

export interface AutoMateOrderProductLine {
  name: string;
  quantity: number;
  sku?: string;
  product_id?: string | number;
  variant_id?: string | number;
}

export interface AutoMateCreateWebOrderPayload {
  order_id?: string | number;
  name: string;
  number: string;
  address: string;
  paid: boolean;
  cod: number;
  customerNote?: string;
  products: AutoMateOrderProductLine[];
}

export interface AutoMateCreateWebOrderResponse {
  ok: boolean;
  orderId: string;
  invoiceId: string;
  duplicate: boolean;
  unmatched: Array<{ name: string; quantity: number }>;
}

export interface AutoMateVariant {
  variant_id: string | number;
  name?: string;
  sku?: string;
  price?: number;
  sale_price?: number;
  stock?: number;
}

export interface AutoMateSyncProductPayload {
  product_id: string | number;
  name: string;
  description?: string;
  price?: number;
  sale_price?: number;
  sku?: string;
  stock?: number;
  status?: string;
  variants?: AutoMateVariant[];
}

export interface AutoMateSyncProductResponse {
  ok: boolean;
  productId: string;
  variants: number;
  created: number;
  updated: number;
  warnings?: Array<{ code: string; message: string }>;
}

export class AutoMateClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    let cleanBaseUrl = baseUrl.trim().replace(/\/$/, '');
    if (!cleanBaseUrl.startsWith('http://') && !cleanBaseUrl.startsWith('https://')) {
      cleanBaseUrl = `https://${cleanBaseUrl}`;
    }
    this.baseUrl = cleanBaseUrl;
    this.token = token.trim();

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      timeout: 20000,
    });
  }

  async testConnection(): Promise<{ success: boolean; shop?: string; store?: string; error?: string }> {
    try {
      const response = await this.client.get<AutoMateTestConnectionResponse>('/test-connection');
      if (response.data && response.data.ok) {
        return {
          success: true,
          shop: response.data.shop,
          store: response.data.store,
        };
      }
      return { success: false, error: 'Unexpected response from AutoMate' };
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      const message = errorData?.message || err.message || 'Failed to connect to AutoMate';
      return { success: false, error: message };
    }
  }

  async createWebOrder(payload: AutoMateCreateWebOrderPayload): Promise<AutoMateCreateWebOrderResponse> {
    try {
      const response = await this.client.post<AutoMateCreateWebOrderResponse>('/create-web-order', payload);
      return response.data;
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      const message = errorData?.message || err.message || 'AutoMate order submission failed';
      const code = errorData?.code || 'UNKNOWN_ERROR';
      const error: any = new Error(`AutoMate [${code}]: ${message}`);
      error.code = code;
      error.details = errorData?.details;
      error.status = err.response?.status;
      throw error;
    }
  }

  async syncProduct(payload: AutoMateSyncProductPayload): Promise<AutoMateSyncProductResponse> {
    try {
      const response = await this.client.post<AutoMateSyncProductResponse>('/sync-products', payload);
      return response.data;
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      const message = errorData?.message || err.message || 'AutoMate product sync failed';
      const code = errorData?.code || 'UNKNOWN_ERROR';
      const error: any = new Error(`AutoMate [${code}]: ${message}`);
      error.code = code;
      error.details = errorData?.details;
      error.status = err.response?.status;
      throw error;
    }
  }
}
