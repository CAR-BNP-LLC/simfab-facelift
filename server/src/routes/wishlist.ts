/**
 * Wishlist Routes
 * Routes for wishlist operations
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { WishlistController } from '../controllers/wishlistController';
import { requireAuth } from '../middleware/auth';

export const createWishlistRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new WishlistController(pool);

  // All routes require authentication
  router.use(requireAuth);

  /**
   * @route   GET /api/wishlist
   * @desc    Get current user's wishlist
   * @access  Private
   */
  router.get('/', controller.getWishlist);

  /**
   * @route   POST /api/wishlist
   * @desc    Add product to wishlist
   * @access  Private
   */
  router.post('/', controller.addToWishlist);

  /**
   * @route   GET /api/wishlist/count
   * @desc    Get wishlist item count
   * @access  Private
   */
  router.get('/count', controller.getCount);

  /**
   * @route   GET /api/wishlist/bulk-check
   * @desc    Bulk check wishlist status for multiple products
   * @access  Private
   */
  router.get('/bulk-check', controller.bulkCheck);

  /**
   * @route   DELETE /api/wishlist/:productId
   * @desc    Remove product from wishlist
   * @access  Private
   */
  router.delete('/:productId', controller.removeFromWishlist);

  /**
   * @route   PUT /api/wishlist/:productId/preferences
   * @desc    Update notification preferences for wishlist item
   * @access  Private
   */
  router.put('/:productId/preferences', controller.updatePreferences);

  /**
   * @route   GET /api/wishlist/:productId/check
   * @desc    Check if product is in wishlist
   * @access  Private
   */
  router.get('/:productId/check', controller.checkWishlist);

  return router;
};

