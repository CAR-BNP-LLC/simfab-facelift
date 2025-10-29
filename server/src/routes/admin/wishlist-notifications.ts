/**
 * Admin Wishlist Notification Routes
 * Routes for testing and managing wishlist notifications
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { AdminWishlistNotificationController } from '../../controllers/adminWishlistNotificationController';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { adminRateLimiter } from '../../middleware/rateLimiter';

export const createWishlistNotificationRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new AdminWishlistNotificationController(pool);

  // Apply admin authentication and rate limiting
  router.use(requireAuth, requireAdmin, adminRateLimiter);

  /**
   * @route   POST /api/admin/wishlist-notifications/check-sales
   * @desc    Manually trigger wishlist sale notification check
   * @access  Admin
   */
  router.post('/check-sales', controller.checkSales);

  /**
   * @route   POST /api/admin/wishlist-notifications/check-stock
   * @desc    Manually trigger wishlist stock notification check
   * @access  Admin
   */
  router.post('/check-stock', controller.checkStock);

  /**
   * @route   GET /api/admin/wishlist-notifications/stats
   * @desc    Get wishlist notification statistics
   * @access  Admin
   */
  router.get('/stats', controller.getStats);

  /**
   * @route   GET /api/admin/wishlist-notifications/history/:wishlistId
   * @desc    Get notification history for a specific wishlist item
   * @access  Admin
   */
  router.get('/history/:wishlistId', controller.getWishlistHistory);

  return router;
};

