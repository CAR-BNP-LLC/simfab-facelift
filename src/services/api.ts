/**
 * API Service for SimFab Frontend
 * Connects to the Express backend at http://localhost:3001
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Global region getter - will be set by RegionContext
// Using a ref-based getter to avoid stale closure issues
let getCurrentRegion: (() => 'us' | 'eu') | null = null;

export function setRegionGetter(getter: () => 'us' | 'eu') {
  getCurrentRegion = getter;}

// Generic API request handler with timeout
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get region from global state (RegionContext) - call getter to get latest value
  const region = getCurrentRegion ? getCurrentRegion() : 'us';
  
  // Add region to query string
  const separator = endpoint.includes('?') ? '&' : '?';
  const finalUrl = `${url}${separator}region=${region}`;
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Region': region,
      ...options.headers,
    },
    credentials: 'include', // Important for cookies/sessions
  };
  
  try {
    // Add 10-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    
    const response = await fetch(finalUrl, { ...config, signal: controller.signal });
    clearTimeout(timeoutId);
    
    const data = await response.json();
    
    // Only log auth profile errors, not normal 401s
    if (endpoint.includes('/auth/profile') && !response.ok) {
      // Only log if it's not a normal 401 (user just not logged in)
      // Log if it's a 401 but we expected to be authenticated, or other errors
      if (response.status === 401) {
        // Check if we have cookies - if we do, this might be a session issue
        if (document.cookie) {
          console.warn('⚠️ getProfile returned 401 but cookies are present - possible session issue', {
            status: response.status,
            cookies: document.cookie
          });
        }
      } else {
        console.error('❌ getProfile error:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error
        });
      }
    }

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
        // Check if it's a migration required error
        if (data.error?.details?.code === 'MIGRATION_REQUIRED') {
          const error = new Error(
            data.error?.message || 
            `Database migration required. Please run migration ${data.error?.details?.migration || '036'} to create the required table.`
          );
          (error as any).code = 'MIGRATION_REQUIRED';
          (error as any).migration = data.error?.details?.migration;
          throw error;
        }
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
  backorders_allowed?: boolean;
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
  // Product note
  note?: string | null;
}

export interface ProductWithDetails extends Product {
  variations: {
    text: ProductVariation[];
    dropdown: ProductVariation[];
    image: ProductVariation[];
    boolean: ProductVariation[];
  };
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
  bundleItems?: {
    selectedOptional?: number[]; // Array of optional bundle item IDs
    configurations?: Record<number, any>; // bundleItemId -> { variationId: optionId }
  };
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
  tracks_stock?: boolean;
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
  tracks_stock?: boolean;
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

// CSV Import/Export Types
export interface ImportResult {
  success: boolean;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{
    row: number;
    sku?: string;
    field?: string;
    message: string;
    severity: 'critical' | 'warning';
  }>;
  warnings: Array<{
    row: number;
    sku?: string;
    message: string;
  }>;
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

  /**
   * Import products from CSV
   */
  async importCSV(file: File, mode: 'create' | 'update' | 'skip_duplicates' = 'create', dryRun: boolean = false) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);
    if (dryRun) {
      formData.append('dry_run', 'true');
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/products/import`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Import failed');
    }

    return response.json() as Promise<{
      success: boolean;
      data: ImportResult;
      message: string;
    }>;
  },

  /**
   * Validate CSV without importing
   */
  async validateCSV(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/admin/products/import/validate`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Validation failed');
    }

    return response.json() as Promise<{
      success: boolean;
      data: ImportResult;
      message: string;
    }>;
  },

  /**
   * Export products to CSV
   */
  async exportCSV(options?: { status?: string; category?: string; region?: 'us' | 'eu' }) {
    const queryParams = new URLSearchParams();
    if (options?.status) queryParams.append('status', options.status);
    if (options?.category) queryParams.append('category', options.category);
    if (options?.region) queryParams.append('region', options.region);

    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/api/admin/products/export${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Export failed');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `products-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

    return { success: true };
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
    packageSize?: 'S' | 'M' | 'L';
    shippingAmount?: number;
    taxAmount?: number;
    shippingMethodData?: any;
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

// ==========================================
// PAGE PRODUCTS API
// ==========================================

export interface PageProduct {
  id: number;
  page_route: string;
  page_section: string;
  product_id: number | null;
  category_id: string | null;
  display_order: number;
  is_active: boolean;
  display_type: 'products' | 'category';
  max_items: number;
  created_at: string;
  updated_at: string;
  product?: {
    id: number;
    name: string;
    slug: string;
    price_min: number | null;
    price_max: number | null;
    regular_price: number | null;
    sale_price: number | null;
    images: ProductImage[];
    status: string;
    short_description?: string | null;
  };
}

export interface PageConfiguration {
  pageRoute: string;
  pageName: string;
  sections: Array<{
    sectionKey: string;
    sectionName: string;
    productCount: number;
    displayType: 'products' | 'category';
    categoryId?: string | null;
    maxItems?: number;
  }>;
}

export interface PageSectionProducts {
  pageRoute: string;
  section: string;
  products: PageProduct[];
  displayType: 'products' | 'category';
  categoryId?: string | null;
  maxItems?: number;
}

export interface CreatePageProductDto {
  page_route: string;
  page_section: string;
  product_id: number;
  display_order?: number;
  is_active?: boolean;
}

export interface BulkPageProductDto {
  page_route: string;
  page_section: string;
  products: Array<{
    product_id: number;
    display_order: number;
    is_active: boolean;
  }>;
}

export interface SetCategoryDto {
  page_route: string;
  page_section: string;
  category_id: string;
  max_items?: number;
}

export const pageProductsAPI = {
  /**
   * Get all page configurations
   */
  async getAllPagesConfig() {
    return apiRequest<{
      success: boolean;
      data: PageConfiguration[];
    }>('/api/admin/page-products');
  },

  /**
   * Get products for a specific page section (Admin - includes inactive)
   */
  async getPageSectionProducts(pageRoute: string, section: string, includeInactive: boolean = false) {
    const query = includeInactive ? '?includeInactive=true' : '';
    return apiRequest<{
      success: boolean;
      data: PageSectionProducts;
    }>(`/api/admin/page-products/${encodeURIComponent(pageRoute)}/${encodeURIComponent(section)}${query}`);
  },

  /**
   * Add product to page section
   */
  async addProductToSection(dto: CreatePageProductDto) {
    return apiRequest<{
      success: boolean;
      data: PageProduct;
    }>('/api/admin/page-products', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  /**
   * Update page product
   */
  async updatePageProduct(id: number, updates: { display_order?: number; is_active?: boolean }) {
    return apiRequest<{
      success: boolean;
      data: PageProduct;
    }>(`/api/admin/page-products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Remove product from page section
   */
  async removeProductFromSection(id: number) {
    return apiRequest<{
      success: boolean;
      data: { message: string };
    }>(`/api/admin/page-products/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Bulk update page products
   */
  async bulkUpdatePageProducts(dto: BulkPageProductDto) {
    return apiRequest<{
      success: boolean;
      data: PageProduct[];
    }>('/api/admin/page-products/bulk', {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  },

  /**
   * Set category for page section
   */
  async setCategoryForSection(dto: SetCategoryDto) {
    return apiRequest<{
      success: boolean;
      data: PageProduct;
    }>('/api/admin/page-products/category', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  /**
   * Get public page products (for frontend)
   */
  async getPublicPageProducts(pageRoute: string, section: string) {
    return apiRequest<{
      success: boolean;
      data: PageSectionProducts;
    }>(`/api/page-products/${encodeURIComponent(pageRoute)}/${encodeURIComponent(section)}`);
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
  pageProducts: pageProductsAPI,
};

// ==========================================
// WISHLIST API
// ==========================================

export interface WishlistItem {
  id: number;
  product_id: number;
  notify_on_sale: boolean;
  notify_on_stock: boolean;
  created_at: string;
  product: any; // Product type from your types
}

// ==========================================
// SHIPPING API
// ==========================================

export interface ShippingMethod {
  id: string;
  name: string;
  carrier: string;
  serviceCode: string;
  cost: number;
  estimatedDays: {
    min: number;
    max: number;
  };
  description: string;
  requiresManualQuote?: boolean;
  fedexRateData?: {
    listRate: number;
    negotiatedRate?: number;
    hasNegotiatedRate: boolean;
    discountPercent?: number;
  };
}

export const shippingAPI = {
  /**
   * Calculate shipping rates for given address and package
   */
  calculateShipping: (data: {
    shippingAddress: {
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    packageSize?: 'S' | 'M' | 'L';
    orderTotal?: number;
    cartItems?: Array<{
      productId: number;
      quantity: number;
      unitPrice: number;
    }>;
  }) => {
    return apiRequest<{
      success: boolean;
      data: {
        shippingMethods: ShippingMethod[];
        calculations?: any[];
      };
    }>('/api/shipping/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Request shipping quote for international shipping
   */
  requestQuote: (data: {
    shippingAddress: {
      firstName: string;
      lastName: string;
      email: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state?: string;
      postalCode: string;
      country: string;
      phone?: string;
    };
    packageSize: 'S' | 'M' | 'L';
    cartItems: Array<{
      productId: number;
      productName: string;
      quantity: number;
      unitPrice: number;
      productImage?: string;
    }>;
  }) => {
    return apiRequest<{
      success: boolean;
      data: {
        quote: any;
        message: string;
      };
    }>('/api/shipping/request-quote', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export const wishlistAPI = {
  /**
   * Get user's wishlist
   */
  async getWishlist() {
    return apiRequest<{
      success: boolean;
      data: {
        items: WishlistItem[];
        count: number;
      };
    }>('/api/wishlist');
  },

  /**
   * Add product to wishlist
   */
  async addToWishlist(
    productId: number,
    preferences?: {
      notifyOnSale?: boolean;
      notifyOnStock?: boolean;
    }
  ) {
    return apiRequest<{
      success: boolean;
      data: {
        wishlist: WishlistItem;
        message: string;
      };
    }>('/api/wishlist', {
      method: 'POST',
      body: JSON.stringify({
        productId,
        notifyOnSale: preferences?.notifyOnSale,
        notifyOnStock: preferences?.notifyOnStock,
      }),
    });
  },

  /**
   * Remove product from wishlist
   */
  async removeFromWishlist(productId: number) {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/api/wishlist/${productId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Update notification preferences
   */
  async updatePreferences(
    productId: number,
    preferences: { notifyOnSale?: boolean; notifyOnStock?: boolean }
  ) {
    return apiRequest<{
      success: boolean;
      data: {
        wishlist: WishlistItem;
      };
    }>(`/api/wishlist/${productId}/preferences`, {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  },

  /**
   * Get wishlist count
   */
  async getCount() {
    return apiRequest<{
      success: boolean;
      data: {
        count: number;
      };
    }>('/api/wishlist/count');
  },

  /**
   * Check if product is wishlisted
   */
  async checkWishlist(productId: number) {
    return apiRequest<{
      success: boolean;
      data: {
        isWishlisted: boolean;
        wishlistId?: number;
      };
    }>(`/api/wishlist/${productId}/check`);
  },

  /**
   * Bulk check wishlist status for multiple products
   */
  async bulkCheck(productIds: number[]) {
    return apiRequest<{
      success: boolean;
      data: Record<string, boolean>;
    }>(`/api/wishlist/bulk-check?productIds=${productIds.join(',')}`);
  },
};

// ==========================================
// REGION SETTINGS API
// ==========================================

export const regionSettingsAPI = {
  /**
   * Get public settings for a region (no auth required)
   */
  async getPublicSettings(region: 'us' | 'eu') {
    return apiRequest<{
      success: boolean;
      data: {
        region: 'us' | 'eu';
        settings: Record<string, any>;
      };
    }>(`/api/admin/settings/regions/${region}/public`);
  },

  /**
   * Get contact information for a region
   */
  async getContactInfo(region: 'us' | 'eu') {
    return apiRequest<{
      success: boolean;
      data: {
        email: string;
        phone: string;
        phone_display: string;
      };
    }>(`/api/settings/${region}/contact`);
  },

  /**
   * Get all settings for a region (admin only)
   */
  async getSettings(region: 'us' | 'eu') {
    return apiRequest<{
      success: boolean;
      data: {
        region: 'us' | 'eu';
        settings: Record<string, any>;
      };
    }>(`/api/admin/settings/regions/${region}`, {
      credentials: 'include',
    });
  },

  /**
   * Update settings for a region (admin only)
   */
  async updateSettings(region: 'us' | 'eu', settings: Record<string, any>) {
    return apiRequest<{
      success: boolean;
      data: {
        message: string;
        region: 'us' | 'eu';
      };
    }>(`/api/admin/settings/regions/${region}`, {
      method: 'PUT',
      body: JSON.stringify({ settings }),
      credentials: 'include',
    });
  },

  /**
   * Update a single setting (admin only)
   */
  async updateSetting(region: 'us' | 'eu', key: string, value: any) {
    return apiRequest<{
      success: boolean;
      data: {
        message: string;
        region: 'us' | 'eu';
        key: string;
      };
    }>(`/api/admin/settings/regions/${region}/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
      credentials: 'include',
    });
  },
};

// ============================================================================
// SITE NOTICE API
// ============================================================================

export interface SiteNotice {
  id: number;
  message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// MARKETING CAMPAIGNS API
// ============================================================================

export interface MarketingCampaign {
  id: number;
  name: string;
  subject: string;
  content: string;
  status: 'draft' | 'sending' | 'sent' | 'cancelled';
  sent_count: number;
  created_by?: number;
  created_at: string;
  sent_at?: string;
  updated_at: string;
}

export interface CampaignStats {
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_unsubscribed: number;
  open_rate: number;
  click_rate: number;
  unsubscribe_rate: number;
}

export const marketingCampaignAPI = {
  /**
   * List all marketing campaigns
   */
  async listCampaigns(filters?: { page?: number; limit?: number; status?: string }) {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.status) params.append('status', filters.status);

    return apiRequest<{
      success: boolean;
      data: {
        campaigns: MarketingCampaign[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      };
    }>(`/api/admin/marketing-campaigns?${params.toString()}`, {
      method: 'GET',
      credentials: 'include',
    });
  },

  /**
   * Get single campaign
   */
  async getCampaign(id: number) {
    return apiRequest<{
      success: boolean;
      data: MarketingCampaign;
    }>(`/api/admin/marketing-campaigns/${id}`, {
      method: 'GET',
      credentials: 'include',
    });
  },

  /**
   * Create new campaign
   */
  async createCampaign(data: { name: string; subject: string; content: string }) {
    return apiRequest<{
      success: boolean;
      data: MarketingCampaign;
      message: string;
    }>('/api/admin/marketing-campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
      credentials: 'include',
    });
  },

  /**
   * Update campaign
   */
  async updateCampaign(id: number, data: { name?: string; subject?: string; content?: string; status?: string }) {
    return apiRequest<{
      success: boolean;
      data: MarketingCampaign;
      message: string;
    }>(`/api/admin/marketing-campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      credentials: 'include',
    });
  },

  /**
   * Send campaign to all eligible users
   */
  async sendCampaign(id: number) {
    return apiRequest<{
      success: boolean;
      data: {
        campaign_id: number;
        total_recipients: number;
        sent_count: number;
        error_count: number;
      };
      message: string;
    }>(`/api/admin/marketing-campaigns/${id}/send`, {
      method: 'POST',
      credentials: 'include',
    });
  },

  /**
   * Get campaign statistics
   */
  async getCampaignStats(id: number) {
    return apiRequest<{
      success: boolean;
      data: {
        campaign: MarketingCampaign;
        stats: CampaignStats;
      };
    }>(`/api/admin/marketing-campaigns/${id}/stats`, {
      method: 'GET',
      credentials: 'include',
    });
  },

  /**
   * Get count of eligible recipients
   */
  async getEligibleCount() {
    return apiRequest<{
      success: boolean;
      data: { count: number };
    }>('/api/admin/marketing-campaigns/eligible-count', {
      method: 'GET',
      credentials: 'include',
    });
  },
};

export const siteNoticeAPI = {
  /**
   * Get active site notice (public)
   */
  async getActiveNotice() {
    return apiRequest<{
      success: boolean;
      data: SiteNotice | null;
      message: string;
    }>('/api/site-notices/active', {
      method: 'GET',
    });
  },

  /**
   * Get all site notices (admin)
   */
  async getAllNotices() {
    return apiRequest<{
      success: boolean;
      data: SiteNotice[];
      message: string;
    }>('/api/admin/site-notices', {
      method: 'GET',
      credentials: 'include',
    });
  },

  /**
   * Create site notice (admin)
   */
  async createNotice(message: string, isActive: boolean = true) {
    return apiRequest<{
      success: boolean;
      data: SiteNotice;
      message: string;
    }>('/api/admin/site-notices', {
      method: 'POST',
      body: JSON.stringify({ message, is_active: isActive }),
      credentials: 'include',
    });
  },

  /**
   * Update site notice (admin)
   */
  async updateNotice(id: number, message: string, isActive: boolean) {
    return apiRequest<{
      success: boolean;
      data: SiteNotice;
      message: string;
    }>(`/api/admin/site-notices/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ message, is_active: isActive }),
      credentials: 'include',
    });
  },

  /**
   * Delete site notice (admin)
   */
  async deleteNotice(id: number) {
    return apiRequest<{
      success: boolean;
      data: null;
      message: string;
    }>(`/api/admin/site-notices/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
  },
};

// ============================================================================
// SHARED CONFIG API
// ============================================================================

export const sharedConfigsAPI = {
  /**
   * Create a shared product configuration
   */
  async createSharedConfig(productId: number, configuration: ProductConfiguration) {
    return apiRequest<{
      success: boolean;
      data: {
        shortCode: string;
        url: string;
      };
      message: string;
    }>('/api/shared-configs', {
      method: 'POST',
      body: JSON.stringify({ productId, configuration }),
    });
  },

  /**
   * Get shared configuration by short code
   */
  async getSharedConfig(shortCode: string) {
    return apiRequest<{
      success: boolean;
      data: {
        productId: number;
        configuration: ProductConfiguration;
      };
      message: string;
    }>(`/api/shared-configs/${shortCode}`, {
      method: 'GET',
    });
  },
};

