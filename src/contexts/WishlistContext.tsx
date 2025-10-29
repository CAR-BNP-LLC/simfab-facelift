/**
 * Wishlist Context
 * Global wishlist state management
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { wishlistAPI, WishlistItem } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

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
  const [loading, setLoading] = useState(true);
  const [wishlistCount, setWishlistCount] = useState(0);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  /**
   * Fetch wishlist from API
   */
  const fetchWishlist = async () => {
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
  };

  /**
   * Refresh wishlist count
   */
  const refreshCount = async () => {
    if (!isAuthenticated) return;

    try {
      const response = await wishlistAPI.getCount();
      setWishlistCount(response.data.count);
    } catch (error) {
      console.error('Failed to refresh wishlist count:', error);
    }
  };

  /**
   * Add product to wishlist
   */
  const addToWishlist = async (
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
      
      // Optimistic update
      const newIds = new Set(wishlistIds);
      newIds.add(productId);
      setWishlistIds(newIds);
      
      // Refresh full wishlist
      await refreshWishlist();
      
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
  };

  /**
   * Remove product from wishlist
   */
  const removeFromWishlist = async (productId: number): Promise<void> => {
    if (!isAuthenticated) return;

    try {
      await wishlistAPI.removeFromWishlist(productId);
      
      // Optimistic update
      const newIds = new Set(wishlistIds);
      newIds.delete(productId);
      setWishlistIds(newIds);
      
      // Refresh full wishlist
      await refreshWishlist();
      
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
  };

  /**
   * Check if product is in wishlist
   */
  const isInWishlist = (productId: number): boolean => {
    return wishlistIds.has(productId);
  };

  /**
   * Refresh wishlist
   */
  const refreshWishlist = async (): Promise<void> => {
    await fetchWishlist();
  };

  // Fetch wishlist on mount and when auth state changes
  useEffect(() => {
    fetchWishlist();
  }, [isAuthenticated]);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        wishlistIds,
        loading,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        refreshWishlist,
        wishlistCount,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

