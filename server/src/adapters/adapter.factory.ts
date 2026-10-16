import { Store } from '@prisma/client';
import { ECommerceAdapter } from './types.js';
import { ShopifyAdapter } from './shopify.adapter.js';
import { WooCommerceAdapter } from './woocommerce.adapter.js';
import { MockAdapter } from './mock.adapter.js';

export function createAdapterForStore(store: Store): ECommerceAdapter {
  // If store is a demo/mock store for Postman testing
  if (
    store.accessToken === 'mock' ||
    store.apiKey === 'mock' ||
    store.storeDomain.includes('demo') ||
    store.storeDomain.includes('mock')
  ) {
    return new MockAdapter(
      store.platform === 'woocommerce' ? 'woocommerce' : 'shopify',
      store.storeDomain
    );
  }

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
