const BASE_URL = '/api';

export interface AutoMateConfig {
  baseUrl: string;
  token: string;
}

export interface StoreConfig {
  platform: 'woocommerce' | 'shopify';
  storeUrl: string;
  storeDomain?: string;
  consumerKey?: string;
  consumerSecret?: string;
  accessToken?: string;
}

export const api = {
  async testAutoMateConnection(config: AutoMateConfig) {
    const res = await fetch(`${BASE_URL}/bridge/automate/test-connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-automate-base-url': config.baseUrl,
        'x-automate-token': config.token,
      },
      body: JSON.stringify({
        automateBaseUrl: config.baseUrl,
        automateToken: config.token,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to connect to AutoMate');
    return data;
  },

  async testStoreConnection(store: StoreConfig) {
    const endpoint = store.platform === 'shopify'
      ? `${BASE_URL}/bridge/shopify/test-connection`
      : `${BASE_URL}/bridge/woocommerce/test-connection`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeUrl: store.storeUrl,
        storeDomain: store.storeDomain || store.storeUrl,
        consumerKey: store.consumerKey,
        consumerSecret: store.consumerSecret,
        accessToken: store.accessToken,
        ignoreCert: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to connect to store');
    return data;
  },

  async syncProductsToAutoMate(store: StoreConfig, automate: AutoMateConfig) {
    const res = await fetch(`${BASE_URL}/bridge/sync/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-automate-base-url': automate.baseUrl,
        'x-automate-token': automate.token,
      },
      body: JSON.stringify({
        platform: store.platform,
        storeUrl: store.storeUrl,
        storeDomain: store.storeDomain || store.storeUrl,
        consumerKey: store.consumerKey,
        consumerSecret: store.consumerSecret,
        accessToken: store.accessToken,
        automateBaseUrl: automate.baseUrl,
        automateToken: automate.token,
        ignoreCert: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to sync products');
    return data;
  },

  async syncOrdersToAutoMate(store: StoreConfig, automate: AutoMateConfig) {
    const res = await fetch(`${BASE_URL}/bridge/sync/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-automate-base-url': automate.baseUrl,
        'x-automate-token': automate.token,
      },
      body: JSON.stringify({
        platform: store.platform,
        storeUrl: store.storeUrl,
        storeDomain: store.storeDomain || store.storeUrl,
        consumerKey: store.consumerKey,
        consumerSecret: store.consumerSecret,
        accessToken: store.accessToken,
        automateBaseUrl: automate.baseUrl,
        automateToken: automate.token,
        ignoreCert: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to sync orders');
    return data;
  },
};
