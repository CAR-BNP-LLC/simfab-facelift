# Wishlist Implementation Plan

**Status**: Planning  
**Date**: 2024  
**Priority**: High

> **Note**: This plan has been split into detailed phase documents. See [docs/wishlist/README.md](./docs/wishlist/README.md) for the organized implementation guide.

---

## Quick Links

- [Overview & Phases](./docs/wishlist/README.md)
- [Phase 1: Database & Backend Core](./docs/wishlist/PHASE_1_DATABASE_BACKEND.md)
- [Phase 2: Frontend Core](./docs/wishlist/PHASE_2_FRONTEND.md)
- [Phase 3: Account Integration](./docs/wishlist/PHASE_3_ACCOUNT_INTEGRATION.md)
- [Phase 4: Email Templates](./docs/wishlist/PHASE_4_EMAIL_TEMPLATES.md)
- [Phase 5: Notification Service](./docs/wishlist/PHASE_5_NOTIFICATION_SERVICE.md)
- [Phase 6: Background Jobs](./docs/wishlist/PHASE_6_BACKGROUND_JOBS.md)
- [Phase 7: Testing & Polish](./docs/wishlist/PHASE_7_TESTING_POLISH.md)

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [Notification System](#notification-system)
6. [Background Jobs](#background-jobs)
7. [API Endpoints](#api-endpoints)
8. [User Account Integration](#user-account-integration)
9. [Testing Requirements](#testing-requirements)
10. [Implementation Phases](#implementation-phases)

---

## Overview

### Goals
- Allow users to save products to their wishlist
- Notify users when wishlist items go on sale
- Notify users when wishlist items come back in stock
- Display wishlist in user account dashboard
- Add heart button to product cards for quick wishlist management
- Persist wishlist across sessions (requires authentication)

### Key Features
1. **Wishlist Management**
   - Add/remove products from wishlist
   - View wishlist items with product details
   - Track when items were added
   - Support for product variations (track specific variations if needed)

2. **Notifications**
   - Sale notifications (when product goes on sale)
   - Back-in-stock notifications (when product becomes available)
   - Email templates for both notification types
   - Unsubscribe/preference management

3. **User Experience**
   - Heart icon on all product cards
   - Wishlist page/route
   - Account dashboard integration
   - Visual indicators for wishlisted items
   - Quick actions (add to cart from wishlist)

---

## Database Schema

### 1. Wishlist Table

```sql
-- Main wishlist table
CREATE TABLE IF NOT EXISTS wishlists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Notification preferences for this item
  notify_on_sale BOOLEAN DEFAULT true,
  notify_on_stock BOOLEAN DEFAULT true,
  
  -- Track notification history
  last_sale_notified_at TIMESTAMP,
  last_stock_notified_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one wishlist entry per user-product combination
  CONSTRAINT unique_user_product UNIQUE (user_id, product_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON wishlists(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_notify_sale ON wishlists(notify_on_sale, product_id) WHERE notify_on_sale = true;
CREATE INDEX IF NOT EXISTS idx_wishlists_notify_stock ON wishlists(notify_on_stock, product_id) WHERE notify_on_stock = true;

-- Index for finding products that need sale notifications
CREATE INDEX IF NOT EXISTS idx_wishlists_sale_check ON wishlists(notify_on_sale, product_id, last_sale_notified_at) WHERE notify_on_sale = true;

-- Index for finding products that need stock notifications
CREATE INDEX IF NOT EXISTS idx_wishlists_stock_check ON wishlists(notify_on_stock, product_id, last_stock_notified_at) WHERE notify_on_stock = true;
```

### 2. Wishlist Notification Log

```sql
-- Track sent notifications to prevent duplicates
CREATE TABLE IF NOT EXISTS wishlist_notifications (
  id SERIAL PRIMARY KEY,
  wishlist_id INTEGER NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  notification_type VARCHAR(20) NOT NULL, -- 'sale' or 'stock'
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP,
  email_log_id INTEGER REFERENCES email_logs(id), -- Link to email service logs
  
  -- Product state at notification time
  product_price DECIMAL(10,2),
  product_sale_price DECIMAL(10,2),
  product_stock INTEGER,
  product_in_stock VARCHAR(1), -- '1' or '0'
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT wishlist_notifications_type_check CHECK (
    notification_type IN ('sale', 'stock')
  )
);

CREATE INDEX IF NOT EXISTS idx_wishlist_notifications_wishlist ON wishlist_notifications(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_notifications_type ON wishlist_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_wishlist_notifications_sent ON wishlist_notifications(email_sent, created_at);
```

---

## Backend Implementation

### 1. Wishlist Model

**File**: `server/src/models/wishlist.ts`

```typescript
export interface Wishlist {
  id?: number;
  user_id: number;
  product_id: number;
  notify_on_sale: boolean;
  notify_on_stock: boolean;
  last_sale_notified_at?: Date;
  last_stock_notified_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface WishlistWithProduct extends Wishlist {
  product: Product;
  product_images?: ProductImage[];
}

export interface WishlistNotification {
  id?: number;
  wishlist_id: number;
  notification_type: 'sale' | 'stock';
  email_sent: boolean;
  email_sent_at?: Date;
  email_log_id?: number;
  product_price?: number;
  product_sale_price?: number;
  product_stock?: number;
  product_in_stock?: string;
  created_at?: Date;
}

class WishlistModel {
  // Get user's wishlist
  async getWishlistByUserId(userId: number): Promise<WishlistWithProduct[]>
  
  // Get wishlist item
  async getWishlistItem(userId: number, productId: number): Promise<Wishlist | null>
  
  // Add to wishlist
  async addToWishlist(userId: number, productId: number, preferences?: {
    notify_on_sale?: boolean;
    notify_on_stock?: boolean;
  }): Promise<Wishlist>
  
  // Remove from wishlist
  async removeFromWishlist(userId: number, productId: number): Promise<void>
  
  // Update notification preferences
  async updatePreferences(
    wishlistId: number, 
    notify_on_sale?: boolean, 
    notify_on_stock?: boolean
  ): Promise<Wishlist>
  
  // Check if product is in user's wishlist
  async isInWishlist(userId: number, productId: number): Promise<boolean>
  
  // Get wishlist count
  async getWishlistCount(userId: number): Promise<number>
  
  // Get products that need sale notifications
  async getProductsNeedingSaleNotification(): Promise<WishlistWithProduct[]>
  
  // Get products that need stock notifications
  async getProductsNeedingStockNotification(): Promise<WishlistWithProduct[]>
  
  // Record notification sent
  async recordNotification(notification: Omit<WishlistNotification, 'id' | 'created_at'>): Promise<WishlistNotification>
  
  // Update last notified timestamps
  async updateLastNotified(wishlistId: number, type: 'sale' | 'stock'): Promise<void>
}
```

### 2. Wishlist Service

**File**: `server/src/services/WishlistService.ts`

```typescript
export class WishlistService {
  private wishlistModel: WishlistModel;
  private emailService: EmailService;
  private pool: Pool;
  
  // Get user's wishlist with full product details
  async getWishlist(userId: number): Promise<WishlistWithProduct[]>
  
  // Add product to wishlist
  async addToWishlist(
    userId: number, 
    productId: number,
    preferences?: { notify_on_sale?: boolean; notify_on_stock?: boolean }
  ): Promise<Wishlist>
  
  // Remove from wishlist
  async removeFromWishlist(userId: number, productId: number): Promise<void>
  
  // Update notification preferences
  async updatePreferences(
    wishlistId: number,
    preferences: { notify_on_sale?: boolean; notify_on_stock?: boolean }
  ): Promise<Wishlist>
  
  // Check if product is wishlisted
  async isWishlisted(userId: number, productId: number): Promise<boolean>
  
  // Get wishlist count
  async getCount(userId: number): Promise<number>
  
  // Process sale notifications (called by cron job)
  async processSaleNotifications(): Promise<void>
  
  // Process stock notifications (called by cron job)
  async processStockNotifications(): Promise<void>
  
  // Send sale notification email
  private async sendSaleNotification(wishlist: WishlistWithProduct, product: Product): Promise<void>
  
  // Send stock notification email
  private async sendStockNotification(wishlist: WishlistWithProduct, product: Product): Promise<void>
}
```

### 3. Wishlist Controller

**File**: `server/src/controllers/wishlistController.ts`

```typescript
export class WishlistController {
  private wishlistService: WishlistService;
  
  // GET /api/wishlist
  // Get current user's wishlist
  getWishlist = async (req: Request, res: Response, next: NextFunction): Promise<void>
  
  // POST /api/wishlist
  // Add product to wishlist
  addToWishlist = async (req: Request, res: Response, next: NextFunction): Promise<void>
  
  // DELETE /api/wishlist/:productId
  // Remove product from wishlist
  removeFromWishlist = async (req: Request, res: Response, next: NextFunction): Promise<void>
  
  // PUT /api/wishlist/:productId/preferences
  // Update notification preferences
  updatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void>
  
  // GET /api/wishlist/count
  // Get wishlist item count
  getCount = async (req: Request, res: Response, next: NextFunction): Promise<void>
  
  // GET /api/wishlist/:productId/check
  // Check if product is in wishlist
  checkWishlist = async (req: Request, res: Response, next: NextFunction): Promise<void>
  
  // GET /api/wishlist/bulk-check
  // Check multiple products at once (for product listings)
  bulkCheck = async (req: Request, res: Response, next: NextFunction): Promise<void>
}
```

### 4. Wishlist Routes

**File**: `server/src/routes/wishlist.ts`

```typescript
import { Router } from 'express';
import { WishlistController } from '../controllers/wishlistController';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();
const controller = new WishlistController();

// All routes require authentication
router.use(requireAuth);

// Get wishlist
router.get('/', controller.getWishlist);

// Add to wishlist
router.post('/', 
  validateRequest({
    body: {
      productId: { type: 'number', required: true },
      notifyOnSale: { type: 'boolean', required: false },
      notifyOnStock: { type: 'boolean', required: false }
    }
  }),
  controller.addToWishlist
);

// Remove from wishlist
router.delete('/:productId', controller.removeFromWishlist);

// Update preferences
router.put('/:productId/preferences',
  validateRequest({
    body: {
      notifyOnSale: { type: 'boolean', required: false },
      notifyOnStock: { type: 'boolean', required: false }
    }
  }),
  controller.updatePreferences
);

// Get count
router.get('/count', controller.getCount);

// Check single product
router.get('/:productId/check', controller.checkWishlist);

// Bulk check (query param: ?productIds=1,2,3,4)
router.get('/bulk-check', controller.bulkCheck);

export default router;
```

### 5. Middleware Updates

**File**: `server/src/middleware/auth.ts`

- Ensure `requireAuth` middleware properly extracts user ID from session
- May need to add helper to get current user ID: `req.session.userId`

---

## Frontend Implementation

### 1. Wishlist Context

**File**: `src/contexts/WishlistContext.tsx`

```typescript
interface WishlistContextType {
  wishlist: Product[];
  wishlistIds: Set<number>;
  loading: boolean;
  addToWishlist: (productId: number) => Promise<void>;
  removeFromWishlist: (productId: number) => Promise<void>;
  isInWishlist: (productId: number) => boolean;
  refreshWishlist: () => Promise<void>;
  wishlistCount: number;
}

export const WishlistProvider: React.FC<{ children: ReactNode }>;
export const useWishlist: () => WishlistContextType;
```

**Features**:
- Cache wishlist in context for quick access
- Maintain Set of product IDs for O(1) lookup
- Auto-refresh on mount if authenticated
- Sync with backend

### 2. WishlistButton Component

**File**: `src/components/WishlistButton.tsx`

```typescript
interface WishlistButtonProps {
  productId: number;
  variant?: 'default' | 'outline' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

// Heart icon button that toggles wishlist status
// Shows filled heart if in wishlist, outline if not
// Handles authentication check
```

**Usage**:
- Used in product cards
- Used in product detail page
- Can be icon-only or with label

### 3. ProductCard Updates

**Files**: 
- `src/pages/Shop.tsx`
- `src/components/ProductCard.tsx` (if exists)

**Changes**:
- Add `WishlistButton` component to each product card
- Position: Top-right corner or near product image
- Show filled heart if product is wishlisted

### 4. ProductDetail Updates

**File**: `src/pages/ProductDetail.tsx`

**Changes**:
- Replace static "Add to Wishlist" button with `WishlistButton`
- Update button to show current wishlist status
- Handle authentication requirement (redirect to login if needed)

### 5. Wishlist Page

**File**: `src/pages/Wishlist.tsx`

**Features**:
- Display all wishlist items in grid layout
- Show product image, name, price, sale status
- Actions per item:
  - Remove from wishlist
  - Add to cart
  - View product
  - Toggle notification preferences
- Show empty state when wishlist is empty
- Filter/sort options
- Bulk actions (remove multiple, add all to cart)

**Layout**:
```
[Header with title and count]

[Product Grid]
  - Product Card
    - Image
    - Name
    - Price (with sale indicator)
    - Stock status
    - Actions: View | Add to Cart | Remove
    - Notification preferences toggle
```

### 6. Account Dashboard Integration

**File**: `src/pages/Account.tsx` or `src/pages/Profile.tsx`

**Changes**:
- Add "My Wishlist" section in account dashboard
- Show recent wishlist items (maybe last 5-10)
- Link to full wishlist page
- Show wishlist count badge

### 7. API Service

**File**: `src/services/api.ts` (add to existing)

```typescript
// Wishlist API methods
export const wishlistAPI = {
  // Get wishlist
  getWishlist: async (): Promise<ApiResponse<{ items: Product[] }>>
  
  // Add to wishlist
  addToWishlist: async (productId: number, preferences?: {
    notifyOnSale?: boolean;
    notifyOnStock?: boolean;
  }): Promise<ApiResponse<{ success: boolean }>>
  
  // Remove from wishlist
  removeFromWishlist: async (productId: number): Promise<ApiResponse<{ success: boolean }>>
  
  // Update preferences
  updatePreferences: async (
    productId: number, 
    preferences: { notifyOnSale?: boolean; notifyOnStock?: boolean }
  ): Promise<ApiResponse<{ success: boolean }>>
  
  // Get count
  getCount: async (): Promise<ApiResponse<{ count: number }>>
  
  // Check if product is wishlisted
  checkWishlist: async (productId: number): Promise<ApiResponse<{ isWishlisted: boolean }>>
  
  // Bulk check (for product listings)
  bulkCheck: async (productIds: number[]): Promise<ApiResponse<{ [productId: number]: boolean }>>
};
```

### 8. Header/Navigation Updates

**File**: `src/components/Header.tsx`

**Changes**:
- Add wishlist icon in header (next to cart icon)
- Show wishlist count badge
- Link to wishlist page
- Only show if user is authenticated

---

## Notification System

### 1. Email Templates

**Required Templates**:

#### A. Sale Notification Template

**Type**: `wishlist_sale_notification`

**Variables**:
- `customer_name` - User's first name
- `product_name` - Product name
- `product_url` - Link to product page
- `product_image` - Product primary image URL
- `regular_price` - Original price
- `sale_price` - Sale price
- `discount_amount` - Amount saved
- `discount_percent` - Discount percentage
- `unsubscribe_url` - Link to manage preferences

**Template**:
```
Subject: Great news! [product_name] is now on sale!

Hi [customer_name],

Good news! [product_name] from your wishlist is now on sale.

Regular Price: $[regular_price]
Sale Price: $[sale_price]
You Save: $[discount_amount] ([discount_percent]% off)

[View Product] [Add to Cart]

[Product Image]

You can manage your wishlist notification preferences here: [Manage Preferences]
```

#### B. Back-in-Stock Notification Template

**Type**: `wishlist_stock_notification`

**Variables**:
- `customer_name` - User's first name
- `product_name` - Product name
- `product_url` - Link to product page
- `product_image` - Product primary image URL
- `stock_quantity` - Available stock (if provided)
- `unsubscribe_url` - Link to manage preferences

**Template**:
```
Subject: [product_name] is back in stock!

Hi [customer_name],

Great news! [product_name] from your wishlist is now back in stock.

[Hurry! Get yours now] [View Product]

[Product Image]

Stock is limited, so don't wait!

You can manage your wishlist notification preferences here: [Manage Preferences]
```

### 2. Email Service Integration

**Updates to**: `server/src/services/EmailService.ts`

- Ensure templates can be retrieved and sent
- Use existing template engine
- Support unsubscribe links in emails

### 3. Notification Logic

**In**: `server/src/services/WishlistService.ts`

**Sale Detection**:
- Compare current `is_on_sale` status with previous state
- Check if `sale_price` < `regular_price`
- Verify sale dates are valid (between `sale_start_date` and `sale_end_date`)
- Only notify if `last_sale_notified_at` is null OR current sale is different from last notification

**Stock Detection**:
- Compare current `in_stock` ('1' or '0') with previous state
- Check if `stock` > 0
- Only notify if product transitions from out-of-stock to in-stock
- Track previous notification to avoid duplicates

---

## Background Jobs

### 1. Cron Job Configuration

**File**: `server/src/services/CronService.ts` (update existing)

**Jobs to Add**:

#### A. Wishlist Sale Checker
- **Schedule**: Every hour (`0 * * * *`)
- **Description**: Check for products that went on sale
- **Function**: `WishlistService.processSaleNotifications()`

#### B. Wishlist Stock Checker
- **Schedule**: Every 30 minutes (`*/30 * * * *`)
- **Description**: Check for products back in stock
- **Function**: `WishlistService.processStockNotifications()`

### 2. Notification Service

**File**: `server/src/services/WishlistNotificationService.ts`

```typescript
export class WishlistNotificationService {
  private wishlistService: WishlistService;
  private emailService: EmailService;
  
  // Process all sale notifications
  async checkSales(): Promise<{
    checked: number;
    notified: number;
    errors: number;
  }>
  
  // Process all stock notifications
  async checkStock(): Promise<{
    checked: number;
    notified: number;
    errors: number;
  }>
  
  // Check if product went on sale since last notification
  private async hasProductGoneOnSale(
    product: Product, 
    lastNotifiedAt?: Date
  ): Promise<boolean>
  
  // Check if product came back in stock
  private async hasProductComeBackInStock(
    product: Product,
    lastNotifiedAt?: Date
  ): Promise<boolean>
  
  // Send notification email
  private async sendNotification(
    wishlist: WishlistWithProduct,
    type: 'sale' | 'stock'
  ): Promise<void>
}
```

### 3. Cron Job Initialization

**File**: `server/src/index.ts`

```typescript
import { CronService } from './services/CronService';
import { WishlistNotificationService } from './services/WishlistNotificationService';

const cronService = new CronService();
const wishlistNotificationService = new WishlistNotificationService();

// Initialize cron jobs
cronService.initialize();

// Wishlist sale checker - runs every hour
cronService.addJob(
  'wishlist-sale-check',
  {
    schedule: '0 * * * *', // Every hour
    enabled: true,
    description: 'Check wishlist items for sales'
  },
  async () => {
    await wishlistNotificationService.checkSales();
  }
);

// Wishlist stock checker - runs every 30 minutes
cronService.addJob(
  'wishlist-stock-check',
  {
    schedule: '*/30 * * * *', // Every 30 minutes
    enabled: true,
    description: 'Check wishlist items for stock availability'
  },
  async () => {
    await wishlistNotificationService.checkStock();
  }
);
```

### 4. Notification Deduplication

**Strategy**:
- Track `last_sale_notified_at` and `last_stock_notified_at` in wishlist table
- Only send notification if:
  - For sales: Product is on sale AND (never notified OR sale_price changed)
  - For stock: Product is in stock AND (never notified OR was out of stock before)
- Store notification in `wishlist_notifications` table to prevent duplicates
- Update timestamps after successful email send

---

## API Endpoints

### 1. Get Wishlist
```
GET /api/wishlist
Authorization: Required (Session cookie)
Response: {
  success: true,
  data: {
    items: [
      {
        id: 1,
        product_id: 123,
        notify_on_sale: true,
        notify_on_stock: true,
        created_at: "2024-01-01T00:00:00Z",
        product: { ...ProductWithDetails }
      }
    ],
    count: 10
  }
}
```

### 2. Add to Wishlist
```
POST /api/wishlist
Authorization: Required
Body: {
  productId: 123,
  notifyOnSale?: true,
  notifyOnStock?: true
}
Response: {
  success: true,
  data: {
    wishlist: { ...Wishlist },
    message: "Added to wishlist"
  }
}
```

### 3. Remove from Wishlist
```
DELETE /api/wishlist/:productId
Authorization: Required
Response: {
  success: true,
  message: "Removed from wishlist"
}
```

### 4. Update Preferences
```
PUT /api/wishlist/:productId/preferences
Authorization: Required
Body: {
  notifyOnSale?: false,
  notifyOnStock?: true
}
Response: {
  success: true,
  data: {
    wishlist: { ...Wishlist }
  }
}
```

### 5. Get Wishlist Count
```
GET /api/wishlist/count
Authorization: Required
Response: {
  success: true,
  data: {
    count: 10
  }
}
```

### 6. Check Wishlist Status
```
GET /api/wishlist/:productId/check
Authorization: Required
Response: {
  success: true,
  data: {
    isWishlisted: true,
    wishlistId: 1
  }
}
```

### 7. Bulk Check (for product listings)
```
GET /api/wishlist/bulk-check?productIds=1,2,3,4,5
Authorization: Required
Response: {
  success: true,
  data: {
    "1": true,
    "2": false,
    "3": true,
    "4": false,
    "5": false
  }
}
```

---

## User Account Integration

### 1. Account Dashboard Section

**Location**: User account/profile page

**Display**:
- Wishlist count badge
- Recent wishlist items (last 3-5)
- Quick link to full wishlist page
- Notification preferences summary

### 2. Notification Preferences Page

**Optional**: Dedicated page for managing notification preferences

**Features**:
- List all wishlist items
- Toggle per-item notification preferences
- Global notification settings
- Email notification history

### 3. Authentication Requirements

**All wishlist actions require**:
- User to be logged in
- Valid session
- Redirect to login if not authenticated (for add to wishlist actions)

---

## Testing Requirements

### 1. Unit Tests

**Backend**:
- `WishlistModel` methods
- `WishlistService` methods
- `WishlistNotificationService` logic
- Sale detection logic
- Stock detection logic

### 2. Integration Tests

**Backend**:
- API endpoints (all CRUD operations)
- Authentication requirements
- Notification sending
- Error handling

**Frontend**:
- Wishlist context functionality
- WishlistButton component
- Wishlist page rendering
- API integration

### 3. E2E Tests

**Scenarios**:
1. User adds product to wishlist (authenticated)
2. User tries to add to wishlist (unauthenticated) → redirects to login
3. User removes from wishlist
4. User views wishlist page
5. User toggles notification preferences
6. Sale notification sent when product goes on sale
7. Stock notification sent when product comes back in stock
8. Duplicate notifications prevented

### 4. Manual Testing Checklist

- [ ] Add product to wishlist from product card
- [ ] Add product to wishlist from product detail page
- [ ] Remove product from wishlist
- [ ] View wishlist page
- [ ] Add to cart from wishlist
- [ ] Update notification preferences
- [ ] Verify sale notification email (test mode)
- [ ] Verify stock notification email (test mode)
- [ ] Test authentication redirects
- [ ] Test bulk check for product listings
- [ ] Verify wishlist persists across sessions
- [ ] Test empty wishlist state
- [ ] Verify notification deduplication

---

## Implementation Phases

### Phase 1: Database & Backend Core (Week 1)

**Tasks**:
- [ ] Create database migration for wishlist tables
- [ ] Create `WishlistModel` class
- [ ] Create `WishlistService` class
- [ ] Create `WishlistController` class
- [ ] Create wishlist routes
- [ ] Register routes in main server file
- [ ] Write unit tests for model and service

**Deliverables**:
- Migration file: `034_create_wishlist_tables.sql`
- Model: `server/src/models/wishlist.ts`
- Service: `server/src/services/WishlistService.ts`
- Controller: `server/src/controllers/wishlistController.ts`
- Routes: `server/src/routes/wishlist.ts`

### Phase 2: Frontend Core (Week 1-2)

**Tasks**:
- [ ] Create `WishlistContext`
- [ ] Create `WishlistButton` component
- [ ] Update product cards (Shop page, product listings)
- [ ] Update ProductDetail page
- [ ] Create Wishlist page
- [ ] Add API methods to `src/services/api.ts`
- [ ] Write component tests

**Deliverables**:
- Context: `src/contexts/WishlistContext.tsx`
- Component: `src/components/WishlistButton.tsx`
- Page: `src/pages/Wishlist.tsx`
- Updated: `src/pages/Shop.tsx`
- Updated: `src/pages/ProductDetail.tsx`

### Phase 3: Account Integration (Week 2)

**Tasks**:
- [ ] Add wishlist section to account dashboard
- [ ] Add wishlist icon to header
- [ ] Add wishlist count badge
- [ ] Create notification preferences UI (optional)
- [ ] Update navigation/routing

**Deliverables**:
- Updated: `src/pages/Account.tsx` or `src/pages/Profile.tsx`
- Updated: `src/components/Header.tsx`
- Route: `/wishlist` added to router

### Phase 4: Email Templates (Week 2)

**Tasks**:
- [ ] Create sale notification email template
- [ ] Create stock notification email template
- [ ] Add templates to database via migration
- [ ] Test template rendering
- [ ] Verify template variables

**Deliverables**:
- Migration: `035_add_wishlist_email_templates.sql`
- Email templates in database: `wishlist_sale_notification`, `wishlist_stock_notification`

### Phase 5: Notification Service (Week 3)

**Tasks**:
- [ ] Create `WishlistNotificationService`
- [ ] Implement sale detection logic
- [ ] Implement stock detection logic
- [ ] Integrate with EmailService
- [ ] Test notification sending
- [ ] Test deduplication logic

**Deliverables**:
- Service: `server/src/services/WishlistNotificationService.ts`
- Updated: `server/src/services/WishlistService.ts`

### Phase 6: Background Jobs (Week 3)

**Tasks**:
- [ ] Add cron jobs to CronService
- [ ] Configure sale checker (hourly)
- [ ] Configure stock checker (every 30 minutes)
- [ ] Test cron job execution
- [ ] Add error handling and logging
- [ ] Monitor job performance

**Deliverables**:
- Updated: `server/src/services/CronService.ts` (or job registration)
- Updated: `server/src/index.ts` (job initialization)

### Phase 7: Testing & Polish (Week 4)

**Tasks**:
- [ ] Write integration tests
- [ ] Write E2E tests
- [ ] Manual testing checklist
- [ ] Fix bugs and edge cases
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] Code review

**Deliverables**:
- Test files
- Bug fixes
- Documentation

---

## Additional Considerations

### Performance

1. **Indexes**: Ensure proper database indexes for fast queries
2. **Caching**: Consider caching wishlist data in context (already planned)
3. **Bulk Operations**: Use bulk check endpoint for product listings
4. **Query Optimization**: Join queries to fetch products with wishlist in one go

### Security

1. **Authentication**: All endpoints require authentication
2. **Authorization**: Users can only access their own wishlist
3. **Input Validation**: Validate product IDs, prevent SQL injection
4. **Rate Limiting**: Consider rate limits for wishlist operations

### User Experience

1. **Loading States**: Show loading indicators during API calls
2. **Error Messages**: Clear error messages for failures
3. **Toast Notifications**: Success/error toasts for actions
4. **Optimistic Updates**: Update UI immediately, sync with backend
5. **Empty States**: Friendly empty state when wishlist is empty
6. **Mobile Responsive**: Ensure wishlist works on mobile devices

### Edge Cases

1. **Product Deletion**: Handle deleted products in wishlist (cascade delete)
2. **Product Status Changes**: Handle inactive/draft products
3. **Email Failures**: Handle email sending failures gracefully
4. **Concurrent Modifications**: Handle race conditions
5. **Session Expiry**: Handle expired sessions gracefully

### Monitoring & Analytics

1. **Logging**: Log wishlist operations
2. **Metrics**: Track wishlist usage (adds, removes, notifications sent)
3. **Notifications**: Monitor notification sending success rates
4. **Performance**: Monitor API response times

### Future Enhancements

1. **Wishlist Sharing**: Allow users to share wishlist links
2. **Public Wishlists**: Option to make wishlist public
3. **Wishlist Comments**: Add notes to wishlist items
4. **Price Drop Alerts**: Notify when price drops below threshold
5. **Multiple Wishlists**: Allow users to create multiple lists
6. **Wishlist Analytics**: Show which items are most wishlisted
7. **Recommendations**: Suggest products based on wishlist

---

## Migration File Template

**File**: `server/src/migrations/sql/034_create_wishlist_tables.sql`

```sql
-- ============================================================================
-- Wishlist System Migration
-- Migration: 034_create_wishlist_tables.sql
-- Description: Creates tables for wishlist functionality with notifications
-- ============================================================================

-- Main wishlist table
CREATE TABLE IF NOT EXISTS wishlists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Notification preferences for this item
  notify_on_sale BOOLEAN DEFAULT true,
  notify_on_stock BOOLEAN DEFAULT true,
  
  -- Track notification history
  last_sale_notified_at TIMESTAMP,
  last_stock_notified_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one wishlist entry per user-product combination
  CONSTRAINT unique_user_product UNIQUE (user_id, product_id)
);

-- Wishlist notification log
CREATE TABLE IF NOT EXISTS wishlist_notifications (
  id SERIAL PRIMARY KEY,
  wishlist_id INTEGER NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  notification_type VARCHAR(20) NOT NULL,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP,
  email_log_id INTEGER REFERENCES email_logs(id),
  
  -- Product state at notification time
  product_price DECIMAL(10,2),
  product_sale_price DECIMAL(10,2),
  product_stock INTEGER,
  product_in_stock VARCHAR(1),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT wishlist_notifications_type_check CHECK (
    notification_type IN ('sale', 'stock')
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON wishlists(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_notify_sale ON wishlists(notify_on_sale, product_id) WHERE notify_on_sale = true;
CREATE INDEX IF NOT EXISTS idx_wishlists_notify_stock ON wishlists(notify_on_stock, product_id) WHERE notify_on_stock = true;
CREATE INDEX IF NOT EXISTS idx_wishlists_sale_check ON wishlists(notify_on_sale, product_id, last_sale_notified_at) WHERE notify_on_sale = true;
CREATE INDEX IF NOT EXISTS idx_wishlists_stock_check ON wishlists(notify_on_stock, product_id, last_stock_notified_at) WHERE notify_on_stock = true;

CREATE INDEX IF NOT EXISTS idx_wishlist_notifications_wishlist ON wishlist_notifications(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_notifications_type ON wishlist_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_wishlist_notifications_sent ON wishlist_notifications(email_sent, created_at);

-- Trigger for updated_at
CREATE TRIGGER update_wishlists_updated_at
  BEFORE UPDATE ON wishlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE wishlists IS 'User wishlist with notification preferences';
COMMENT ON TABLE wishlist_notifications IS 'Log of sent wishlist notifications';
```

---

## Success Criteria

The implementation is considered complete when:

1. ✅ Users can add/remove products from wishlist
2. ✅ Wishlist persists in user account
3. ✅ Heart button appears on all product cards
4. ✅ Wishlist page displays all saved items
5. ✅ Users receive email when wishlist item goes on sale
6. ✅ Users receive email when wishlist item comes back in stock
7. ✅ Notifications are not duplicated
8. ✅ All API endpoints work correctly
9. ✅ Frontend integrates seamlessly with existing design
10. ✅ Tests pass
11. ✅ Documentation is complete

---

**Document Status**: Planning Complete  
**Next Step**: Begin Phase 1 implementation

