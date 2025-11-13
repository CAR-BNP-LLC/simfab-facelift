/**
 * Shopping Cart Types
 * Type definitions for cart, cart items, and checkout
 */

import { ProductConfiguration } from './product';

// ============================================================================
// CART TYPES
// ============================================================================

export interface Cart {
  id: number;
  user_id: number | null;
  session_id: string | null;
  region: 'us' | 'eu'; // Cart region (us or eu). Cart region must match the region of all products in the cart.
  status?: string; // Cart status: 'active', 'checkout', 'converted', etc.
  created_at: Date;
  updated_at: Date;
  expires_at: Date;
}

export interface CartItem {
  id: number;
  cart_id: number;
  product_id: number;
  quantity: number;
  configuration: ProductConfiguration;
  unit_price: number;
  total_price: number;
  created_at: Date;
  updated_at: Date;
}

export interface CartItemWithProduct extends CartItem {
  product_name: string;
  product_sku: string;
  product_slug: string;
  product_image: string | null;
  product_stock: number;
  product_status: string;
}

export interface CartWithItems extends Cart {
  items: CartItemWithProduct[];
  totals: CartTotals;
  appliedCoupons: AppliedCoupon[];
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  itemCount: number;
}

export interface AppliedCoupon {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  discountAmount?: number; // Alias for compatibility
  amount?: number;
  description?: string;
}

// ============================================================================
// CART OPERATION TYPES
// ============================================================================

export interface AddToCartData {
  productId: number;
  quantity: number;
  configuration: ProductConfiguration;
}

export interface UpdateCartItemData {
  quantity?: number;
  configuration?: ProductConfiguration;
}

export interface ApplyCouponData {
  couponCode: string;
}

// ============================================================================
// COUPON TYPES
// ============================================================================

export interface Coupon {
  id: number;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  description: string | null;
  minimum_order_amount: number | null;
  maximum_discount_amount: number | null;
  usage_limit: number | null;
  usage_count: number;
  per_user_limit: number | null;
  start_date: Date | null;
  end_date: Date | null;
  is_active: boolean;
  applicable_products: number[] | null;
  applicable_categories: number[] | null;
  excluded_products: number[] | null;
  created_at: Date;
}

export interface CouponValidation {
  valid: boolean;
  coupon?: Coupon;
  errors: string[];
}

// ============================================================================
// ORDER TYPES
// ============================================================================

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export interface Order {
  id: number;
  order_number: string;
  user_id: number | null;
  cart_id: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  shipping_status: string;
  
  // Amounts
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  
  // Customer info
  customer_email: string;
  customer_phone: string | null;
  
  // Addresses
  billing_address: Address;
  shipping_address: Address;
  
  // Payment & Shipping
  payment_method: string | null;
  payment_transaction_id: string | null;
  shipping_method: string | null;
  tracking_number: string | null;
  
  // Shipping Details
  package_size?: 'S' | 'M' | 'L' | null;
  is_international_shipping?: boolean | null;
  shipping_quote_id?: number | null;
  fedex_rate_data?: Record<string, any> | null;
  
  // Metadata
  notes: string | null;
  metadata: Record<string, any> | null;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  selected_options: ProductConfiguration;
  created_at: Date;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface Address {
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
}

// ============================================================================
// CHECKOUT TYPES
// ============================================================================

export interface CreateOrderData {
  billingAddress: Address;
  shippingAddress: Address;
  shippingMethodId?: string;
  paymentMethodId?: string;
  orderNotes?: string;
  subscribeNewsletter?: boolean;
  packageSize?: 'S' | 'M' | 'L';
  shippingAmount?: number;
  taxAmount?: number;
  shippingMethodData?: {
    fedexRateData?: {
      listRate: number;
      negotiatedRate?: number;
      hasNegotiatedRate: boolean;
      discountPercent?: number;
    };
  };
}

export interface ShippingMethod {
  requiresManualQuote?: boolean;
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
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface CartResponse {
  cart: CartWithItems;
}

export interface AddToCartResponse {
  cartItem: CartItemWithProduct;
  cartTotals: CartTotals;
}

