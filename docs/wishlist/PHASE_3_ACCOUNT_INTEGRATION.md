# Phase 3: Account Integration

**Status**: ⏳ Pending  
**Duration**: Week 2  
**Dependencies**: Phase 1, Phase 2 complete  
**Priority**: Medium

---

## Overview

This phase integrates the wishlist into the user's account dashboard and adds navigation elements (header icon, badge, etc.) for easy access.

---

## Objectives

- [ ] Add wishlist section to account dashboard
- [ ] Add wishlist icon to header navigation
- [ ] Add wishlist count badge
- [ ] Update navigation/routing
- [ ] (Optional) Create notification preferences UI

---

## Implementation

### 1. Account Dashboard Integration

**File**: `src/pages/Account.tsx` or `src/pages/Profile.tsx` (update existing)

Add a wishlist section to the account dashboard:

```typescript
import { useWishlist } from '@/contexts/WishlistContext';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Inside the Account component:
const { wishlist, wishlistCount } = useWishlist();

// Add this section:
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle className="flex items-center gap-2">
        <Heart className="h-5 w-5" />
        My Wishlist
      </CardTitle>
      <Button variant="outline" asChild>
        <Link to="/wishlist">View All</Link>
      </Button>
    </div>
  </CardHeader>
  <CardContent>
    <div className="flex items-center justify-between mb-4">
      <p className="text-muted-foreground">
        You have {wishlistCount} {wishlistCount === 1 ? 'item' : 'items'} in your wishlist
      </p>
    </div>

    {wishlist.length > 0 ? (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {wishlist.slice(0, 4).map((item) => {
          const product = item.product;
          const primaryImage = product.images?.[0]?.image_url || '/placeholder.svg';

          return (
            <Link
              key={item.id}
              to={`/product/${product.slug}`}
              className="group relative"
            >
              <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                <img
                  src={primaryImage}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <p className="text-sm font-medium mt-2 truncate group-hover:text-primary">
                {product.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {product.sale_price ? (
                  <>
                    <span className="text-destructive">${product.sale_price.toFixed(2)}</span>
                    <span className="line-through ml-1">${product.regular_price?.toFixed(2)}</span>
                  </>
                ) : (
                  `$${product.regular_price?.toFixed(2) || '0.00'}`
                )}
              </p>
            </Link>
          );
        })}
      </div>
    ) : (
      <div className="text-center py-8">
        <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">Your wishlist is empty</p>
        <Button variant="outline" asChild>
          <Link to="/shop">Browse Products</Link>
        </Button>
      </div>
    )}
  </CardContent>
</Card>
```

### 2. Header Navigation Update

**File**: `src/components/Header.tsx` (update existing)

Add wishlist icon next to cart icon:

```typescript
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge'; // If you have Badge component

// Inside Header component:
const { isAuthenticated } = useAuth();
const { wishlistCount } = useWishlist();

// Find where cart icon is and add wishlist icon nearby:
{isAuthenticated && (
  <Link
    to="/wishlist"
    className="relative p-2 hover:bg-muted rounded-full transition-colors"
    aria-label="Wishlist"
  >
    <Heart className="h-6 w-6" />
    {wishlistCount > 0 && (
      <Badge
        variant="destructive"
        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
      >
        {wishlistCount > 99 ? '99+' : wishlistCount}
      </Badge>
    )}
  </Link>
)}
```

**Alternative**: If you don't have a Badge component, create a simple count indicator:

```typescript
{isAuthenticated && (
  <Link
    to="/wishlist"
    className="relative p-2 hover:bg-muted rounded-full transition-colors"
    aria-label="Wishlist"
  >
    <Heart className="h-6 w-6" />
    {wishlistCount > 0 && (
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
        {wishlistCount > 99 ? '99+' : wishlistCount}
      </span>
    )}
  </Link>
)}
```

### 3. Update WishlistContext to Sync Count

**File**: `src/contexts/WishlistContext.tsx` (update existing)

Ensure the count is automatically updated:

```typescript
// The count should already be synced, but ensure it updates in real-time
// when items are added/removed in other components

// This is already handled in the existing implementation
```

### 4. Add Badge Component (if needed)

**File**: `src/components/ui/badge.tsx` (if not exists)

Create a simple badge component or use shadcn/ui:

```typescript
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
```

### 5. (Optional) Notification Preferences UI

**File**: `src/pages/Wishlist.tsx` (update existing)

Add notification preference toggles to each wishlist item:

```typescript
import { Switch } from '@/components/ui/switch'; // If you have Switch component
import { Label } from '@/components/ui/label';
import { wishlistAPI } from '@/services/api';

// Add to each wishlist item card:
<CardContent>
  {/* Existing content */}
  
  {/* Notification Preferences */}
  <div className="mt-4 pt-4 border-t space-y-2">
    <div className="flex items-center justify-between">
      <Label htmlFor={`notify-sale-${item.id}`} className="text-sm">
        Notify on Sale
      </Label>
      <Switch
        id={`notify-sale-${item.id}`}
        checked={item.notify_on_sale}
        onCheckedChange={async (checked) => {
          try {
            await wishlistAPI.updatePreferences(item.product_id, {
              notifyOnSale: checked,
            });
            await refreshWishlist();
          } catch (error) {
            console.error('Failed to update preferences:', error);
          }
        }}
      />
    </div>
    <div className="flex items-center justify-between">
      <Label htmlFor={`notify-stock-${item.id}`} className="text-sm">
        Notify on Stock
      </Label>
      <Switch
        id={`notify-stock-${item.id}`}
        checked={item.notify_on_stock}
        onCheckedChange={async (checked) => {
          try {
            await wishlistAPI.updatePreferences(item.product_id, {
              notifyOnStock: checked,
            });
            await refreshWishlist();
          } catch (error) {
            console.error('Failed to update preferences:', error);
          }
        }}
      />
    </div>
  </div>
</CardContent>
```

### 6. Update Navigation Menu (if exists)

If you have a navigation menu/sidebar, add wishlist link:

```typescript
<nav>
  <Link to="/wishlist" className="flex items-center gap-2">
    <Heart className="h-5 w-5" />
    Wishlist
    {wishlistCount > 0 && (
      <Badge variant="secondary">{wishlistCount}</Badge>
    )}
  </Link>
</nav>
```

---

## Testing

### Manual Testing Checklist

- [ ] Wishlist icon appears in header when logged in
- [ ] Wishlist count badge shows correct number
- [ ] Clicking wishlist icon navigates to wishlist page
- [ ] Account dashboard shows wishlist section
- [ ] Recent wishlist items display correctly
- [ ] "View All" link works
- [ ] Empty wishlist shows correct message in dashboard
- [ ] Notification preferences toggles work (if implemented)
- [ ] Badge updates when items are added/removed
- [ ] Mobile responsive design works

---

## Checklist

- [ ] Add wishlist section to account dashboard
- [ ] Add wishlist icon to header
- [ ] Add wishlist count badge
- [ ] Test navigation
- [ ] (Optional) Add notification preferences UI
- [ ] Test all functionality
- [ ] Verify responsive design
- [ ] Ensure count updates in real-time

---

## Next Steps

Once Phase 3 is complete, proceed to [Phase 4: Email Templates](./PHASE_4_EMAIL_TEMPLATES.md).

---

**Status**: Ready to implement  
**Estimated Time**: 1 day

