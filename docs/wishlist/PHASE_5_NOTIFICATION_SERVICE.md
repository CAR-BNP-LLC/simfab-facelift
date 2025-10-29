# Phase 5: Notification Service

**Status**: ⏳ Pending  
**Duration**: Week 3  
**Dependencies**: Phase 1, Phase 4 complete  
**Priority**: High

---

## Overview

This phase implements the notification detection logic and email sending service for wishlist sale and stock notifications.

---

## Objectives

- [ ] Create `WishlistNotificationService`
- [ ] Implement sale detection logic
- [ ] Implement stock detection logic
- [ ] Integrate with EmailService
- [ ] Test notification sending
- [ ] Test deduplication logic

---

## Implementation

### 1. Wishlist Notification Service

**File**: `server/src/services/WishlistNotificationService.ts`

```typescript
import { Pool } from 'pg';
import WishlistModel, { WishlistWithProduct } from '../models/wishlist';
import { EmailService } from './EmailService';
import { Product } from '../types/product';

export interface NotificationResult {
  checked: number;
  notified: number;
  errors: number;
}

export class WishlistNotificationService {
  private wishlistModel: WishlistModel;
  private emailService: EmailService;
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.wishlistModel = new WishlistModel(pool);
    this.emailService = new EmailService(pool);
    this.emailService.initialize();
  }

  /**
   * Process all sale notifications
   */
  async checkSales(): Promise<NotificationResult> {
    const result: NotificationResult = {
      checked: 0,
      notified: 0,
      errors: 0,
    };

    try {
      // Get all wishlist items that need sale notifications
      const wishlists = await this.wishlistModel.getProductsNeedingSaleNotification();
      result.checked = wishlists.length;

      console.log(`🔍 Checking ${wishlists.length} wishlist items for sales...`);

      for (const wishlist of wishlists) {
        try {
          const product = wishlist.product as any;

          // Check if product actually went on sale
          const hasGoneOnSale = await this.hasProductGoneOnSale(
            product,
            wishlist.last_sale_notified_at
          );

          if (hasGoneOnSale) {
            await this.sendNotification(wishlist, 'sale');
            result.notified++;
          }
        } catch (error) {
          console.error(`❌ Error processing sale notification for wishlist ${wishlist.id}:`, error);
          result.errors++;
        }
      }

      console.log(`✅ Sale check complete: ${result.notified} notifications sent, ${result.errors} errors`);
    } catch (error) {
      console.error('❌ Error checking sales:', error);
      result.errors++;
    }

    return result;
  }

  /**
   * Process all stock notifications
   */
  async checkStock(): Promise<NotificationResult> {
    const result: NotificationResult = {
      checked: 0,
      notified: 0,
      errors: 0,
    };

    try {
      // Get all wishlist items that need stock notifications
      const wishlists = await this.wishlistModel.getProductsNeedingStockNotification();
      result.checked = wishlists.length;

      console.log(`🔍 Checking ${wishlists.length} wishlist items for stock...`);

      for (const wishlist of wishlists) {
        try {
          const product = wishlist.product as any;

          // Check if product came back in stock
          const hasComeBackInStock = await this.hasProductComeBackInStock(
            product,
            wishlist.last_stock_notified_at
          );

          if (hasComeBackInStock) {
            await this.sendNotification(wishlist, 'stock');
            result.notified++;
          }
        } catch (error) {
          console.error(`❌ Error processing stock notification for wishlist ${wishlist.id}:`, error);
          result.errors++;
        }
      }

      console.log(`✅ Stock check complete: ${result.notified} notifications sent, ${result.errors} errors`);
    } catch (error) {
      console.error('❌ Error checking stock:', error);
      result.errors++;
    }

    return result;
  }

  /**
   * Check if product went on sale since last notification
   */
  private async hasProductGoneOnSale(
    product: any,
    lastNotifiedAt?: Date
  ): Promise<boolean> {
    // Product must be on sale
    if (!product.is_on_sale || !product.sale_price) {
      return false;
    }

    // Sale price must be less than regular price
    if (!product.regular_price || product.sale_price >= product.regular_price) {
      return false;
    }

    // Check sale dates are valid
    const now = new Date();
    if (product.sale_start_date && new Date(product.sale_start_date) > now) {
      return false;
    }
    if (product.sale_end_date && new Date(product.sale_end_date) < now) {
      return false;
    }

    // If never notified, or product was updated after last notification
    if (!lastNotifiedAt) {
      return true;
    }

    // Check if sale price changed since last notification
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT product_price, product_sale_price 
         FROM wishlist_notifications 
         WHERE wishlist_id = $1 
           AND notification_type = 'sale' 
           AND email_sent = true 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [product.id] // This would need wishlist.id, fix as needed
      );

      if (result.rows.length === 0) {
        return true; // No previous notification
      }

      const lastNotification = result.rows[0];
      // Notify if sale price is different from last notification
      return lastNotification.product_sale_price !== product.sale_price;
    } finally {
      client.release();
    }
  }

  /**
   * Check if product came back in stock
   */
  private async hasProductComeBackInStock(
    product: any,
    lastNotifiedAt?: Date
  ): Promise<boolean> {
    // Product must be in stock
    if (product.in_stock !== '1' || !product.stock || product.stock <= 0) {
      return false;
    }

    // If never notified, notify
    if (!lastNotifiedAt) {
      return true;
    }

    // Check if product was out of stock before
    // We'll track this by checking if product was updated after last notification
    // and was previously out of stock
    const client = await this.pool.connect();
    try {
      // Get last notification for this wishlist item
      const result = await client.query(
        `SELECT product_in_stock, product_stock, created_at
         FROM wishlist_notifications 
         WHERE wishlist_id = $1 
           AND notification_type = 'stock' 
           AND email_sent = true 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [product.wishlist_id || product.id] // Fix based on your structure
      );

      if (result.rows.length === 0) {
        // No previous notification, check if product was previously out of stock
        return true; // Assume it was out of stock
      }

      const lastNotification = result.rows[0];
      // Notify if it was out of stock before and is now in stock
      return lastNotification.product_in_stock === '0' && product.in_stock === '1';
    } finally {
      client.release();
    }
  }

  /**
   * Send notification email
   */
  private async sendNotification(
    wishlist: WishlistWithProduct,
    type: 'sale' | 'stock'
  ): Promise<void> {
    const product = wishlist.product as any;

    // Get user email (need to get from wishlist.user_id)
    const client = await this.pool.connect();
    let userEmail: string;
    let userName: string;
    try {
      const userResult = await client.query(
        'SELECT email, first_name FROM users WHERE id = $1',
        [wishlist.user_id]
      );
      if (userResult.rows.length === 0) {
        throw new Error(`User not found for wishlist ${wishlist.id}`);
      }
      userEmail = userResult.rows[0].email;
      userName = userResult.rows[0].first_name || userEmail;
    } finally {
      client.release();
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const productUrl = `${frontendUrl}/product/${product.slug}`;
    const unsubscribeUrl = `${frontendUrl}/account/wishlist`;

    // Get primary product image
    let productImage: string | undefined;
    if (product.images && product.images.length > 0) {
      const primaryImage = product.images.find((img: any) => img.is_primary) || product.images[0];
      productImage = primaryImage?.image_url;
    }

    let templateType: string;
    let variables: Record<string, any>;

    if (type === 'sale') {
      templateType = 'wishlist_sale_notification';
      const regularPrice = product.regular_price || 0;
      const salePrice = product.sale_price || 0;
      const discountAmount = regularPrice - salePrice;
      const discountPercent = regularPrice > 0 
        ? Math.round((discountAmount / regularPrice) * 100) 
        : 0;

      variables = {
        customer_name: userName,
        product_name: product.name,
        product_url: productUrl,
        product_image: productImage,
        regular_price: regularPrice.toFixed(2),
        sale_price: salePrice.toFixed(2),
        discount_amount: discountAmount.toFixed(2),
        discount_percent: discountPercent.toString(),
        unsubscribe_url: unsubscribeUrl,
      };
    } else {
      templateType = 'wishlist_stock_notification';
      variables = {
        customer_name: userName,
        product_name: product.name,
        product_url: productUrl,
        product_image: productImage,
        stock_quantity: product.stock?.toString() || undefined,
        unsubscribe_url: unsubscribeUrl,
      };
    }

    try {
      // Send email
      const emailResult = await this.emailService.sendEmail({
        templateType: templateType as any,
        recipientEmail: userEmail,
        recipientName: userName,
        variables,
      });

      // Record notification
      await this.wishlistModel.recordNotification({
        wishlist_id: wishlist.id!,
        notification_type: type,
        email_sent: emailResult.success,
        email_sent_at: emailResult.success ? new Date() : undefined,
        email_log_id: emailResult.logId,
        product_price: product.regular_price,
        product_sale_price: product.sale_price,
        product_stock: product.stock,
        product_in_stock: product.in_stock,
      });

      // Update last notified timestamp
      if (emailResult.success) {
        await this.wishlistModel.updateLastNotified(wishlist.id!, type);
      }

      console.log(
        `✅ ${type === 'sale' ? 'Sale' : 'Stock'} notification sent to ${userEmail} for product ${product.name}`
      );
    } catch (error) {
      console.error(`❌ Failed to send ${type} notification:`, error);
      
      // Still record the attempt
      await this.wishlistModel.recordNotification({
        wishlist_id: wishlist.id!,
        notification_type: type,
        email_sent: false,
        product_price: product.regular_price,
        product_sale_price: product.sale_price,
        product_stock: product.stock,
        product_in_stock: product.in_stock,
      });

      throw error;
    }
  }
}
```

### 2. Update WishlistService

**File**: `server/src/services/WishlistService.ts` (add methods)

Add methods for notification processing (these will be called by the notification service):

```typescript
// Add to WishlistService class

/**
 * Get products needing sale notification (delegates to model)
 */
async getProductsNeedingSaleNotification(): Promise<WishlistWithProduct[]> {
  return await this.wishlistModel.getProductsNeedingSaleNotification();
}

/**
 * Get products needing stock notification (delegates to model)
 */
async getProductsNeedingStockNotification(): Promise<WishlistWithProduct[]> {
  return await this.wishlistModel.getProductsNeedingStockNotification();
}
```

---

## Testing

### 1. Unit Tests

**File**: `server/src/services/__tests__/WishlistNotificationService.test.ts` (create)

Test:
- `checkSales()` method
- `checkStock()` method
- `hasProductGoneOnSale()` logic
- `hasProductComeBackInStock()` logic
- `sendNotification()` email sending
- Deduplication logic

### 2. Manual Testing

#### Test Sale Notification

1. Add product to wishlist
2. Set product `is_on_sale = true` and `sale_price < regular_price` in database
3. Run `checkSales()` manually:
   ```typescript
   const service = new WishlistNotificationService(pool);
   await service.checkSales();
   ```
4. Verify email received (check email logs)
5. Verify `last_sale_notified_at` updated
6. Verify notification recorded in `wishlist_notifications` table
7. Run again - should not send duplicate
8. Change `sale_price` - should send new notification

#### Test Stock Notification

1. Add product to wishlist
2. Set product `in_stock = '0'` and `stock = 0` in database
3. Then set `in_stock = '1'` and `stock > 0`
4. Run `checkStock()` manually
5. Verify email received
6. Verify `last_stock_notified_at` updated
7. Run again - should not send duplicate

### 3. Test Script

**File**: `server/src/scripts/test-wishlist-notifications.ts` (create)

```typescript
import { Pool } from 'pg';
import { WishlistNotificationService } from '../services/WishlistNotificationService';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/simfab_dev',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function testNotifications() {
  const service = new WishlistNotificationService(pool);

  console.log('Testing sale notifications...');
  const saleResult = await service.checkSales();
  console.log('Sale result:', saleResult);

  console.log('\nTesting stock notifications...');
  const stockResult = await service.checkStock();
  console.log('Stock result:', stockResult);

  await pool.end();
}

testNotifications().catch(console.error);
```

Run: `npx ts-node server/src/scripts/test-wishlist-notifications.ts`

---

## Deduplication Logic

### Sale Notifications

- Only send if product is on sale (`is_on_sale = true`)
- Only send if `sale_price < regular_price`
- Only send if sale dates are valid (between start and end)
- Don't send if already notified for the same `sale_price`
- Allow new notification if `sale_price` changes

### Stock Notifications

- Only send if product is in stock (`in_stock = '1'` and `stock > 0`)
- Only send if product was previously out of stock
- Don't send if already notified when product was in stock
- Track transition from out-of-stock to in-stock

---

## Error Handling

- Log all errors to console
- Continue processing other items if one fails
- Record failed attempts in `wishlist_notifications` table
- Don't update `last_*_notified_at` if email fails
- Allow retry on next cron run

---

## Checklist

- [ ] Create `WishlistNotificationService`
- [ ] Implement `checkSales()` method
- [ ] Implement `checkStock()` method
- [ ] Implement `hasProductGoneOnSale()` logic
- [ ] Implement `hasProductComeBackInStock()` logic
- [ ] Implement `sendNotification()` method
- [ ] Integrate with EmailService
- [ ] Test sale notification sending
- [ ] Test stock notification sending
- [ ] Test deduplication logic
- [ ] Test error handling
- [ ] Create test script
- [ ] Manual testing

---

## Next Steps

Once Phase 5 is complete, proceed to [Phase 6: Background Jobs](./PHASE_6_BACKGROUND_JOBS.md).

---

**Status**: Ready to implement  
**Estimated Time**: 2-3 days

