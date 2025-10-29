# Phase 2: Frontend Core

**Status**: ⏳ Pending  
**Duration**: Week 1-2  
**Dependencies**: Phase 1 complete  
**Priority**: High

---

## Overview

This phase builds the frontend components, context, and pages needed for users to interact with their wishlist.

---

## Objectives

- [ ] Create `WishlistContext` for state management
- [ ] Create `WishlistButton` component
- [ ] Update product cards (Shop page, product listings)
- [ ] Update ProductDetail page
- [ ] Create Wishlist page
- [ ] Add API methods to `src/services/api.ts`
- [ ] Write component tests

---

## Frontend Implementation

### 1. API Service Methods

**File**: `src/services/api.ts` (add to existing)

```typescript
// Add to existing API_URL constant
// Add wishlist API methods

export const wishlistAPI = {
  /**
   * Get user's wishlist
   */
  getWishlist: async (): Promise<ApiResponse<{ items: any[]; count: number }>> => {
    const response = await fetch(`${API_URL}/api/wishlist`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to get wishlist');
    }

    return response.json();
  },

  /**
   * Add product to wishlist
   */
  addToWishlist: async (
    productId: number,
    preferences?: {
      notifyOnSale?: boolean;
      notifyOnStock?: boolean;
    }
  ): Promise<ApiResponse<{ wishlist: any; message: string }>> => {
    const response = await fetch(`${API_URL}/api/wishlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        productId,
        notifyOnSale: preferences?.notifyOnSale,
        notifyOnStock: preferences?.notifyOnStock,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to add to wishlist');
    }

    return response.json();
  },

  /**
   * Remove product from wishlist
   */
  removeFromWishlist: async (productId: number): Promise<ApiResponse<{ message: string }>> => {
    const response = await fetch(`${API_URL}/api/wishlist/${productId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to remove from wishlist');
    }

    return response.json();
  },

  /**
   * Update notification preferences
   */
  updatePreferences: async (
    productId: number,
    preferences: { notifyOnSale?: boolean; notifyOnStock?: boolean }
  ): Promise<ApiResponse<{ wishlist: any }>> => {
    const response = await fetch(`${API_URL}/api/wishlist/${productId}/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(preferences),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to update preferences');
    }

    return response.json();
  },

  /**
   * Get wishlist count
   */
  getCount: async (): Promise<ApiResponse<{ count: number }>> => {
    const response = await fetch(`${API_URL}/api/wishlist/count`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to get wishlist count');
    }

    return response.json();
  },

  /**
   * Check if product is wishlisted
   */
  checkWishlist: async (productId: number): Promise<ApiResponse<{ isWishlisted: boolean; wishlistId?: number }>> => {
    const response = await fetch(`${API_URL}/api/wishlist/${productId}/check`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to check wishlist');
    }

    return response.json();
  },

  /**
   * Bulk check wishlist status for multiple products
   */
  bulkCheck: async (productIds: number[]): Promise<ApiResponse<Record<string, boolean>>> => {
    const response = await fetch(
      `${API_URL}/api/wishlist/bulk-check?productIds=${productIds.join(',')}`,
      {
        method: 'GET',
        credentials: 'include',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to bulk check wishlist');
    }

    return response.json();
  },
};
```

### 2. Wishlist Context

**File**: `src/contexts/WishlistContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { wishlistAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface WishlistItem {
  id: number;
  product_id: number;
  notify_on_sale: boolean;
  notify_on_stock: boolean;
  created_at: string;
  product: any; // Product type from your types
}

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

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

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

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
```

### 3. WishlistButton Component

**File**: `src/components/WishlistButton.tsx`

```typescript
import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface WishlistButtonProps {
  productId: number;
  variant?: 'default' | 'outline' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const WishlistButton: React.FC<WishlistButtonProps> = ({
  productId,
  variant = 'ghost',
  size = 'md',
  showLabel = false,
  className,
}) => {
  const { isInWishlist, addToWishlist, removeFromWishlist, loading } = useWishlist();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isToggling, setIsToggling] = useState(false);

  const wishlisted = isInWishlist(productId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (isToggling) return;

    try {
      setIsToggling(true);
      if (wishlisted) {
        await removeFromWishlist(productId);
      } else {
        await addToWishlist(productId);
      }
    } catch (error) {
      console.error('Wishlist toggle error:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={isToggling || loading}
        className={cn(
          'relative rounded-full p-2 transition-colors',
          wishlisted
            ? 'text-red-500 hover:text-red-600'
            : 'text-muted-foreground hover:text-foreground',
          isToggling && 'opacity-50 cursor-not-allowed',
          className
        )}
        aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart
          className={cn(
            sizeClasses[size],
            wishlisted ? 'fill-current' : 'fill-none'
          )}
        />
        {isToggling && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </div>
        )}
      </button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isToggling || loading}
      className={cn(
        wishlisted && 'text-red-500 hover:text-red-600',
        className
      )}
    >
      <Heart
        className={cn(
          'mr-2 h-4 w-4',
          wishlisted ? 'fill-current' : 'fill-none'
        )}
      />
      {showLabel && (wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist')}
    </Button>
  );
};
```

### 4. Update Product Cards

**File**: `src/pages/Shop.tsx` (update existing)

Add `WishlistButton` to each product card:

```typescript
import { WishlistButton } from '@/components/WishlistButton';

// Inside the product card mapping:
{products.map((product) => (
  <Card key={product.id}>
    <CardHeader>
      <div className="relative">
        {/* Product Image */}
        <Link to={`/product/${product.slug}`}>
          <img src={productImage} alt={product.name} />
        </Link>
        
        {/* Wishlist Button - Top Right */}
        <div className="absolute top-2 right-2">
          <WishlistButton productId={product.id} variant="icon" />
        </div>
      </div>
      
      {/* Rest of card content */}
    </CardHeader>
  </Card>
))}
```

### 5. Update ProductDetail Page

**File**: `src/pages/ProductDetail.tsx` (update existing)

Replace the static "Add to Wishlist" button:

```typescript
import { WishlistButton } from '@/components/WishlistButton';

// Replace:
// <Button variant="ghost" className="w-full">
//   <Heart className="w-5 h-5 mr-2" />
//   Add to Wishlist
// </Button>

// With:
<WishlistButton
  productId={product.id}
  variant="ghost"
  showLabel={true}
  className="w-full"
/>
```

### 6. Wishlist Page

**File**: `src/pages/Wishlist.tsx`

```typescript
import React from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WishlistButton } from '@/components/WishlistButton';
import { Heart, ShoppingCart, Eye } from 'lucide-react';
import { Loader2 } from 'lucide-react';

const Wishlist: React.FC = () => {
  const { wishlist, loading, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  const handleAddToCart = async (product: any) => {
    try {
      await addToCart(product.id, {}, 1);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">My Wishlist</h1>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <Heart className="h-24 w-24 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Your wishlist is empty</h2>
          <p className="text-muted-foreground mb-6">
            Start adding items you love to your wishlist
          </p>
          <Button asChild>
            <Link to="/shop">Browse Products</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Wishlist</h1>
        <p className="text-muted-foreground">
          {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {wishlist.map((item) => {
          const product = item.product;
          const primaryImage = product.images?.[0]?.image_url || '/placeholder.svg';

          return (
            <Card key={item.id} className="relative">
              <CardHeader className="p-0">
                <div className="relative">
                  <Link to={`/product/${product.slug}`}>
                    <img
                      src={primaryImage}
                      alt={product.name}
                      className="w-full h-64 object-cover rounded-t-lg"
                    />
                  </Link>
                  
                  {/* Wishlist Button */}
                  <div className="absolute top-2 right-2">
                    <WishlistButton productId={product.id} variant="icon" />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4">
                <Link to={`/product/${product.slug}`}>
                  <h3 className="font-semibold text-lg mb-2 hover:text-primary">
                    {product.name}
                  </h3>
                </Link>

                <div className="flex items-center gap-2 mb-4">
                  {product.sale_price ? (
                    <>
                      <span className="text-lg font-bold text-destructive">
                        ${product.sale_price.toFixed(2)}
                      </span>
                      <span className="text-sm line-through text-muted-foreground">
                        ${product.regular_price?.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg font-bold">
                      ${product.regular_price?.toFixed(2) || '0.00'}
                    </span>
                  )}
                </div>

                {/* Stock Status */}
                {product.in_stock === '0' && (
                  <p className="text-sm text-destructive mb-2">Out of Stock</p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="flex-1"
                  >
                    <Link to={`/product/${product.slug}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleAddToCart(product)}
                    disabled={product.in_stock === '0'}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Wishlist;
```

### 7. Add Route

**File**: `src/App.tsx` or your router file (update existing)

```typescript
import Wishlist from './pages/Wishlist';

// Add route:
<Route path="/wishlist" element={<Wishlist />} />
```

### 8. Wrap App with WishlistProvider

**File**: `src/main.tsx` or `src/App.tsx` (update existing)

```typescript
import { WishlistProvider } from '@/contexts/WishlistContext';

// Wrap your app:
<WishlistProvider>
  {/* existing providers and routes */}
</WishlistProvider>
```

---

## Testing

### Component Tests

Test `WishlistButton`:
- Toggles wishlist status
- Shows correct icon state
- Handles authentication redirect
- Shows loading state

Test `WishlistContext`:
- Fetches wishlist on mount
- Updates state correctly
- Handles errors

### Manual Testing Checklist

- [ ] Wishlist button appears on product cards
- [ ] Wishlist button appears on product detail page
- [ ] Clicking button adds/removes from wishlist
- [ ] Heart icon fills when wishlisted
- [ ] Redirects to login if not authenticated
- [ ] Wishlist page displays all items
- [ ] Empty state shows correctly
- [ ] Can add to cart from wishlist
- [ ] Can remove from wishlist
- [ ] Wishlist persists after page refresh

---

## Checklist

- [ ] Add wishlist API methods to `src/services/api.ts`
- [ ] Create `WishlistContext`
- [ ] Create `WishlistButton` component
- [ ] Update Shop page with wishlist buttons
- [ ] Update ProductDetail page with wishlist button
- [ ] Create Wishlist page
- [ ] Add route for `/wishlist`
- [ ] Wrap app with `WishlistProvider`
- [ ] Test all functionality manually
- [ ] Verify responsive design

---

## Next Steps

Once Phase 2 is complete, proceed to [Phase 3: Account Integration](./PHASE_3_ACCOUNT_INTEGRATION.md).

---

**Status**: Ready to implement  
**Estimated Time**: 2-3 days

