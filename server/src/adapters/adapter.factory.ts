import { ECommerceAdapter } from './types.js';
import { ShopifyAdapter } from './shopify.adapter.js';
import { WooCommerceAdapter } from './woocommerce.adapter.js';

export interface StoreCredentials {
  platform: 'shopify' | 'woocommerce';
  storeDomain: string;
  accessToken?: string | null;
  apiKey?: string | null;
  apiSecret?: string | null;
  webhookSecret?: string | null;
}

export function createAdapterForStore(store: StoreCredentials): ECommerceAdapter {
  if (store.platform === 'shopify') {
    if (!store.accessToken) {
      throw new Error(`Shopify store ${store.storeDomain} has no access token configured.`);
    }
    return new ShopifyAdapter(store.storeDomain, store.accessToken);
  }

  if (store.platform === 'woocommerce') {
    if (!store.apiKey || !store.apiSecret) {
      throw new Error(`WooCommerce store ${store.storeDomain} has missing API key or secret.`);
    }
    return new WooCommerceAdapter(
      store.storeDomain,
      store.apiKey,
      store.apiSecret,
      store.webhookSecret || ''
    );
  }

  throw new Error(`Unsupported platform: ${(store as any).platform}`);
}
