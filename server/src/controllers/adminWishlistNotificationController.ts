/**
 * Admin Wishlist Notification Controller
 * Admin endpoints for testing and managing wishlist notifications
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { WishlistNotificationService, NotificationResult } from '../services/WishlistNotificationService';
import { successResponse, errorResponse } from '../utils/response';

export class AdminWishlistNotificationController {
  private pool: Pool;
  private notificationService: WishlistNotificationService;

  constructor(pool: Pool) {
    this.pool = pool;
    this.notificationService = new WishlistNotificationService(pool);
  }

  /**
   * Manually trigger sale notification check
   * POST /api/admin/wishlist-notifications/check-sales
   */
  checkSales = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔔 Admin triggered wishlist sale check');
      const result: NotificationResult = await this.notificationService.checkSales();
      
      res.json(successResponse({
        message: 'Wishlist sale check completed',
        data: {
          checked: result.checked,
          notified: result.notified,
          errors: result.errors,
          timestamp: new Date().toISOString(),
        },
      }));
    } catch (error: any) {
      console.error('Error in wishlist sale check:', error);
      next(error);
    }
  };

  /**
   * Manually trigger stock notification check
   * POST /api/admin/wishlist-notifications/check-stock
   */
  checkStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔔 Admin triggered wishlist stock check');
      const result: NotificationResult = await this.notificationService.checkStock();
      
      res.json(successResponse({
        message: 'Wishlist stock check completed',
        data: {
          checked: result.checked,
          notified: result.notified,
          errors: result.errors,
          timestamp: new Date().toISOString(),
        },
      }));
    } catch (error: any) {
      console.error('Error in wishlist stock check:', error);
      next(error);
    }
  };

  /**
   * Get wishlist notification statistics
   * GET /api/admin/wishlist-notifications/stats
   */
  getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const client = await this.pool.connect();
    try {
      // Get notification stats
      const statsResult = await client.query(`
        SELECT 
          notification_type,
          COUNT(*) as total_notifications,
          COUNT(*) FILTER (WHERE email_sent = true) as sent_count,
          COUNT(*) FILTER (WHERE email_sent = false) as failed_count,
          MAX(created_at) as last_notification_at
        FROM wishlist_notifications
        GROUP BY notification_type
        ORDER BY notification_type
      `);

      // Get wishlist stats
      const wishlistStatsResult = await client.query(`
        SELECT 
          COUNT(*) as total_wishlists,
          COUNT(*) FILTER (WHERE notify_on_sale = true) as sale_notifications_enabled,
          COUNT(*) FILTER (WHERE notify_on_stock = true) as stock_notifications_enabled,
          COUNT(*) FILTER (WHERE last_sale_notified_at IS NOT NULL) as sale_notified_count,
          COUNT(*) FILTER (WHERE last_stock_notified_at IS NOT NULL) as stock_notified_count
        FROM wishlists
      `);

      // Get recent notifications
      const recentNotificationsResult = await client.query(`
        SELECT 
          wn.*,
          w.user_id,
          p.name as product_name,
          u.email as user_email
        FROM wishlist_notifications wn
        INNER JOIN wishlists w ON wn.wishlist_id = w.id
        INNER JOIN products p ON w.product_id = p.id
        LEFT JOIN users u ON w.user_id = u.id
        ORDER BY wn.created_at DESC
        LIMIT 20
      `);

      res.json(successResponse({
        data: {
          notifications: {
            byType: statsResult.rows,
            recent: recentNotificationsResult.rows,
          },
          wishlists: wishlistStatsResult.rows[0] || {},
        },
      }));
    } catch (error: any) {
      console.error('Error fetching wishlist notification stats:', error);
      next(error);
    } finally {
      client.release();
    }
  };

  /**
   * Get notification history for a specific wishlist
   * GET /api/admin/wishlist-notifications/history/:wishlistId
   */
  getWishlistHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const client = await this.pool.connect();
    try {
      const { wishlistId } = req.params;
      
      const notificationsResult = await client.query(`
        SELECT 
          wn.*,
          p.name as product_name,
          u.email as user_email,
          u.first_name,
          u.last_name
        FROM wishlist_notifications wn
        INNER JOIN wishlists w ON wn.wishlist_id = w.id
        INNER JOIN products p ON w.product_id = p.id
        LEFT JOIN users u ON w.user_id = u.id
        WHERE wn.wishlist_id = $1
        ORDER BY wn.created_at DESC
      `, [wishlistId]);

      const wishlistResult = await client.query(`
        SELECT 
          w.*,
          p.name as product_name,
          p.sku,
          u.email as user_email
        FROM wishlists w
        INNER JOIN products p ON w.product_id = p.id
        LEFT JOIN users u ON w.user_id = u.id
        WHERE w.id = $1
      `, [wishlistId]);

      if (wishlistResult.rows.length === 0) {
        res.status(404).json(errorResponse('Wishlist not found'));
        return;
      }

      res.json(successResponse({
        data: {
          wishlist: wishlistResult.rows[0],
          notifications: notificationsResult.rows,
        },
      }));
    } catch (error: any) {
      console.error('Error fetching wishlist notification history:', error);
      next(error);
    } finally {
      client.release();
    }
  };
}

