/**
 * Wishlist Context
 * Global wishlist state management
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { wishlistAPI, WishlistItem } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { trackAddToWishlist } from '@/utils/facebookPixel';
import { trackAddToWishlist as trackGTMAddToWishlist, trackRemoveFromWishlist as trackGTMRemoveFromWishlist } from '@/utils/googleTagManager';
import { useRegion } from './RegionContext';

// ============================================================================
// TYPES
// ============================================================================

interface WishlistContextType {
  wishlist: WishlistItem[];
  wishlistIds: Set<number>;
  loading: boolean;
  addToWishlist: (productId: number, preferences?: {
    notifyOnSale?: boolean;
    notifyOnStock?: boolean;
  }) => Promise<void>;
  removeFromWishlist: (productId: number) => Promise<void>;
  isInWishlist: (productId: number) => boolean;
  refreshWishlist: () => Promise<void>;
  wishlistCount: number;
}

// ============================================================================
// CONTEXT
// ============================================================================

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within WishlistProvider');
  }
  return context;
};

// ============================================================================
// PROVIDER
// ============================================================================

export const WishlistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false); // Start as false to allow immediate render
  const [wishlistCount, setWishlistCount] = useState(0);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { region } = useRegion();

  /**
   * Fetch wishlist from API
   */
  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlist([]);
      setWishlistIds(new Set());
      setWishlistCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await wishlistAPI.getWishlist();
      const items = response.data.items || [];
      setWishlist(items);
      setWishlistIds(new Set(items.map((item: WishlistItem) => item.product_id)));
      setWishlistCount(items.length);
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
      setWishlist([]);
      setWishlistIds(new Set());
      setWishlistCount(0);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]); // Memoize with isAuthenticated dependency

  /**
   * Refresh wishlist count
   */
  const refreshCount = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await wishlistAPI.getCount();
      setWishlistCount(response.data.count);
    } catch (error) {
      console.error('Failed to refresh wishlist count:', error);
    }
  }, [isAuthenticated]);

  /**
   * Add product to wishlist
   */
  const addToWishlist = useCallback(async (
    productId: number,
    preferences?: { notifyOnSale?: boolean; notifyOnStock?: boolean }
  ): Promise<void> => {
    if (!isAuthenticated) {
      toast({
        title: 'Login required',
        description: 'Please log in to add items to your wishlist',
        variant: 'destructive',
      });
      throw new Error('Authentication required');
    }

    try {
      await wishlistAPI.addToWishlist(productId, preferences);
      
      const currency = region === 'eu' ? 'EUR' : 'USD';
      
      // Track Facebook Pixel AddToWishlist event
      trackAddToWishlist({
        content_ids: [productId.toString()],
        content_type: 'product',
        currency: currency,
      });
      
      // Optimistic update
      const newIds = new Set(wishlistIds);
      newIds.add(productId);
      setWishlistIds(newIds);
      
      // Refresh full wishlist
      await fetchWishlist();
      
      // Track GTM add_to_wishlist event - get product details from refreshed wishlist
      const wishlistItem = wishlist.find(item => item.product_id === productId);
      if (wishlistItem && wishlistItem.product) {
        const product = wishlistItem.product;
        const price = product.sale_price && product.is_on_sale ? product.sale_price : product.regular_price || 0;
        
        trackGTMAddToWishlist({
          id: productId,
          name: product.name || 'Product',
          price: price,
          category: product.categories || undefined,
          brand: 'SimFab',
          sku: product.sku,
          currency: currency
        });
      } else {
        // Fallback: track with minimal data
        trackGTMAddToWishlist({
          id: productId,
          name: 'Product',
          price: 0,
          brand: 'SimFab',
          currency: currency
        });
      }
      
      toast({
        title: 'Added to wishlist!',
        description: 'Item has been added to your wishlist',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add to wishlist',
        variant: 'destructive',
      });
      throw error;
    }
  }, [isAuthenticated, wishlistIds, toast, fetchWishlist, region, wishlist]);

  /**
   * Remove product from wishlist
   */
  const removeFromWishlist = useCallback(async (productId: number): Promise<void> => {
    if (!isAuthenticated) return;

    try {
      // Get product details before removing (for tracking)
      const wishlistItem = wishlist.find(item => item.product_id === productId);
      const product = wishlistItem?.product;
      const currency = region === 'eu' ? 'EUR' : 'USD';
      
      await wishlistAPI.removeFromWishlist(productId);
      
      // Track GTM remove_from_wishlist event
      if (product) {
        const price = product.sale_price && product.is_on_sale ? product.sale_price : product.regular_price || 0;
        
        trackGTMRemoveFromWishlist({
          id: productId,
          name: product.name || 'Product',
          price: price,
          category: product.categories || undefined,
          brand: 'SimFab',
          sku: product.sku,
          currency: currency
        });
      } else {
        // Fallback: track with minimal data
        trackGTMRemoveFromWishlist({
          id: productId,
          name: 'Product',
          price: 0,
          brand: 'SimFab',
          currency: currency
        });
      }
      
      // Optimistic update
      const newIds = new Set(wishlistIds);
      newIds.delete(productId);
      setWishlistIds(newIds);
      
      // Refresh full wishlist
      await fetchWishlist();
      
      toast({
        title: 'Removed from wishlist',
        description: 'Item has been removed from your wishlist',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove from wishlist',
        variant: 'destructive',
      });
      throw error;
    }
  }, [isAuthenticated, wishlistIds, toast, fetchWishlist, region, wishlist]);

  /**
   * Check if product is in wishlist
   */
  const isInWishlist = useCallback((productId: number): boolean => {
    return wishlistIds.has(productId);
  }, [wishlistIds]);

  /**
   * Refresh wishlist
   */
  const refreshWishlist = useCallback(async (): Promise<void> => {
    await fetchWishlist();
  }, [fetchWishlist]);

  // Fetch wishlist after initial render (defer to allow UI to render first)
  useEffect(() => {
    // Use setTimeout to defer wishlist fetch until after initial render
    const timer = setTimeout(() => {
      fetchWishlist();
    }, 0);
    return () => {
      clearTimeout(timer);
    };
  }, [fetchWishlist]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => {
    return {
      wishlist,
      wishlistIds,
      loading,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      refreshWishlist,
      wishlistCount,
    };
  }, [wishlist, wishlistIds, loading, addToWishlist, removeFromWishlist, isInWishlist, refreshWishlist, wishlistCount]);

  return (
    <WishlistContext.Provider value={contextValue}>
      {children}
    </WishlistContext.Provider>
  );
};

