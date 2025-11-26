/**
 * Wishlist Notification Service
 * Handles sending notifications for wishlist items that go on sale or come back in stock
 */

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
    const startTime = Date.now();
    const result: NotificationResult = {
      checked: 0,
      notified: 0,
      errors: 0,
    };

    try {
      // Get all wishlist items that need sale notifications
      const wishlists = await this.wishlistModel.getProductsNeedingSaleNotification();
      result.checked = wishlists.length;

      console.log(`🔍 [Wishlist Sale Check] Checking ${wishlists.length} items...`);

      for (const wishlist of wishlists) {
        try {
          const product = wishlist.product as any;

          // Check if product actually went on sale
          const hasGoneOnSale = await this.hasProductGoneOnSale(
            product,
            wishlist.last_sale_notified_at,
            wishlist.id
          );

          if (hasGoneOnSale) {
            await this.sendNotification(wishlist, 'sale');
            result.notified++;
            console.log(`📧 [Wishlist Sale] Notified user ${wishlist.user_id} about ${product.name}`);
          }
        } catch (error) {
          console.error(`❌ [Wishlist Sale] Error for wishlist ${wishlist.id}:`, error);
          result.errors++;
        }
      }

      const duration = Date.now() - startTime;
      console.log(
        `✅ [Wishlist Sale Check] Complete in ${duration}ms: ` +
        `${result.notified} notified, ${result.errors} errors, ${result.checked} checked`
      );
    } catch (error) {
      console.error('❌ [Wishlist Sale Check] Fatal error:', error);
      result.errors++;
    }

    return result;
  }

  /**
   * Process all stock notifications
   */
  async checkStock(): Promise<NotificationResult> {
    const startTime = Date.now();
    const result: NotificationResult = {
      checked: 0,
      notified: 0,
      errors: 0,
    };

    try {
      // Get all wishlist items that need stock notifications
      const wishlists = await this.wishlistModel.getProductsNeedingStockNotification();
      result.checked = wishlists.length;

      console.log(`🔍 [Wishlist Stock Check] Checking ${wishlists.length} items...`);

      for (const wishlist of wishlists) {
        try {
          const product = wishlist.product as any;

          // Check if product came back in stock
          const hasComeBackInStock = await this.hasProductComeBackInStock(
            product,
            wishlist.last_stock_notified_at,
            wishlist.id
          );

          if (hasComeBackInStock) {
            await this.sendNotification(wishlist, 'stock');
            result.notified++;
            console.log(`📧 [Wishlist Stock] Notified user ${wishlist.user_id} about ${product.name}`);
          }
        } catch (error) {
          console.error(`❌ [Wishlist Stock] Error for wishlist ${wishlist.id}:`, error);
          result.errors++;
        }
      }

      const duration = Date.now() - startTime;
      console.log(
        `✅ [Wishlist Stock Check] Complete in ${duration}ms: ` +
        `${result.notified} notified, ${result.errors} errors, ${result.checked} checked`
      );
    } catch (error) {
      console.error('❌ [Wishlist Stock Check] Fatal error:', error);
      result.errors++;
    }

    return result;
  }

  /**
   * Check if product went on sale since last notification
   */
  private async hasProductGoneOnSale(
    product: any,
    lastNotifiedAt?: Date,
    wishlistId?: number
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

    // If never notified, notify
    if (!lastNotifiedAt) {
      return true;
    }

    // Check if sale price changed since last notification
    if (wishlistId && lastNotifiedAt) {
      const client = await this.pool.connect();
      try {
        const result = await client.query(
          `SELECT product_sale_price 
           FROM wishlist_notifications 
           WHERE wishlist_id = $1 
             AND notification_type = 'sale' 
             AND email_sent = true 
           ORDER BY created_at DESC 
           LIMIT 1`,
          [wishlistId]
        );

        if (result.rows.length > 0) {
          const lastNotification = result.rows[0];
          const lastSalePrice = parseFloat(lastNotification.product_sale_price) || 0;
          const currentSalePrice = parseFloat(product.sale_price) || 0;
          // Notify if sale price is different from last notification
          return lastSalePrice !== currentSalePrice;
        }
      } finally {
        client.release();
      }
    }
    
    // If no previous notification or price changed, notify
    return true;
  }

  /**
   * Check if product came back in stock
   */
  private async hasProductComeBackInStock(
    product: any,
    lastNotifiedAt?: Date,
    wishlistId?: number
  ): Promise<boolean> {
    // Product must be in stock
    if (product.in_stock !== '1' || !product.stock || product.stock <= 0) {
      return false;
    }

    // If never notified, notify (assume it was out of stock)
    if (!lastNotifiedAt) {
      return true;
    }

    // Check if product was out of stock before
    if (wishlistId && lastNotifiedAt) {
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
          [wishlistId]
        );

        if (result.rows.length === 0) {
          // No previous notification, assume it was out of stock
          return true;
        }

        const lastNotification = result.rows[0];
        // Notify if it was out of stock before and is now in stock
        return lastNotification.product_in_stock === '0' && product.in_stock === '1';
      } finally {
        client.release();
      }
    }
    
    // If never notified, assume it was out of stock
    return true;
  }

  /**
   * Send notification email
   */
  private async sendNotification(
    wishlist: WishlistWithProduct,
    type: 'sale' | 'stock'
  ): Promise<void> {
    const product = wishlist.product as any;

    // Get user email and name
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
      userName = userResult.rows[0].first_name || userEmail.split('@')[0];
    } finally {
      client.release();
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const productUrl = `${frontendUrl}/product/${product.slug}`;
    const unsubscribeUrl = `${frontendUrl}/wishlist`;

    // Get primary product image
    let productImage: string = '';
    const client2 = await this.pool.connect();
    try {
      const imageResult = await client2.query(
        `SELECT image_url 
         FROM product_images 
         WHERE product_id = $1 
         ORDER BY is_primary DESC, sort_order ASC 
         LIMIT 1`,
        [product.id]
      );
      
      if (imageResult.rows.length > 0) {
        productImage = imageResult.rows[0].image_url;
        // Make absolute URL if relative
        if (productImage && !productImage.startsWith('http')) {
          productImage = `${frontendUrl}${productImage.startsWith('/') ? '' : '/'}${productImage}`;
        }
      }
    } finally {
      client2.release();
    }

    let templateType: string;
    let variables: Record<string, any>;

    if (type === 'sale') {
      templateType = 'wishlist_sale_notification';
      const regularPrice = parseFloat(product.regular_price) || 0;
      const salePrice = parseFloat(product.sale_price) || 0;
      const discountAmount = regularPrice - salePrice;
      const discountPercent = regularPrice > 0 
        ? Math.round((discountAmount / regularPrice) * 100) 
        : 0;

      variables = {
        customer_name: userName,
        product_name: product.name,
        product_url: productUrl,
        product_image: productImage || '',
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
        product_image: productImage || '',
        stock_quantity: product.stock?.toString() || '',
        unsubscribe_url: unsubscribeUrl,
      };
    }

    try {
      // Send email
      // Default to 'us' region for wishlist notifications (could be enhanced to detect from user preferences)
      const region: 'us' | 'eu' = 'us';
      
      const emailResult = await this.emailService.sendEmail({
        templateType: templateType as any,
        recipientEmail: userEmail,
        recipientName: userName,
        variables,
        region: region
      });

      // Record notification
      await this.wishlistModel.recordNotification({
        wishlist_id: wishlist.id!,
        notification_type: type,
        email_sent: emailResult.success,
        email_sent_at: emailResult.success ? new Date() : undefined,
        email_log_id: emailResult.logId,
        product_price: product.regular_price ? parseFloat(product.regular_price) : undefined,
        product_sale_price: product.sale_price ? parseFloat(product.sale_price) : undefined,
        product_stock: product.stock ? parseInt(product.stock, 10) : undefined,
        product_in_stock: product.in_stock,
      });

      // Update last notified timestamp
      if (emailResult.success) {
        await this.wishlistModel.updateLastNotified(wishlist.id!, type);
      }

      if (emailResult.success) {
        console.log(
          `✅ ${type === 'sale' ? 'Sale' : 'Stock'} notification sent to ${userEmail} for product ${product.name}`
        );
      } else {
        console.warn(
          `⚠️ ${type === 'sale' ? 'Sale' : 'Stock'} notification failed for ${userEmail}: ${emailResult.error}`
        );
      }
    } catch (error) {
      console.error(`❌ Failed to send ${type} notification:`, error);
      
      // Still record the attempt
      await this.wishlistModel.recordNotification({
        wishlist_id: wishlist.id!,
        notification_type: type,
        email_sent: false,
        product_price: product.regular_price ? parseFloat(product.regular_price) : undefined,
        product_sale_price: product.sale_price ? parseFloat(product.sale_price) : undefined,
        product_stock: product.stock ? parseInt(product.stock, 10) : undefined,
        product_in_stock: product.in_stock,
      });

      throw error;
    }
  }
}

