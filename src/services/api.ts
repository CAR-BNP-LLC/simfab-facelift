/**
 * API Service for SimFab Frontend
 * Connects to the Express backend at http://localhost:3001
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Generic API request handler with timeout
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Important for cookies/sessions
  };

  try {
    // Add 10-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, { ...config, signal: controller.signal });
    clearTimeout(timeoutId);
    
    const data = await response.json();

    if (!response.ok) {
      // Handle API errors
      throw new Error(data.error?.message || data.error || 'Request failed');
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check if backend is running');
      }
      throw error;
    }
    throw new Error('Network error occurred');
  }
}

// ==========================================
// AUTHENTICATION API
// ==========================================

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
  subscribeNewsletter?: boolean;
}

export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  lastLogin?: string;
}

export const authAPI = {
  /**
   * Register a new user
   */
  async register(data: RegisterData) {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        user: User;
        verificationEmailSent: boolean;
      };
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Login user
   */
  async login(data: LoginData) {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        user: User;
        session: {
          expiresAt: string;
        };
      };
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Logout user
   */
  async logout() {
    return apiRequest<{
      success: boolean;
      message: string;
    }>('/api/auth/logout', {
      method: 'POST',
    });
  },

  /**
   * Get current user profile
   */
  async getProfile() {
    return apiRequest<{
      success: boolean;
      data: {
        user: User;
        addresses: any[];
        stats: {
          totalOrders: number;
          totalSpent: number;
          lastOrderDate?: string;
        };
      };
    }>('/api/auth/profile');
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string) {
    return apiRequest<{
      success: boolean;
      message: string;
    }>('/api/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, password: string, confirmPassword: string) {
    return apiRequest<{
      success: boolean;
      message: string;
    }>('/api/auth/password-reset/reset', {
      method: 'POST',
      body: JSON.stringify({ token, password, confirmPassword }),
    });
  },

  /**
   * Subscribe to newsletter
   */
  async subscribeNewsletter(email: string) {
    return apiRequest<{
      success: boolean;
      message: string;
    }>('/api/auth/newsletter/subscribe', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Unsubscribe from newsletter
   */
  async unsubscribeNewsletter(email: string, token?: string) {
    return apiRequest<{
      success: boolean;
      message: string;
    }>('/api/auth/newsletter/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ email, token }),
    });
  },
};

// ==========================================
// PRODUCTS API
// ==========================================

export interface ProductImage {
  id: number;
  image_url: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
  product_id: number;
  created_at: string;
}

export interface ProductColor {
  id: number;
  name: string;
  code: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
}

export interface VariationOption {
  id: number;
  name: string;
  value: string;
  priceAdjustment: number;
  imageUrl?: string;
  isDefault: boolean;
}

export interface ProductVariation {
  id: number;
  type: 'model' | 'dropdown';
  name: string;
  description?: string;
  isRequired: boolean;
  options: VariationOption[];
}

export interface AddonOption {
  id: number;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  isAvailable: boolean;
}

export interface ProductAddon {
  id: number;
  name: string;
  description?: string;
  price: {
    min?: number;
    max?: number;
  };
  isRequired: boolean;
  hasOptions: boolean;
  options: AddonOption[];
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  type: string;
  status: string;
  featured: boolean;
  price: {
    min?: number;
    max?: number;
    regular?: number;
    sale?: number;
    currency: string;
  };
  images: ProductImage[];
  colors?: ProductColor[];
  stock: {
    quantity: number;
    inStock: boolean;
    manageStock: boolean;
  };
  categories?: string[];
  tags?: string[];
  rating?: {
    average: number;
    count: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProductWithDetails extends Product {
  variations: {
    model: ProductVariation[];
    dropdown: ProductVariation[];
  };
  addons: ProductAddon[];
  faqs?: Array<{
    id: number;
    question: string;
    answer: string;
  }>;
  assemblyManuals?: Array<{
    id: number;
    name: string;
    fileUrl: string;
    thumbnailUrl?: string;
  }>;
}

export interface ProductConfiguration {
  colorId?: number;
  modelVariationId?: number;
  dropdownSelections?: Record<number, number>;
  addons?: Array<{
    addonId: number;
    optionId?: number;
  }>;
}

export interface PriceCalculation {
  basePrice: number;
  variationAdjustments: Array<{
    name: string;
    amount: number;
  }>;
  addonsTotal: number;
  subtotal: number;
  quantity: number;
  total: number;
  currency: string;
}

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
  sortBy?: 'name' | 'price' | 'created_at' | 'featured' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

export const productsAPI = {
  /**
   * Get all products with filtering and pagination
   */
  async getAll(params?: ProductQueryParams) {
    const queryString = params ? '?' + new URLSearchParams(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)])
    ).toString() : '';

    return apiRequest<{
      success: boolean;
      data: {
        products: Product[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrevious: boolean;
        };
        filters?: {
          categories: Array<{ id: string; name: string; count: number }>;
          priceRange: { min: number; max: number };
        };
      };
    }>(`/api/products${queryString}`);
  },

  /**
   * Get product by ID with full details
   */
  async getById(id: number) {
    return apiRequest<{
      success: boolean;
      data: ProductWithDetails;
    }>(`/api/products/${id}`);
  },

  /**
   * Get product by slug
   */
  async getBySlug(slug: string) {
    return apiRequest<{
      success: boolean;
      data: ProductWithDetails;
    }>(`/api/products/slug/${slug}`);
  },

  /**
   * Search products
   */
  async search(query: string, params?: { category?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams({ q: query });
    if (params?.category) searchParams.append('category', params.category);
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.limit) searchParams.append('limit', String(params.limit));

    return apiRequest<{
      success: boolean;
      data: {
        products: Product[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      };
    }>(`/api/products/search?${searchParams}`);
  },

  /**
   * Calculate price for configured product
   */
  async calculatePrice(productId: number, configuration: ProductConfiguration, quantity: number = 1) {
    return apiRequest<{
      success: boolean;
      data: {
        pricing: PriceCalculation;
        breakdown: {
          base: number;
          variations: number;
          addons: number;
        };
      };
    }>(`/api/products/${productId}/calculate-price`, {
      method: 'POST',
      body: JSON.stringify({ ...configuration, quantity }),
    });
  },

  /**
   * Get featured products
   */
  async getFeatured(limit: number = 6) {
    return apiRequest<{
      success: boolean;
      data: Product[];
    }>(`/api/products/featured?limit=${limit}`);
  },

  /**
   * Get featured products by category (for mega menu)
   */
  async getFeaturedProductsByCategory(category: string, limit: number = 6) {
    return apiRequest<{
      success: boolean;
      data: Product[];
    }>(`/api/products/categories/${category}/featured?limit=${limit}`);
  },

  /**
   * Get product categories
   */
  async getCategories() {
    return apiRequest<{
      success: boolean;
      data: Array<{
        id: string;
        name: string;
        slug: string;
        description: string;
        image: string;
        count: number;
      }>;
    }>('/api/products/categories');
  },

  /**
   * Get products by category
   */
  async getByCategory(slug: string, params?: ProductQueryParams) {
    const queryString = params ? '?' + new URLSearchParams(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)])
    ).toString() : '';

    return apiRequest<{
      success: boolean;
      data: {
        products: Product[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      };
    }>(`/api/products/categories/${slug}${queryString}`);
  },

  /**
   * Validate product configuration
   */
  async validateConfiguration(productId: number, configuration: ProductConfiguration) {
    return apiRequest<{
      success: boolean;
      data: {
        valid: boolean;
        errors: string[];
      };
    }>(`/api/products/${productId}/validate-configuration`, {
      method: 'POST',
      body: JSON.stringify(configuration),
    });
  },

  /**
   * Get price range for product
   */
  async getPriceRange(productId: number) {
    return apiRequest<{
      success: boolean;
      data: {
        min: number;
        max: number;
      };
    }>(`/api/products/${productId}/price-range`);
  },
};

// ==========================================
// HEALTH API
// ==========================================

export const healthAPI = {
  /**
   * Check server health
   */
  async check() {
    return apiRequest<{
      success: boolean;
      message: string;
      timestamp: string;
    }>('/health');
  },

  /**
   * Get API info
   */
  async getInfo() {
    return apiRequest<{
      success: boolean;
      message: string;
      version: string;
      endpoints: any;
    }>('/');
  },
};

// ==========================================
// CART API
// ==========================================

export const cartAPI = {
  /**
   * Get current cart
   */
  getCart: () => {
    return apiRequest<{
      success: boolean;
      data: any;
    }>('/api/cart');
  },

  /**
   * Add item to cart
   */
  addItem: (data: {
    productId: number;
    quantity: number;
    configuration?: any;
  }) => {
    return apiRequest<{
      success: boolean;
      data: any;
      message: string;
    }>('/api/cart/add', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update cart item quantity
   */
  updateItem: (itemId: number, quantity: number) => {
    return apiRequest<{
      success: boolean;
      data: any;
      message: string;
    }>(`/api/cart/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  },

  /**
   * Remove item from cart
   */
  removeItem: (itemId: number) => {
    return apiRequest<{
      success: boolean;
      data: any;
      message: string;
    }>(`/api/cart/items/${itemId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Clear entire cart
   */
  clearCart: () => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>('/api/cart/clear', {
      method: 'DELETE',
    });
  },

  /**
   * Apply coupon code
   */
  applyCoupon: (couponCode: string) => {
    return apiRequest<{
      success: boolean;
      data: any;
      message: string;
    }>('/api/cart/apply-coupon', {
      method: 'POST',
      body: JSON.stringify({ couponCode }),
    });
  },

  /**
   * Get cart item count
   */
  getItemCount: () => {
    return apiRequest<{
      success: boolean;
      data: { count: number };
    }>('/api/cart/count');
  },

  /**
   * Merge guest cart with user cart (after login)
   */
  mergeCart: () => {
    return apiRequest<{
      success: boolean;
      data: any;
      message: string;
    }>('/api/cart/merge', {
      method: 'POST',
    });
  },
};

// ==========================================
// ORDER API
// ==========================================

export const orderAPI = {
  /**
   * Create new order from cart
   */
  createOrder: (data: {
    billingAddress: any;
    shippingAddress: any;
    shippingMethodId?: string;
    paymentMethodId?: string;
    orderNotes?: string;
    subscribeNewsletter?: boolean;
  }) => {
    return apiRequest<{
      success: boolean;
      data: any;
      message: string;
    }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get user's orders
   */
  getUserOrders: (params?: { page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const queryString = queryParams.toString();
    const endpoint = `/api/orders${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<{
      success: boolean;
      data: {
        orders: any[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrevious: boolean;
        };
      };
    }>(endpoint);
  },

  /**
   * Get order details by order number
   */
  getOrder: (orderNumber: string) => {
    return apiRequest<{
      success: boolean;
      data: any;
    }>(`/api/orders/${orderNumber}`);
  },

  /**
   * Cancel order
   */
  cancelOrder: (orderNumber: string, data?: { reason?: string; comments?: string }) => {
    return apiRequest<{
      success: boolean;
      data: any;
      message: string;
    }>(`/api/orders/${orderNumber}/cancel`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Check if backend is available
 */
export async function checkBackendConnection(): Promise<boolean> {
  try {
    await healthAPI.check();
    return true;
  } catch (error) {
    console.error('Backend connection failed:', error);
    return false;
  }
}

/**
 * Format API error message
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

export default {
  auth: authAPI,
  products: productsAPI,
  cart: cartAPI,
  order: orderAPI,
  health: healthAPI,
};

