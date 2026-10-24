import {
  AutoMateCreateWebOrderPayload,
  AutoMateOrderProductLine,
  AutoMateSyncProductPayload,
  AutoMateVariant,
} from './automate.client.js';

export class AutoMateTransformer {
  /**
   * Strip HTML tags from description texts
   */
  static stripHtml(html?: string): string {
    if (!html) return '';
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Normalizes mobile numbers to 01XXXXXXXXX for Bangladeshi numbers or keeps as cleaned text
   */
  static normalizePhoneNumber(phone?: string): string {
    if (!phone) return '01700000000';
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('+880')) {
      cleaned = cleaned.substring(4);
    } else if (cleaned.startsWith('880')) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.startsWith('01') && cleaned.length === 11) {
      return cleaned;
    }
    return phone.trim();
  }

  /**
   * Formats a single line address from address components
   */
  static formatSingleLineAddress(parts: Array<string | undefined | null>): string {
    return parts
      .filter((p) => p && typeof p === 'string' && p.trim().length > 0)
      .map((p) => p!.trim())
      .join(', ');
  }

  /**
   * Maps a WooCommerce Order payload (from REST API or webhook) to AutoMate's create-web-order payload
   */
  static transformWooCommerceOrder(wcOrder: any): AutoMateCreateWebOrderPayload {
    const billing = wcOrder.billing || {};
    const shipping = wcOrder.shipping || {};

    const fullName = [billing.first_name, billing.last_name].filter(Boolean).join(' ').trim() ||
      [shipping.first_name, shipping.last_name].filter(Boolean).join(' ').trim() ||
      'Website Customer';

    const phone = billing.phone || shipping.phone || wcOrder.phone || '';

    const addressParts = [
      shipping.address_1 || billing.address_1,
      shipping.address_2 || billing.address_2,
      shipping.city || billing.city,
      shipping.state || billing.state,
      shipping.postcode || billing.postcode,
      shipping.country || billing.country,
    ];
    let address = this.formatSingleLineAddress(addressParts);
    if (!address) {
      address = 'Dhaka, Bangladesh';
    }

    const isPaid =
      wcOrder.status === 'processing' ||
      wcOrder.status === 'completed' ||
      Boolean(wcOrder.date_paid) ||
      wcOrder.payment_method === 'bka' ||
      wcOrder.payment_method === 'nagad' ||
      wcOrder.payment_method === 'sslcommerz';

    const totalAmount = parseFloat(wcOrder.total || wcOrder.total_price || '0');

    const lines: AutoMateOrderProductLine[] = (wcOrder.line_items || []).map((item: any) => {
      let name = item.name || 'Product';
      if (item.meta_data && Array.isArray(item.meta_data)) {
        const variantOptions = item.meta_data
          .filter((m: any) => m.key && !m.key.startsWith('_'))
          .map((m: any) => m.value)
          .filter(Boolean);
        if (variantOptions.length > 0) {
          name = `${name} - ${variantOptions.join(' - ')}`;
        }
      }

      return {
        name: name.replace(/\s+/g, ' ').substring(0, 255),
        quantity: parseInt(String(item.quantity || 1), 10),
        sku: item.sku ? String(item.sku).substring(0, 255) : undefined,
        product_id: item.product_id ? String(item.product_id) : undefined,
        variant_id: item.variation_id && item.variation_id !== 0 ? String(item.variation_id) : undefined,
      };
    });

    return {
      order_id: String(wcOrder.id || wcOrder.number || Date.now()),
      name: fullName.substring(0, 200),
      number: this.normalizePhoneNumber(phone).substring(0, 64),
      address: address.substring(0, 1000),
      paid: isPaid,
      cod: isNaN(totalAmount) ? 0 : totalAmount,
      customerNote: wcOrder.customer_note ? String(wcOrder.customer_note).substring(0, 1500) : undefined,
      products: lines.length > 0 ? lines : [{ name: 'Store Item', quantity: 1 }],
    };
  }

  /**
   * Maps a WooCommerce Product payload to AutoMate's sync-products payload
   */
  static transformWooCommerceProduct(wcProduct: any, variations: any[] = []): AutoMateSyncProductPayload {
    const rawPrice = parseFloat(wcProduct.regular_price || wcProduct.price || '0');
    const rawSalePrice = parseFloat(wcProduct.sale_price || '0');

    const productPayload: AutoMateSyncProductPayload = {
      product_id: String(wcProduct.id),
      name: (wcProduct.name || 'Untitled Product').substring(0, 500),
      description: this.stripHtml(wcProduct.description || wcProduct.short_description || '').substring(0, 50000),
      price: isNaN(rawPrice) ? 0 : rawPrice,
      sale_price: isNaN(rawSalePrice) || rawSalePrice <= 0 ? undefined : rawSalePrice,
      sku: wcProduct.sku ? String(wcProduct.sku).substring(0, 255) : undefined,
      stock: wcProduct.stock_quantity !== null && wcProduct.stock_quantity !== undefined ? parseInt(String(wcProduct.stock_quantity), 10) : 0,
      status: wcProduct.status === 'publish' ? 'publish' : 'draft',
    };

    if (variations && variations.length > 0) {
      productPayload.variants = variations.map((v: any) => {
        const vPrice = parseFloat(v.regular_price || v.price || wcProduct.regular_price || wcProduct.price || '0');
        const vSalePrice = parseFloat(v.sale_price || '0');

        let variantName = v.name;
        if (!variantName && v.attributes && Array.isArray(v.attributes)) {
          const attrStr = v.attributes.map((a: any) => a.option).filter(Boolean).join(', ');
          variantName = `${wcProduct.name} - ${attrStr}`;
        }

        const variantObj: AutoMateVariant = {
          variant_id: String(v.id),
          name: (variantName || wcProduct.name).substring(0, 600),
          sku: v.sku ? String(v.sku).substring(0, 255) : undefined,
          price: isNaN(vPrice) ? 0 : vPrice,
          sale_price: isNaN(vSalePrice) || vSalePrice <= 0 ? undefined : vSalePrice,
          stock: v.stock_quantity !== null && v.stock_quantity !== undefined ? parseInt(String(v.stock_quantity), 10) : 0,
        };
        return variantObj;
      });
    }

    return productPayload;
  }

  /**
   * Maps a Shopify Order (from GraphQL/webhook) to AutoMate's create-web-order payload
   */
  static transformShopifyOrder(shopifyOrder: any): AutoMateCreateWebOrderPayload {
    const cust = shopifyOrder.customer || {};
    const addr = shopifyOrder.shipping_address || shopifyOrder.billing_address || shopifyOrder.defaultAddress || {};

    const fullName = [
      cust.first_name || cust.firstName,
      cust.last_name || cust.lastName,
    ].filter(Boolean).join(' ').trim() ||
      [addr.first_name, addr.last_name].filter(Boolean).join(' ').trim() ||
      'Shopify Customer';

    const phone = addr.phone || cust.phone || '';

    const addressParts = [
      addr.address1,
      addr.address2,
      addr.city,
      addr.province,
      addr.zip,
      addr.country,
    ];
    let address = this.formatSingleLineAddress(addressParts);
    if (!address) {
      address = 'Dhaka, Bangladesh';
    }

    const isPaid =
      shopifyOrder.financial_status === 'paid' ||
      shopifyOrder.displayFinancialStatus === 'PAID';

    const rawTotal = shopifyOrder.total_price || shopifyOrder.totalPriceSet?.shopMoney?.amount || '0';
    const totalAmount = parseFloat(String(rawTotal));

    const rawLines = shopifyOrder.line_items || shopifyOrder.lineItems?.edges?.map((e: any) => e.node) || [];
    const lines: AutoMateOrderProductLine[] = rawLines.map((item: any) => {
      return {
        name: (item.title || item.name || 'Shopify Product').substring(0, 255),
        quantity: parseInt(String(item.quantity || 1), 10),
        sku: item.sku ? String(item.sku).substring(0, 255) : undefined,
        product_id: item.product_id ? String(item.product_id) : undefined,
        variant_id: item.variant_id ? String(item.variant_id) : undefined,
      };
    });

    const orderId = String(shopifyOrder.id || shopifyOrder.name || Date.now()).replace('gid://shopify/Order/', '');

    return {
      order_id: orderId,
      name: fullName.substring(0, 200),
      number: this.normalizePhoneNumber(phone).substring(0, 64),
      address: address.substring(0, 1000),
      paid: isPaid,
      cod: isNaN(totalAmount) ? 0 : totalAmount,
      customerNote: shopifyOrder.note ? String(shopifyOrder.note).substring(0, 1500) : undefined,
      products: lines.length > 0 ? lines : [{ name: 'Store Item', quantity: 1 }],
    };
  }

  /**
   * Maps a Shopify Product (from GraphQL/webhook) to AutoMate's sync-products payload
   */
  static transformShopifyProduct(shopifyProduct: any): AutoMateSyncProductPayload {
    const rawVariants = shopifyProduct.variants || shopifyProduct.variants?.edges?.map((e: any) => e.node) || [];
    const firstVariant = rawVariants[0] || {};
    const basePrice = parseFloat(String(firstVariant.price || '0'));

    const productId = String(shopifyProduct.id).replace('gid://shopify/Product/', '');

    const payload: AutoMateSyncProductPayload = {
      product_id: productId,
      name: (shopifyProduct.title || 'Shopify Product').substring(0, 500),
      description: this.stripHtml(shopifyProduct.body_html || shopifyProduct.description || '').substring(0, 50000),
      price: isNaN(basePrice) ? 0 : basePrice,
      status: shopifyProduct.status === 'ACTIVE' || shopifyProduct.status === 'active' ? 'publish' : 'draft',
    };

    if (rawVariants.length > 0) {
      payload.variants = rawVariants.map((v: any) => {
        const vId = String(v.id).replace('gid://shopify/ProductVariant/', '');
        const vPrice = parseFloat(String(v.price || basePrice));
        const vCompareAt = parseFloat(String(v.compare_at_price || '0'));

        let regularPrice = vPrice;
        let salePrice: number | undefined = undefined;

        if (!isNaN(vCompareAt) && vCompareAt > vPrice) {
          regularPrice = vCompareAt;
          salePrice = vPrice;
        }

        const variantObj: AutoMateVariant = {
          variant_id: vId,
          name: (v.title && v.title !== 'Default Title' ? `${shopifyProduct.title} - ${v.title}` : shopifyProduct.title).substring(0, 600),
          sku: v.sku ? String(v.sku).substring(0, 255) : undefined,
          price: regularPrice,
          sale_price: salePrice,
          stock: v.inventory_quantity !== null && v.inventory_quantity !== undefined ? parseInt(String(v.inventory_quantity), 10) : 0,
        };
        return variantObj;
      });
    }

    return payload;
  }
}
