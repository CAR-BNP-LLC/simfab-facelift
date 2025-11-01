/**
 * Cart Context
 * Global shopping cart state management
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ============================================================================
// TYPES
// ============================================================================

interface CartItem {
  id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  product_slug: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  configuration: any;
}

interface CartTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  itemCount: number;
}

interface Cart {
  id: number;
  items: CartItem[];
  totals: CartTotals;
  appliedCoupons: any[];
}

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  itemCount: number;
  
  // Actions
  addToCart: (productId: number, configuration: any, quantity: number) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  refreshCart: () => Promise<void>;
}

// ============================================================================
// CONTEXT
// ============================================================================

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

// ============================================================================
// PROVIDER
// ============================================================================

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true); // Start as true since we load cart on mount
  const { toast } = useToast();

  // Load cart on mount
  useEffect(() => {
    refreshCart();
  }, []);

  /**
   * Refresh cart from API
   */
  const refreshCart = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/cart`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success && data.data) {
        // Check if cart is actually empty (no items)
        if (data.data.items && data.data.items.length === 0) {
          setCart(null);
        } else if (data.data.cart === null) {
          // API explicitly returned null cart
          setCart(null);
        } else {
          setCart(data.data);
        }
      } else {
        setCart(null);
      }
    } catch (error) {
      console.error('Error refreshing cart:', error);
      setCart(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add item to cart
   */
  const addToCart = async (productId: number, configuration: any, quantity: number = 1) => {
    try {
      setLoading(true);

      // Comprehensive configuration debugging
      console.log('========== CART CONTEXT: ADD TO CART DEBUG ==========');
      console.log('Product ID:', productId);
      console.log('Quantity:', quantity);
      console.log('Full Configuration Object:', JSON.stringify(configuration, null, 2));
      
      // Breakdown of configuration components
      const configBreakdown = {
        hasModelVariation: !!configuration.modelVariationId,
        modelVariationId: configuration.modelVariationId,
        hasVariations: !!configuration.variations,
        variationsCount: configuration.variations ? Object.keys(configuration.variations).length : 0,
        variationsDetails: configuration.variations ? Object.entries(configuration.variations).map(([varId, optId]) => ({
          variationId: varId,
          optionId: optId,
          types: {
            varIdType: typeof varId,
            optIdType: typeof optId
          }
        })) : [],
        hasBundleItems: !!configuration.bundleItems,
        bundleItemsDetails: configuration.bundleItems ? {
          selectedOptional: configuration.bundleItems.selectedOptional || [],
          optionalCount: configuration.bundleItems.selectedOptional?.length || 0,
          hasConfigurations: !!configuration.bundleItems.configurations,
          configurationsCount: configuration.bundleItems.configurations ? Object.keys(configuration.bundleItems.configurations).length : 0,
          configurationsDetails: configuration.bundleItems.configurations || {}
        } : null
      };
      console.log('Configuration Breakdown:', JSON.stringify(configBreakdown, null, 2));
      
      const requestData = {
        productId,
        configuration,
        quantity
      };
      
      console.log('Sending to backend:', JSON.stringify(requestData, null, 2));
      console.log('====================================================');

      const response = await fetch(`${API_URL}/api/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Check for specific error codes
        const errorCode = data.error?.code;
        const errorMessage = data.error?.message || 'Failed to add to cart';
        
        // Show specific error message for stock issues
        if (errorCode === 'BUNDLE_REQUIRED_ITEM_OUT_OF_STOCK' || errorMessage.includes('out of stock')) {
          throw new Error(errorMessage);
        }
        
        throw new Error(errorMessage);
      }

      // Show warning if optional items were removed
      if (data.data?.cartItem?.warning) {
        toast({
          title: 'Items added with changes',
          description: data.data.cartItem.warning.message,
          variant: 'default'
        });
      } else {
        toast({
          title: 'Added to cart!',
          description: `${quantity} item(s) added to your cart`,
        });
      }

      // Refresh cart
      await refreshCart();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add to cart',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update item quantity
   */
  const updateQuantity = async (itemId: number, quantity: number) => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/cart/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ quantity })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to update cart');
      }

      // Refresh cart
      await refreshCart();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update quantity',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remove item from cart
   */
  const removeItem = async (itemId: number) => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/cart/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to remove item');
      }

      toast({
        title: 'Item removed',
        description: 'Item removed from cart',
      });

      // Refresh cart
      await refreshCart();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove item',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear entire cart
   */
  const clearCart = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/cart/clear`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to clear cart');
      }

      setCart(null);

      toast({
        title: 'Cart cleared',
        description: 'All items removed from cart',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to clear cart',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Apply coupon code
   */
  const applyCoupon = async (code: string) => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/cart/apply-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ couponCode: code })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Invalid coupon code');
      }

      const discountAmount = data.data?.coupon?.discountAmount || data.data?.coupon?.amount || 0;
      
      // Update cart state with the new cart from response (includes updated totals)
      if (data.data?.cart) {
        setCart(data.data.cart);
      }
      
      toast({
        title: 'Coupon applied!',
        description: `You saved $${discountAmount.toFixed(2)}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to apply coupon',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Calculate item count
  const itemCount = cart?.totals?.itemCount || 0;

  const value: CartContextType = {
    cart,
    loading,
    itemCount,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    refreshCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

