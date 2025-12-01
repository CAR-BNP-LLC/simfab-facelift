/**
 * Cart Context
 * Global shopping cart state management
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRegion } from '@/contexts/RegionContext';
import { trackAddToCart } from '@/utils/facebookPixel';
import { trackAddToCart as trackGTMAddToCart, trackRemoveFromCart, trackViewCart } from '@/utils/googleTagManager';

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
  const [loading, setLoading] = useState(false); // Start as false to allow immediate render
  const { toast } = useToast();
  const { region } = useRegion();
  // Don't use useContext here - it causes re-renders when CheckoutContext changes
  // Instead, we'll use a custom event or pass the function differently
  // For now, we'll remove the dependency on CheckoutContext to prevent re-render loops

  /**
   * Refresh cart from API
   */
  const refreshCart = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/cart?region=${region}`, {
        credentials: 'include',
        headers: { 'X-Region': region }
      });

      const data = await response.json();

      // Debug logging in development
      if (process.env.NODE_ENV === 'development') {
        console.log('🛒 Cart refresh response:', {
          success: data.success,
          hasData: !!data.data,
          dataKeys: data.data ? Object.keys(data.data) : [],
          cartNull: data.data?.cart === null,
          hasItems: !!data.data?.items,
          itemsLength: data.data?.items?.length || 0
        });
      }

      if (data.success && data.data) {
        // Backend returns different structures:
        // - Empty cart: { success: true, data: { cart: null, message: 'Cart is empty' } }
        // - Cart with items: { success: true, data: { id, items, totals, ... } }
        
        // Check if API explicitly returned null cart (empty cart response)
        if (data.data.cart === null) {
          setCart(null);
        } 
        // Check if this is a cart object with items
        else if (data.data.items && Array.isArray(data.data.items)) {
          // Cart has items - set the cart object
          if (data.data.items.length > 0) {
            setCart(data.data);
          } else {
            // Cart object exists but has no items
            setCart(null);
          }
        }
        // Check if this is a cart object (might not have items property yet)
        else if (data.data.id && (data.data.items === undefined || Array.isArray(data.data.items))) {
          // It's a cart object - set it (items might be empty array or undefined)
          setCart(data.data);
        } else {
          // Unknown structure - set to null
          console.warn('Unknown cart response structure:', data.data);
          setCart(null);
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
  }, [region]); // Memoize with region dependency

  // Load cart after initial render (defer to allow UI to render first)
  useEffect(() => {
    // Use setTimeout to defer cart load until after initial render
    const timer = setTimeout(() => {
      refreshCart();
    }, 0);
    return () => {
      clearTimeout(timer);
    };
  }, [refreshCart]); // Include refreshCart in dependencies

  /**
   * Add item to cart
   */
  const addToCart = useCallback(async (productId: number, configuration: any, quantity: number = 1) => {
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

      const response = await fetch(`${API_URL}/api/cart/add?region=${region}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Region': region
        },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });

      // Handle non-JSON responses (network errors, etc.)
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error('Server error: Invalid response format');
      }

      if (!response.ok || !data.success) {
        // Check for specific error codes
        const errorCode = data.error?.code;
        const errorMessage = data.error?.message || 'Failed to add to cart';
        
        // Log error for debugging (especially session-related issues)
        if (process.env.NODE_ENV === 'development') {
          console.error('Add to cart error:', {
            status: response.status,
            errorCode,
            errorMessage,
            fullError: data.error
          });
        }
        
        // Show specific error message for region mismatch
        if (errorCode === 'REGION_MISMATCH') {
          throw new Error(errorMessage);
        }
        
        // Show specific error message for stock issues
        if (errorCode === 'BUNDLE_REQUIRED_ITEM_OUT_OF_STOCK' || errorMessage.includes('out of stock')) {
          throw new Error(errorMessage);
        }
        
        // Check for session-related errors
        if (errorMessage.includes('Session ID') || errorMessage.includes('session')) {
          console.error('Session error detected - this may indicate session configuration issues');
          throw new Error('Unable to add to cart. Please refresh the page and try again.');
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

      // Track Facebook Pixel AddToCart event
      const cartItem = data.data?.cartItem;
      if (cartItem) {
        const currency = region === 'eu' ? 'EUR' : 'USD';
        
        trackAddToCart({
          content_name: cartItem.product_name,
          content_ids: [cartItem.product_id?.toString() || productId.toString()],
          content_type: 'product',
          value: cartItem.unit_price || 0,
          currency: currency,
          quantity: quantity,
        });

        // Track GTM add_to_cart event
        trackGTMAddToCart({
          id: cartItem.product_id || productId,
          name: cartItem.product_name,
          price: cartItem.unit_price || 0,
          category: cartItem.product_category || undefined,
          brand: 'SimFab',
          sku: cartItem.product_sku,
          quantity: quantity,
          currency: currency
        });
      }

      // Refresh cart to get updated state
      await refreshCart();
      
      // Clear shipping selection when cart items change (use event to avoid re-render loops)
      window.dispatchEvent(new CustomEvent('cartUpdated'));
      
      // Debug: Log cart state after refresh (in development)
      if (process.env.NODE_ENV === 'development') {
        // Use setTimeout to log after state update
        setTimeout(() => {
          console.log('🛒 Cart state after add:', {
            cartId: cart?.id,
            itemCount: cart?.items?.length || 0,
            totalsItemCount: cart?.totals?.itemCount || 0
          });
        }, 100);
      }
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
  }, [region, refreshCart, toast, cart]);

  /**
   * Update item quantity
   */
  const updateQuantity = useCallback(async (itemId: number, quantity: number) => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/cart/items/${itemId}?region=${region}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Region': region
        },
        credentials: 'include',
        body: JSON.stringify({ quantity })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to update cart');
      }

      // Refresh cart
      await refreshCart();
      
      // Clear shipping selection when cart items change (use event to avoid re-render loops)
      window.dispatchEvent(new CustomEvent('cartUpdated'));
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
  }, [region, refreshCart, toast]);

  /**
   * Remove item from cart
   */
  const removeItem = useCallback(async (itemId: number) => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/cart/items/${itemId}?region=${region}`, {
        method: 'DELETE',
        headers: { 'X-Region': region },
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to remove item');
      }

      // Track GTM remove_from_cart event
      const removedItem = cart?.items.find(item => item.id === itemId);
      if (removedItem) {
        trackRemoveFromCart({
          id: removedItem.product_id,
          name: removedItem.product_name,
          price: removedItem.unit_price,
          category: undefined, // Cart items don't have category in this structure
          brand: 'SimFab',
          sku: removedItem.product_sku,
          quantity: removedItem.quantity,
          currency: region === 'eu' ? 'EUR' : 'USD'
        });
      }

      toast({
        title: 'Item removed',
        description: 'Item removed from cart',
      });

      // Refresh cart
      await refreshCart();
      
      // Clear shipping selection when cart items change (use event to avoid re-render loops)
      window.dispatchEvent(new CustomEvent('cartUpdated'));
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
  }, [region, refreshCart, toast]);

  /**
   * Clear entire cart
   */
  const clearCart = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/cart/clear?region=${region}`, {
        method: 'DELETE',
        headers: { 'X-Region': region },
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to clear cart');
      }

      setCart(null);

      // Clear shipping selection when cart is cleared (use event to avoid re-render loops)
      window.dispatchEvent(new CustomEvent('cartUpdated'));

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
  }, [region, toast]);

  /**
   * Apply coupon code
   */
  const applyCoupon = useCallback(async (code: string) => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/cart/apply-coupon?region=${region}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Region': region
        },
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
  }, [region, toast]);

  // Calculate item count
  const itemCount = cart?.totals?.itemCount || 0;

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<CartContextType>(() => {
    return {
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
  }, [cart, loading, itemCount, addToCart, updateQuantity, removeItem, clearCart, applyCoupon, refreshCart]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

