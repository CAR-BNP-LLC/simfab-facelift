/**
 * API Service for SimFab Frontend
 * Connects to the Express backend at http://localhost:3001
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Generic API request handler
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
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      // Handle API errors
      throw new Error(data.error?.message || data.error || 'Request failed');
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
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

export interface Product {
  id: number;
  sku: string;
  name: string;
  slug?: string;
  description?: string;
  short_description?: string;
  type?: string;
  status?: string;
  featured?: boolean;
  regular_price?: number;
  sale_price?: number;
  price_min?: number;
  price_max?: number;
  stock?: number;
  in_stock?: string;
  weight_lbs?: number;
  length_in?: number;
  width_in?: number;
  height_in?: number;
  images?: string;
  categories?: string;
  tags?: string;
  created_at?: string;
  updated_at?: string;
}

export const productsAPI = {
  /**
   * Get all products
   */
  async getAll() {
    return apiRequest<{
      success: boolean;
      data: Product[];
      count: number;
    }>('/api/products');
  },

  /**
   * Get product by ID
   */
  async getById(id: number) {
    return apiRequest<{
      success: boolean;
      data: Product;
    }>(`/api/products/${id}`);
  },

  /**
   * Create new product
   */
  async create(productData: Partial<Product>) {
    return apiRequest<{
      success: boolean;
      message: string;
      data: Product;
    }>('/api/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },

  /**
   * Upload products from CSV
   */
  async uploadCSV(file: File) {
    const formData = new FormData();
    formData.append('csv', file);

    const response = await fetch(`${API_BASE_URL}/api/products/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    return data;
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
  health: healthAPI,
};

