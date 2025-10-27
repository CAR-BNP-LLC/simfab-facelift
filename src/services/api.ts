/**
 * API Service for SimFab Frontend
 * Connects to the Express backend at http://localhost:3001
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Generic API request handler with timeout
export async function apiRequest<T>(
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
      // Handle specific error types
      if (data.error?.code === 'RATE_LIMIT_EXCEEDED') {
        const retryAfter = data.error?.retryAfter || 60;
        const error = new Error(`Rate limit exceeded. Please try again in ${retryAfter} seconds.`);
        (error as any).code = 'RATE_LIMIT_EXCEEDED';
        (error as any).retryAfter = retryAfter;
        throw error;
      }
      
      if (data.error?.code === 'VALIDATION_ERROR') {
        const error = new Error(data.error?.message || 'Validation failed');
        (error as any).code = 'VALIDATION_ERROR';
        (error as any).details = data.error?.details;
        throw error;
      }
      
      if (response.status === 401) {
        const error = new Error('Authentication required. Please log in.');
        (error as any).code = 'UNAUTHORIZED';
        throw error;
      }
      
      if (response.status === 403) {
        const error = new Error('Access denied. You do not have permission to perform this action.');
        (error as any).code = 'FORBIDDEN';
        throw error;
      }
      
      if (response.status === 404) {
        const error = new Error('Resource not found.');
        (error as any).code = 'NOT_FOUND';
        throw error;
      }
      
      if (response.status >= 500) {
        const error = new Error('Server error. Please try again later.');
        (error as any).code = 'SERVER_ERROR';
        throw error;
      }
      
      // Generic error handling
      throw new Error(data.error?.message || data.error || 'Request failed');
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        const timeoutError = new Error('Request timeout - please check if backend is running');
        (timeoutError as any).code = 'TIMEOUT';
        throw timeoutError;
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
  role: string; // deprecated - use roles instead
  roles: Array<{ id: number; name: string }>;
  authorities: string[];
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
  type: 'text' | 'dropdown' | 'image' | 'boolean';
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
  // Discount fields
  is_on_sale?: boolean;
  sale_start_date?: string | null;
  sale_end_date?: string | null;
  sale_label?: string | null;
}

export interface ProductWithDetails extends Product {
  variations: {
    text: ProductVariation[];
    dropdown: ProductVariation[];
    image: ProductVariation[];
    boolean: ProductVariation[];
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
  variations?: Record<number, number>;
  addons?: Array<{
    addonId: number;
    optionId?: number;
  }>;
}

// ==========================================
// ADMIN VARIATION TYPES
// ==========================================

export interface CreateVariationDto {
  variation_type: 'text' | 'dropdown' | 'image' | 'boolean';
  name: string;
  description?: string;
  is_required?: boolean;
  sort_order?: number;
  options?: Array<{
    option_name: string;
    option_value: string;
    price_adjustment?: number;
    image_url?: string;
    is_default?: boolean;
  }>;
}

export interface UpdateVariationDto {
  variation_type?: 'text' | 'dropdown' | 'image' | 'boolean';
  name?: string;
  description?: string;
  is_required?: boolean;
  sort_order?: number;
}

export interface CreateOptionDto {
  option_name: string;
  option_value: string;
  price_adjustment?: number;
  image_url?: string;
  is_default?: boolean;
}

export interface UpdateOptionDto {
  option_name?: string;
  option_value?: string;
  price_adjustment?: number;
  image_url?: string;
  is_default?: boolean;
}

export interface VariationWithOptions {
  id: number;
  product_id: number;
  variation_type: 'text' | 'dropdown' | 'image' | 'boolean';
  name: string;
  description?: string;
  is_required: boolean;
  sort_order: number;
  created_at: string;
  options: Array<{
    id: number;
    variation_id: number;
    option_name: string;
    option_value: string;
    price_adjustment?: number;
    image_url?: string;
    is_default?: boolean;
    sort_order: number;
    created_at: string;
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
// PAYMENT API
// ==========================================

export const paymentAPI = {
  /**
   * Create PayPal payment
   */
  createPayment: (data: {
    orderId: number;
    amount: number;
    currency: string;
    returnUrl: string;
    cancelUrl: string;
  }) => {
    return apiRequest<{
      success: boolean;
      data: {
        payment: {
          paymentId: string;
          approvalUrl: string;
          status: string;
        };
      };
      message: string;
    }>('/api/payments/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Execute PayPal payment
   */
  executePayment: (data: {
    paymentId: string;
    payerId: string;
    orderId: number;
  }) => {
    return apiRequest<{
      success: boolean;
      data: {
        payment: {
          paymentId: string;
          status: string;
        };
      };
      message: string;
    }>('/api/payments/execute', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get payment status
   */
  getPaymentStatus: (paymentId: string) => {
    return apiRequest<{
      success: boolean;
      data: {
        payment: any;
      };
    }>(`/api/payments/${paymentId}`);
  }
};

// ==========================================
// ADMIN VARIATION API
// ==========================================

export const adminVariationsAPI = {
  /**
   * Get all variations for a product
   */
  getVariations: (productId: number) => {
    return apiRequest<{
      success: boolean;
      data: VariationWithOptions[];
    }>(`/api/admin/products/${productId}/variations`);
  },

  /**
   * Create a new variation
   */
  createVariation: (productId: number, data: CreateVariationDto) => {
    console.log('API: Creating variation for product', productId, 'with data:', data);
    return apiRequest<{
      success: boolean;
      data: VariationWithOptions;
    }>(`/api/admin/products/${productId}/variations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a variation
   */
  updateVariation: (productId: number, variationId: number, data: UpdateVariationDto) => {
    console.log('API: Updating variation', variationId, 'for product', productId, 'with data:', data);
    return apiRequest<{
      success: boolean;
      data: VariationWithOptions;
    }>(`/api/admin/products/${productId}/variations/${variationId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a variation
   */
  deleteVariation: (productId: number, variationId: number) => {
    return apiRequest<{
      success: boolean;
      data: null;
    }>(`/api/admin/products/${productId}/variations/${variationId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Reorder variations
   */
  reorderVariations: (productId: number, variationIds: number[]) => {
    return apiRequest<{
      success: boolean;
      data: null;
    }>(`/api/admin/products/${productId}/variations/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ variationIds }),
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

/**
 * Get error details for enhanced error handling
 */
export function getErrorDetails(error: unknown): {
  message: string;
  code?: string;
  retryAfter?: number;
  details?: any;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      code: (error as any).code,
      retryAfter: (error as any).retryAfter,
      details: (error as any).details
    };
  }
  return {
    message: typeof error === 'string' ? error : 'An unexpected error occurred'
  };
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const code = (error as any).code;
    return code === 'TIMEOUT' || code === 'SERVER_ERROR' || code === 'RATE_LIMIT_EXCEEDED';
  }
  return false;
}

/**
 * Get retry delay in milliseconds
 */
export function getRetryDelay(error: unknown): number {
  if (error instanceof Error) {
    const retryAfter = (error as any).retryAfter;
    if (retryAfter) {
      return retryAfter * 1000; // Convert seconds to milliseconds
    }
  }
  return 5000; // Default 5 second delay
}

// ============================================================================
// FAQ API
// ============================================================================

export interface ProductFAQ {
  id: number;
  product_id: number;
  question: string;
  answer: string;
  sort_order: number;
  is_active: string; // Database stores as '1' or '0'
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PRODUCT DESCRIPTION COMPONENT TYPES
// ============================================================================

export interface ProductDescriptionComponent {
  id: number;
  product_id: number;
  component_type: 'text' | 'image' | 'two_column' | 'three_column' | 'full_width_image';
  content: any; // Will be typed based on component_type
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TextBlockContent {
  heading?: string;
  headingSize?: 'xl' | '2xl' | '3xl' | '4xl';
  headingColor?: string;
  paragraph?: string;
  textColor?: string;
  alignment?: 'left' | 'center' | 'right';
  padding?: { top: number; bottom: number; left: number; right: number };
}

export interface ImageBlockContent {
  imageUrl: string;
  altText?: string;
  caption?: string;
  width?: 'small' | 'medium' | 'large' | 'full';
  alignment?: 'left' | 'center' | 'right';
  padding?: { top: number; bottom: number; left: number; right: number };
}

export interface TwoColumnContent {
  leftColumn: {
    type: 'text' | 'image';
    content: TextBlockContent | ImageBlockContent;
  };
  rightColumn: {
    type: 'text' | 'image';
    content: TextBlockContent | ImageBlockContent;
  };
  columnRatio?: '50-50' | '60-40' | '40-60';
  gap?: number;
  reverseOnMobile?: boolean;
  padding?: { top: number; bottom: number; left: number; right: number };
}

export interface ThreeColumnContent {
  columns: [
    { icon?: string; heading: string; text: string; iconColor?: string; textColor?: string },
    { icon?: string; heading: string; text: string; iconColor?: string; textColor?: string },
    { icon?: string; heading: string; text: string; iconColor?: string; textColor?: string }
  ];
  gap?: number;
  alignment?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  padding?: { top: number; bottom: number; left: number; right: number };
}

export interface FullWidthImageContent {
  imageUrl: string;
  altText?: string;
  caption?: string;
  height?: 'small' | 'medium' | 'large' | 'auto';
  padding?: { top: number; bottom: number; left: number; right: number };
}

export interface CreateFAQData {
  question: string;
  answer: string;
  sort_order?: number;
  is_active?: string; // '1' for active, '0' for inactive
}

export interface UpdateFAQData {
  question?: string;
  answer?: string;
  sort_order?: number;
  is_active?: string; // '1' for active, '0' for inactive
}

export const faqsAPI = {
  // Get all FAQs for a product (public)
  async getProductFAQs(productId: number): Promise<ProductFAQ[]> {
    const response = await apiRequest<{ success: boolean; data: ProductFAQ[] }>(
      `/api/products/${productId}/faqs`
    );
    return response.data || [];
  },

  // Create new FAQ (admin only)
  async createFAQ(productId: number, data: CreateFAQData): Promise<ProductFAQ> {
    const response = await apiRequest<{ success: boolean; data: ProductFAQ }>(
      `/api/products/${productId}/faqs`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  // Update FAQ (admin only)
  async updateFAQ(id: number, data: UpdateFAQData): Promise<ProductFAQ> {
    const response = await apiRequest<{ success: boolean; data: ProductFAQ }>(
      `/api/faqs/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  // Delete FAQ (admin only)
  async deleteFAQ(id: number): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/faqs/${id}`, {
      method: 'DELETE',
    });
  },

  // Reorder FAQs (admin only)
  async reorderFAQs(productId: number, faqIds: number[]): Promise<void> {
    await apiRequest<{ success: boolean }>('/api/faqs/reorder', {
      method: 'PUT',
      body: JSON.stringify({
        product_id: productId,
        faq_ids: faqIds,
      }),
    });
  },
};

// ============================================================================
// PRODUCT DESCRIPTION API
// ============================================================================

export const productDescriptionsAPI = {
  /**
   * Get description components for a product (public)
   */
  async getProductDescriptionComponents(productId: number): Promise<ProductDescriptionComponent[]> {
    const response = await apiRequest<{ success: boolean; data: ProductDescriptionComponent[] }>(
      `/api/products/${productId}/description-components`
    );
    return response.data || [];
  },

  /**
   * Get all description components for a product (admin)
   */
  async getAllProductDescriptionComponents(productId: number): Promise<ProductDescriptionComponent[]> {
    const response = await apiRequest<{ success: boolean; data: ProductDescriptionComponent[] }>(
      `/api/admin/products/${productId}/description-components`
    );
    return response.data || [];
  },

  /**
   * Create description component (admin)
   */
  async createDescriptionComponent(productId: number, data: any): Promise<ProductDescriptionComponent> {
    const response = await apiRequest<{ success: boolean; data: ProductDescriptionComponent }>(
      `/api/admin/products/${productId}/description-components`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  /**
   * Update description component (admin)
   */
  async updateDescriptionComponent(id: number, data: any): Promise<ProductDescriptionComponent> {
    const response = await apiRequest<{ success: boolean; data: ProductDescriptionComponent }>(
      `/api/admin/description-components/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  /**
   * Delete description component (admin)
   */
  async deleteDescriptionComponent(id: number): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/admin/description-components/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Reorder description components (admin)
   */
  async reorderDescriptionComponents(productId: number, componentIds: number[]): Promise<void> {
    await apiRequest<{ success: boolean }>(
      `/api/admin/products/${productId}/description-components/reorder`,
      {
        method: 'PUT',
        body: JSON.stringify({ componentIds }),
      }
    );
  },
};

// ==========================================
// RBAC API
// ==========================================

export interface Role {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  authorities?: Authority[];
}

export interface Authority {
  id: number;
  resource: string;
  action: string;
  description?: string;
  created_at: string;
}

export interface UserWithRoles {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  roles: Role[];
  authorities: string[];
}

export const rbacAPI = {
  // Roles
  async getRoles() {
    return apiRequest<{
      success: boolean;
      data: Role[];
    }>('/api/admin/rbac/roles');
  },

  async createRole(data: { name: string; description?: string; authorityIds?: number[] }) {
    return apiRequest<{
      success: boolean;
      data: Role;
      message: string;
    }>('/api/admin/rbac/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Authorities
  async getAuthorities() {
    return apiRequest<{
      success: boolean;
      data: Authority[];
    }>('/api/admin/rbac/authorities');
  },

  async createAuthority(data: { resource: string; action: string; description?: string }) {
    return apiRequest<{
      success: boolean;
      data: Authority;
      message: string;
    }>('/api/admin/rbac/authorities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Users with roles
  async getUsersWithRoles() {
    return apiRequest<{
      success: boolean;
      data: UserWithRoles[];
    }>('/api/admin/rbac/users');
  },

  async assignRoleToUser(userId: number, roleId: number) {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/api/admin/rbac/users/${userId}/roles`, {
      method: 'POST',
      body: JSON.stringify({ roleId }),
    });
  },

  async removeRoleFromUser(userId: number, roleId: number) {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/api/admin/rbac/users/${userId}/roles/${roleId}`, {
      method: 'DELETE',
    });
  },

  // Role authorities
  async assignAuthorityToRole(roleId: number, authorityId: number) {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/api/admin/rbac/roles/${roleId}/authorities`, {
      method: 'POST',
      body: JSON.stringify({ authorityId }),
    });
  },

  async removeAuthorityFromRole(roleId: number, authorityId: number) {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/api/admin/rbac/roles/${roleId}/authorities/${authorityId}`, {
      method: 'DELETE',
    });
  },
};

export default {
  auth: authAPI,
  products: productsAPI,
  cart: cartAPI,
  order: orderAPI,
  payment: paymentAPI,
  health: healthAPI,
  adminVariations: adminVariationsAPI,
  faqs: faqsAPI,
  productDescriptions: productDescriptionsAPI,
  rbac: rbacAPI,
};

