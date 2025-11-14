/**
 * Facebook Pixel (Meta Pixel) Tracking Utility
 * Handles all Facebook Pixel event tracking for e-commerce
 */

declare global {
  interface Window {
    fbq: (
      action: string,
      eventName: string,
      params?: Record<string, any>
    ) => void;
    _fbq: any;
  }
}

const PIXEL_ID = import.meta.env.VITE_FACEBOOK_PIXEL_ID;
let isInitialized = false;

/**
 * Hash a string using SHA-256
 * Facebook Pixel requires certain fields to be hashed for privacy
 */
async function hashSHA256(value: string): Promise<string> {
  if (!value) return '';
  
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(value.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error hashing value:', error);
    }
    return '';
  }
}

/**
 * Initialize Facebook Pixel
 * Should be called once when the app loads
 */
export function initFacebookPixel(): void {
  // Only initialize if Pixel ID is provided
  if (!PIXEL_ID || PIXEL_ID === 'your_pixel_id_here') {
    if (import.meta.env.DEV) {
      console.warn('Facebook Pixel ID not configured. Set VITE_FACEBOOK_PIXEL_ID in .env');
    }
    return;
  }

  // Check if fbq is available (loaded from index.html)
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    try {
      window.fbq('init', PIXEL_ID);
      isInitialized = true;
      
      if (import.meta.env.DEV) {
        console.log('Facebook Pixel initialized with ID:', PIXEL_ID);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error initializing Facebook Pixel:', error);
      }
    }
  } else {
    // If fbq is not available yet, wait a bit and try again
    setTimeout(() => {
      if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
        try {
          window.fbq('init', PIXEL_ID);
          isInitialized = true;
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Error initializing Facebook Pixel (retry):', error);
          }
        }
      }
    }, 100);
  }
}

/**
 * Set user data for advanced matching
 * This improves matching accuracy for logged-in users
 * Data is automatically hashed by Facebook Pixel
 */
export async function setUserData(userData: {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  externalId?: string;
}): Promise<void> {
  if (!isPixelReady()) return;

  try {
    // Hash sensitive data (email, phone, names) using SHA-256
    const hashedData: Record<string, string> = {};
    
    if (userData.email) {
      hashedData.em = await hashSHA256(userData.email);
    }
    if (userData.phone) {
      // Remove non-numeric characters for phone hashing
      const phoneDigits = userData.phone.replace(/\D/g, '');
      if (phoneDigits) {
        hashedData.ph = await hashSHA256(phoneDigits);
      }
    }
    if (userData.firstName) {
      hashedData.fn = await hashSHA256(userData.firstName);
    }
    if (userData.lastName) {
      hashedData.ln = await hashSHA256(userData.lastName);
    }
    
    // Add plain text location data (Facebook handles these as-is)
    if (userData.city) {
      hashedData.ct = userData.city;
    }
    if (userData.state) {
      hashedData.st = userData.state;
    }
    if (userData.zip) {
      hashedData.zp = userData.zip;
    }
    if (userData.country) {
      hashedData.country = userData.country;
    }
    if (userData.externalId) {
      hashedData.external_id = userData.externalId;
    }

    // Only set user data if we have at least one field
    if (Object.keys(hashedData).length > 0) {
      window.fbq('setUserData', hashedData);
      
      if (import.meta.env.DEV) {
        console.log('Facebook Pixel user data set:', Object.keys(hashedData));
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error setting Facebook Pixel user data:', error);
    }
  }
}

/**
 * Check if Pixel is ready to track events
 */
function isPixelReady(): boolean {
  return (
    isInitialized &&
    typeof window !== 'undefined' &&
    typeof window.fbq === 'function' &&
    PIXEL_ID &&
    PIXEL_ID !== 'your_pixel_id_here'
  );
}

/**
 * Track a page view
 */
export function trackPageView(): void {
  if (!isPixelReady()) return;

  try {
    window.fbq('track', 'PageView');
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error tracking PageView:', error);
    }
  }
}

/**
 * Track when a product is viewed
 */
export function trackViewContent(data: {
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
  value?: number;
  currency?: string;
  content_category?: string;
}): void {
  if (!isPixelReady()) return;

  try {
    window.fbq('track', 'ViewContent', {
      content_name: data.content_name,
      content_ids: data.content_ids,
      content_type: data.content_type || 'product',
      value: data.value,
      currency: data.currency || 'USD',
      content_category: data.content_category,
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error tracking ViewContent:', error);
    }
  }
}

/**
 * Track when an item is added to cart
 */
export function trackAddToCart(data: {
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
  value?: number;
  currency?: string;
  quantity?: number;
}): void {
  if (!isPixelReady()) return;

  try {
    window.fbq('track', 'AddToCart', {
      content_name: data.content_name,
      content_ids: data.content_ids,
      content_type: data.content_type || 'product',
      value: data.value,
      currency: data.currency || 'USD',
      quantity: data.quantity || 1,
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error tracking AddToCart:', error);
    }
  }
}

/**
 * Track when checkout is initiated
 */
export function trackInitiateCheckout(data: {
  value?: number;
  currency?: string;
  num_items?: number;
  content_ids?: string[];
  content_type?: string;
}): void {
  if (!isPixelReady()) return;

  try {
    window.fbq('track', 'InitiateCheckout', {
      value: data.value,
      currency: data.currency || 'USD',
      num_items: data.num_items,
      content_ids: data.content_ids,
      content_type: data.content_type || 'product',
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error tracking InitiateCheckout:', error);
    }
  }
}

/**
 * Track when payment information is added
 */
export function trackAddPaymentInfo(data: {
  value?: number;
  currency?: string;
  content_type?: string;
  content_ids?: string[];
}): void {
  if (!isPixelReady()) return;

  try {
    window.fbq('track', 'AddPaymentInfo', {
      value: data.value,
      currency: data.currency || 'USD',
      content_type: data.content_type || 'product',
      content_ids: data.content_ids,
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error tracking AddPaymentInfo:', error);
    }
  }
}

/**
 * Track a completed purchase
 */
export async function trackPurchase(data: {
  value: number;
  currency?: string;
  content_ids?: string[];
  content_type?: string;
  contents?: Array<{
    id: string;
    quantity: number;
    item_price?: number;
  }>;
  order_id?: string;
  // Advanced matching data from order
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  externalId?: string;
}): Promise<void> {
  if (!isPixelReady()) return;

  try {
    // Build event parameters
    const eventParams: Record<string, any> = {
      value: data.value,
      currency: data.currency || 'USD',
      content_ids: data.content_ids,
      content_type: data.content_type || 'product',
      contents: data.contents,
      order_id: data.order_id,
    };

    // Add advanced matching data if available (will be hashed by Facebook)
    const userData: Record<string, string> = {};
    
    if (data.email) {
      userData.em = await hashSHA256(data.email);
    }
    if (data.phone) {
      const phoneDigits = data.phone.replace(/\D/g, '');
      if (phoneDigits) {
        userData.ph = await hashSHA256(phoneDigits);
      }
    }
    if (data.firstName) {
      userData.fn = await hashSHA256(data.firstName);
    }
    if (data.lastName) {
      userData.ln = await hashSHA256(data.lastName);
    }
    if (data.city) {
      userData.ct = data.city;
    }
    if (data.state) {
      userData.st = data.state;
    }
    if (data.zip) {
      userData.zp = data.zip;
    }
    if (data.country) {
      userData.country = data.country;
    }
    if (data.externalId) {
      userData.external_id = data.externalId;
    }

    // Merge user data into event parameters
    Object.assign(eventParams, userData);

    window.fbq('track', 'Purchase', eventParams);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error tracking Purchase:', error);
    }
  }
}

/**
 * Track a search query
 */
export function trackSearch(data: {
  search_string?: string;
  content_type?: string;
  content_ids?: string[];
}): void {
  if (!isPixelReady()) return;

  try {
    window.fbq('track', 'Search', {
      search_string: data.search_string,
      content_type: data.content_type || 'product',
      content_ids: data.content_ids,
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error tracking Search:', error);
    }
  }
}

/**
 * Track when a category is viewed
 */
export function trackViewCategory(data: {
  content_name?: string;
  content_category?: string;
  content_type?: string;
}): void {
  if (!isPixelReady()) return;

  try {
    window.fbq('track', 'ViewCategory', {
      content_name: data.content_name,
      content_category: data.content_category,
      content_type: data.content_type || 'product',
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error tracking ViewCategory:', error);
    }
  }
}

/**
 * Track when an item is added to wishlist
 */
export function trackAddToWishlist(data: {
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
  value?: number;
  currency?: string;
}): void {
  if (!isPixelReady()) return;

  try {
    window.fbq('track', 'AddToWishlist', {
      content_name: data.content_name,
      content_ids: data.content_ids,
      content_type: data.content_type || 'product',
      value: data.value,
      currency: data.currency || 'USD',
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error tracking AddToWishlist:', error);
    }
  }
}

