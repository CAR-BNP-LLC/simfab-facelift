/**
 * Google Tag Manager (GTM) Tracking Utility
 * Handles all GTM dataLayer events for Google Analytics 4 and other Google services
 */

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

const GTM_CONTAINER_ID = import.meta.env.VITE_GTM_CONTAINER_ID?.trim() || '';
const GA4_MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID?.trim() || '';

let isInitialized = false;

/**
 * Initialize dataLayer if it doesn't exist
 */
function ensureDataLayer(): void {
  if (!window.dataLayer) {
    window.dataLayer = [];
  }
}

/**
 * Initialize Google Tag Manager
 * Should be called once when the app loads
 * Injects GTM script into the page
 */
export function initGoogleTagManager(): void {
  // Only initialize if GTM Container ID is provided
  if (!GTM_CONTAINER_ID || GTM_CONTAINER_ID === 'GTM-XXXXXXX' || GTM_CONTAINER_ID === 'your_gtm_container_id_here') {
    if (import.meta.env.DEV) {
      console.log('GTM: Container ID not provided, skipping initialization');
    }
    return;
  }

  if (isInitialized) {
    return;
  }

  ensureDataLayer();

  // Inject GTM script into head
  const script = document.createElement('script');
  script.innerHTML = `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');
  `;
  document.head.appendChild(script);

  // Inject GTM noscript into body
  const noscript = document.createElement('noscript');
  noscript.innerHTML = `
    <iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}"
    height="0" width="0" style="display:none;visibility:hidden"></iframe>
  `;
  document.body.insertBefore(noscript, document.body.firstChild);

  isInitialized = true;

  if (import.meta.env.DEV) {
    console.log('GTM: Initialized with container ID:', GTM_CONTAINER_ID);
  }
}

/**
 * Initialize GTM on module load (if container ID is available)
 * Note: This runs immediately, but script injection happens in initGoogleTagManager()
 */
if (typeof window !== 'undefined') {
  // Don't auto-initialize - let main.tsx call it explicitly
  // This ensures proper initialization order
}

/**
 * Push data to GTM dataLayer
 */
export function pushToDataLayer(data: Record<string, any>): void {
  if (!isInitialized) {
    initGoogleTagManager();
  }

  ensureDataLayer();
  window.dataLayer.push(data);

  if (import.meta.env.DEV) {
    console.log('GTM: Pushed to dataLayer:', data);
  }
}

/**
 * Track a page view
 */
export function trackPageView(path: string, title?: string): void {
  pushToDataLayer({
    event: 'page_view',
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href
  });
}

/**
 * Track a custom event
 */
export function trackEvent(eventName: string, params?: Record<string, any>): void {
  pushToDataLayer({
    event: eventName,
    ...params
  });
}

/**
 * Format product data for GA4 e-commerce events
 */
export function formatProductData(product: {
  id: number | string;
  name: string;
  price?: number;
  category?: string | string[];
  brand?: string;
  sku?: string;
  slug?: string;
  quantity?: number;
}): {
  item_id: string;
  item_name: string;
  price?: number;
  item_category?: string;
  item_brand?: string;
  item_variant?: string;
  quantity?: number;
} {
  const item: any = {
    item_id: String(product.id),
    item_name: product.name
  };

  if (product.price !== undefined && product.price !== null) {
    item.price = product.price;
  }

  // Handle category - can be string or array
  if (product.category) {
    if (Array.isArray(product.category)) {
      // GA4 supports item_category, item_category2, item_category3, etc.
      product.category.forEach((cat, index) => {
        if (index === 0) {
          item.item_category = cat;
        } else if (index < 5) { // GA4 supports up to item_category5
          item[`item_category${index + 1}`] = cat;
        }
      });
    } else if (typeof product.category === 'string') {
      item.item_category = product.category;
    }
  }

  if (product.brand) {
    item.item_brand = product.brand;
  } else {
    item.item_brand = 'SimFab'; // Default brand
  }

  if (product.sku) {
    item.item_variant = product.sku;
  }

  if (product.quantity !== undefined) {
    item.quantity = product.quantity;
  }

  return item;
}

/**
 * Track view_item event (product detail page)
 */
export function trackViewItem(product: {
  id: number | string;
  name: string;
  price?: number;
  category?: string | string[];
  brand?: string;
  sku?: string;
  slug?: string;
  currency?: string;
  list_name?: string; // e.g., "Flight Sim Category"
  list_id?: string; // e.g., "flight-sim"
}): void {
  const item = formatProductData(product);

  pushToDataLayer({
    event: 'view_item',
    ecommerce: {
      currency: product.currency || 'USD',
      value: product.price || 0,
      items: [item]
    },
    ...(product.list_name && { item_list_name: product.list_name }),
    ...(product.list_id && { item_list_id: product.list_id })
  });
}

/**
 * Track add_to_cart event
 */
export function trackAddToCart(product: {
  id: number | string;
  name: string;
  price: number;
  category?: string | string[];
  brand?: string;
  sku?: string;
  quantity: number;
  currency?: string;
}): void {
  const item = formatProductData({
    ...product,
    quantity: product.quantity
  });

  pushToDataLayer({
    event: 'add_to_cart',
    ecommerce: {
      currency: product.currency || 'USD',
      value: (product.price || 0) * product.quantity,
      items: [item]
    }
  });
}

/**
 * Track remove_from_cart event
 */
export function trackRemoveFromCart(product: {
  id: number | string;
  name: string;
  price: number;
  category?: string | string[];
  brand?: string;
  sku?: string;
  quantity: number;
  currency?: string;
}): void {
  const item = formatProductData({
    ...product,
    quantity: product.quantity
  });

  pushToDataLayer({
    event: 'remove_from_cart',
    ecommerce: {
      currency: product.currency || 'USD',
      value: (product.price || 0) * product.quantity,
      items: [item]
    }
  });
}

/**
 * Track view_cart event
 */
export function trackViewCart(items: Array<{
  id: number | string;
  name: string;
  price: number;
  category?: string | string[];
  brand?: string;
  sku?: string;
  quantity: number;
}>, currency: string = 'USD'): void {
  const formattedItems = items.map(item => formatProductData(item));
  const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  pushToDataLayer({
    event: 'view_cart',
    ecommerce: {
      currency,
      value: totalValue,
      items: formattedItems
    }
  });
}

/**
 * Track begin_checkout event
 */
export function trackBeginCheckout(items: Array<{
  id: number | string;
  name: string;
  price: number;
  category?: string | string[];
  brand?: string;
  sku?: string;
  quantity: number;
}>, currency: string = 'USD', value?: number): void {
  const formattedItems = items.map(item => formatProductData(item));
  const calculatedValue = value !== undefined 
    ? value 
    : items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  pushToDataLayer({
    event: 'begin_checkout',
    ecommerce: {
      currency,
      value: calculatedValue,
      items: formattedItems
    }
  });
}

/**
 * Track add_payment_info event
 */
export function trackAddPaymentInfo(
  paymentType: string,
  items: Array<{
    id: number | string;
    name: string;
    price: number;
    category?: string | string[];
    brand?: string;
    sku?: string;
    quantity: number;
  }>,
  currency: string = 'USD',
  value?: number
): void {
  const formattedItems = items.map(item => formatProductData(item));
  const calculatedValue = value !== undefined 
    ? value 
    : items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  pushToDataLayer({
    event: 'add_payment_info',
    ecommerce: {
      currency,
      value: calculatedValue,
      payment_type: paymentType,
      items: formattedItems
    }
  });
}

/**
 * Track purchase event (order confirmation)
 */
export function trackPurchase(order: {
  transaction_id: string;
  value: number;
  currency: string;
  items: Array<{
    id: number | string;
    name: string;
    price: number;
    category?: string | string[];
    brand?: string;
    sku?: string;
    quantity: number;
  }>;
  shipping?: number;
  tax?: number;
  coupon?: string;
}): void {
  const formattedItems = order.items.map(item => formatProductData(item));

  pushToDataLayer({
    event: 'purchase',
    ecommerce: {
      transaction_id: order.transaction_id,
      value: order.value,
      currency: order.currency,
      shipping: order.shipping || 0,
      tax: order.tax || 0,
      ...(order.coupon && { coupon: order.coupon }),
      items: formattedItems
    }
  });
}

/**
 * Track add_to_wishlist event
 */
export function trackAddToWishlist(product: {
  id: number | string;
  name: string;
  price?: number;
  category?: string | string[];
  brand?: string;
  sku?: string;
  currency?: string;
}): void {
  const item = formatProductData(product);

  pushToDataLayer({
    event: 'add_to_wishlist',
    ecommerce: {
      currency: product.currency || 'USD',
      value: product.price || 0,
      items: [item]
    }
  });
}

/**
 * Track remove_from_wishlist event
 */
export function trackRemoveFromWishlist(product: {
  id: number | string;
  name: string;
  price?: number;
  category?: string | string[];
  brand?: string;
  sku?: string;
  currency?: string;
}): void {
  const item = formatProductData(product);

  pushToDataLayer({
    event: 'remove_from_wishlist',
    ecommerce: {
      currency: product.currency || 'USD',
      value: product.price || 0,
      items: [item]
    }
  });
}

/**
 * Track search event
 */
export function trackSearch(searchTerm: string): void {
  pushToDataLayer({
    event: 'search',
    search_term: searchTerm
  });
}

/**
 * Set user ID for GA4 user tracking
 */
export function setUserId(userId: string | number | null): void {
  if (userId) {
    pushToDataLayer({
      user_id: String(userId)
    });
  } else {
    // Clear user ID
    pushToDataLayer({
      user_id: null
    });
  }
}

