import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import {
  ECommerceAdapter,
  PaginatedResult,
  StandardCustomer,
  StandardOrder,
  StandardProduct,
  WebhookRegistrationResult,
} from './types.js';

export class ShopifyAdapter implements ECommerceAdapter {
  readonly platform = 'shopify' as const;
  private client: AxiosInstance;
  private storeDomain: string;
  private accessToken: string;
  private apiVersion = '2024-10';

  constructor(storeDomain: string, accessToken: string) {
    // Normalize domain: remove https:// and trailing slashes
    let cleanDomain = storeDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!cleanDomain.includes('.myshopify.com') && !cleanDomain.includes('.')) {
      cleanDomain = `${cleanDomain}.myshopify.com`;
    }
    this.storeDomain = cleanDomain;
    this.accessToken = accessToken;

    this.client = axios.create({
      baseURL: `https://${this.storeDomain}/admin/api/${this.apiVersion}/graphql.json`,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken,
      },
      timeout: 15000,
    });
  }

  private async graphql(query: string, variables: Record<string, any> = {}): Promise<any> {
    try {
      const response = await this.client.post('', { query, variables });
      if (response.data.errors && response.data.errors.length > 0) {
        throw new Error(response.data.errors.map((e: any) => e.message).join(', '));
      }
      return response.data.data;
    } catch (err: any) {
      const msg = err.response?.data?.errors || err.message;
      throw new Error(`Shopify API Error: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    }
  }

  private toGid(type: 'Customer' | 'Order' | 'Product', id: string): string {
    if (id.startsWith('gid://shopify/')) return id;
    return `gid://shopify/${type}/${id}`;
  }

  private extractId(gid: string): string {
    if (!gid) return '';
    const parts = gid.split('/');
    return parts[parts.length - 1];
  }

  async testConnection(): Promise<{ success: boolean; storeName?: string; error?: string }> {
    try {
      const query = `
        query {
          shop {
            name
            myshopifyDomain
            email
          }
        }
      `;
      const data = await this.graphql(query);
      return { success: true, storeName: data.shop.name };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async fetchCustomers(cursor?: string, limit = 50): Promise<PaginatedResult<StandardCustomer>> {
    const query = `
      query GetCustomers($first: Int!, $after: String) {
        customers(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              legacyResourceId
              firstName
              lastName
              email
              phone
              numberOfOrders
              amountSpent {
                amount
                currencyCode
              }
              defaultAddress {
                address1
                address2
                city
                province
                country
                zip
                phone
              }
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    const data = await this.graphql(query, { first: limit, after: cursor || null });
    const connection = data.customers;

    const items: StandardCustomer[] = connection.edges.map((edge: any) => {
      const node = edge.node;
      const numericId = node.legacyResourceId ? String(node.legacyResourceId) : this.extractId(node.id);
      return {
        platformCustomerId: numericId,
        email: node.email || null,
        firstName: node.firstName || null,
        lastName: node.lastName || null,
        phone: node.phone || null,
        ordersCount: Number(node.numberOfOrders || 0),
        totalSpent: parseFloat(node.amountSpent?.amount || '0'),
        currency: node.amountSpent?.currencyCode || 'USD',
        addresses: node.defaultAddress ? [node.defaultAddress] : [],
        rawData: node,
        platformCreatedAt: node.createdAt ? new Date(node.createdAt) : null,
        platformUpdatedAt: node.updatedAt ? new Date(node.updatedAt) : null,
      };
    });

    return {
      items,
      hasNextPage: connection.pageInfo.hasNextPage,
      nextCursor: connection.pageInfo.endCursor || undefined,
    };
  }

  async fetchCustomerById(platformCustomerId: string): Promise<StandardCustomer | null> {
    const gid = this.toGid('Customer', platformCustomerId);
    const query = `
      query GetCustomer($id: ID!) {
        customer(id: $id) {
          id
          legacyResourceId
          firstName
          lastName
          email
          phone
          numberOfOrders
          amountSpent {
            amount
            currencyCode
          }
          defaultAddress {
            address1
            address2
            city
            province
            country
            zip
            phone
          }
          createdAt
          updatedAt
        }
      }
    `;

    try {
      const data = await this.graphql(query, { id: gid });
      const node = data.customer;
      if (!node) return null;

      const numericId = node.legacyResourceId ? String(node.legacyResourceId) : this.extractId(node.id);
      return {
        platformCustomerId: numericId,
        email: node.email || null,
        firstName: node.firstName || null,
        lastName: node.lastName || null,
        phone: node.phone || null,
        ordersCount: Number(node.numberOfOrders || 0),
        totalSpent: parseFloat(node.amountSpent?.amount || '0'),
        currency: node.amountSpent?.currencyCode || 'USD',
        addresses: node.defaultAddress ? [node.defaultAddress] : [],
        rawData: node,
        platformCreatedAt: node.createdAt ? new Date(node.createdAt) : null,
        platformUpdatedAt: node.updatedAt ? new Date(node.updatedAt) : null,
      };
    } catch {
      return null;
    }
  }

  async fetchOrders(cursor?: string, limit = 50): Promise<PaginatedResult<StandardOrder>> {
    const query = `
      query GetOrders($first: Int!, $after: String) {
        orders(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              name
              legacyResourceId
              customer {
                id
                legacyResourceId
              }
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              displayFinancialStatus
              displayFulfillmentStatus
              lineItems(first: 20) {
                edges {
                  node {
                    title
                    quantity
                    originalUnitPriceSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                  }
                }
              }
              createdAt
            }
          }
        }
      }
    `;

    const data = await this.graphql(query, { first: limit, after: cursor || null });
    const connection = data.orders;

    const items: StandardOrder[] = connection.edges.map((edge: any) => {
      const node = edge.node;
      const numericId = node.legacyResourceId ? String(node.legacyResourceId) : this.extractId(node.id);
      const customerNumericId = node.customer
        ? (node.customer.legacyResourceId ? String(node.customer.legacyResourceId) : this.extractId(node.customer.id))
        : null;

      return {
        platformOrderId: numericId,
        platformCustomerId: customerNumericId,
        orderNumber: node.name || numericId,
        totalPrice: parseFloat(node.totalPriceSet?.shopMoney?.amount || '0'),
        currency: node.totalPriceSet?.shopMoney?.currencyCode || 'USD',
        financialStatus: node.displayFinancialStatus || null,
        fulfillmentStatus: node.displayFulfillmentStatus || null,
        lineItems: (node.lineItems?.edges || []).map((e: any) => ({
          title: e.node.title,
          quantity: e.node.quantity,
          price: e.node.originalUnitPriceSet?.shopMoney?.amount,
        })),
        rawData: node,
        platformCreatedAt: node.createdAt ? new Date(node.createdAt) : null,
      };
    });

    return {
      items,
      hasNextPage: connection.pageInfo.hasNextPage,
      nextCursor: connection.pageInfo.endCursor || undefined,
    };
  }

  async fetchOrderById(platformOrderId: string): Promise<StandardOrder | null> {
    const gid = this.toGid('Order', platformOrderId);
    const query = `
      query GetOrder($id: ID!) {
        order(id: $id) {
          id
          name
          legacyResourceId
          customer {
            id
            legacyResourceId
          }
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          displayFinancialStatus
          displayFulfillmentStatus
          lineItems(first: 20) {
            edges {
              node {
                title
                quantity
              }
            }
          }
          createdAt
        }
      }
    `;

    try {
      const data = await this.graphql(query, { id: gid });
      const node = data.order;
      if (!node) return null;

      const numericId = node.legacyResourceId ? String(node.legacyResourceId) : this.extractId(node.id);
      const customerNumericId = node.customer
        ? (node.customer.legacyResourceId ? String(node.customer.legacyResourceId) : this.extractId(node.customer.id))
        : null;

      return {
        platformOrderId: numericId,
        platformCustomerId: customerNumericId,
        orderNumber: node.name || numericId,
        totalPrice: parseFloat(node.totalPriceSet?.shopMoney?.amount || '0'),
        currency: node.totalPriceSet?.shopMoney?.currencyCode || 'USD',
        financialStatus: node.displayFinancialStatus || null,
        fulfillmentStatus: node.displayFulfillmentStatus || null,
        lineItems: (node.lineItems?.edges || []).map((e: any) => e.node),
        rawData: node,
        platformCreatedAt: node.createdAt ? new Date(node.createdAt) : null,
      };
    } catch {
      return null;
    }
  }

  async fetchProducts(cursor?: string, limit = 50): Promise<PaginatedResult<StandardProduct>> {
    const query = `
      query GetProducts($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              legacyResourceId
              title
              handle
              status
              priceRangeV2 {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    `;

    const data = await this.graphql(query, { first: limit, after: cursor || null });
    const connection = data.products;

    const items: StandardProduct[] = connection.edges.map((edge: any) => {
      const node = edge.node;
      const numericId = node.legacyResourceId ? String(node.legacyResourceId) : this.extractId(node.id);
      return {
        platformProductId: numericId,
        title: node.title,
        handle: node.handle || null,
        price: parseFloat(node.priceRangeV2?.minVariantPrice?.amount || '0'),
        status: node.status || null,
        rawData: node,
      };
    });

    return {
      items,
      hasNextPage: connection.pageInfo.hasNextPage,
      nextCursor: connection.pageInfo.endCursor || undefined,
    };
  }

  async fetchProductById(platformProductId: string): Promise<StandardProduct | null> {
    const gid = this.toGid('Product', platformProductId);
    const query = `
      query GetProduct($id: ID!) {
        product(id: $id) {
          id
          legacyResourceId
          title
          handle
          status
          priceRangeV2 {
            minVariantPrice {
              amount
            }
          }
        }
      }
    `;

    try {
      const data = await this.graphql(query, { id: gid });
      const node = data.product;
      if (!node) return null;

      const numericId = node.legacyResourceId ? String(node.legacyResourceId) : this.extractId(node.id);
      return {
        platformProductId: numericId,
        title: node.title,
        handle: node.handle || null,
        price: parseFloat(node.priceRangeV2?.minVariantPrice?.amount || '0'),
        status: node.status || null,
        rawData: node,
      };
    } catch {
      return null;
    }
  }

  async registerWebhooks(callbackBaseUrl: string, storeId: string): Promise<WebhookRegistrationResult[]> {
    const topics = [
      'CUSTOMERS_CREATE',
      'CUSTOMERS_UPDATE',
      'ORDERS_CREATE',
      'ORDERS_UPDATED',
      'PRODUCTS_CREATE',
      'PRODUCTS_UPDATE',
      'APP_UNINSTALLED',
    ];

    const callbackUrl = `${callbackBaseUrl.replace(/\/$/, '')}/api/webhooks/shopify/${storeId}`;
    const results: WebhookRegistrationResult[] = [];

    const mutation = `
      mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
        webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
          userErrors {
            field
            message
          }
          webhookSubscription {
            id
          }
        }
      }
    `;

    for (const topic of topics) {
      try {
        const response = await this.graphql(mutation, {
          topic,
          webhookSubscription: {
            callbackUrl,
            format: 'JSON',
          },
        });

        const userErrors = response.webhookSubscriptionCreate?.userErrors;
        if (userErrors && userErrors.length > 0) {
          // If address already taken or topic registered, treat as success or note it
          const msg = userErrors.map((e: any) => e.message).join(', ');
          results.push({ topic, success: msg.toLowerCase().includes('already'), error: msg });
        } else {
          results.push({
            topic,
            success: true,
            webhookId: response.webhookSubscriptionCreate?.webhookSubscription?.id,
          });
        }
      } catch (err: any) {
        results.push({ topic, success: false, error: err.message });
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
