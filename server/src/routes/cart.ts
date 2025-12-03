/**
 * Cart Routes
 * Routes for shopping cart operations
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { CartController } from '../controllers/cartController';
import {
  validateRequest,
  addToCartSchema,
  updateCartItemSchema,
  applyCouponSchema
} from '../validators/cart';
import { apiRateLimiter } from '../middleware/rateLimiter';

export const createCartRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new CartController(pool);

  // Apply rate limiting
  router.use(apiRateLimiter);

  /**
   * @route   GET /api/cart
   * @desc    Get current cart with items
   * @access  Public (session-based)
   */
  router.get(
    '/',
    controller.getCart
  );

  /**
   * @route   GET /api/cart/validate
   * @desc    Validate cart for checkout (check stock, etc.)
   * @access  Public
   */
  router.get(
    '/validate',
    controller.validateCart
  );

  /**
   * @route   GET /api/cart/count
   * @desc    Get cart item count
   * @access  Public
   */
  router.get(
    '/count',
    controller.getItemCount
  );

  /**
   * @route   POST /api/cart/add
   * @desc    Add item to cart
   * @access  Public
   */
  router.post(
    '/add',
    validateRequest(addToCartSchema),
    controller.addItem
  );

  /**
   * @route   PUT /api/cart/items/:itemId
   * @desc    Update cart item quantity
   * @access  Public
   */
  router.put(
    '/items/:itemId',
    validateRequest(updateCartItemSchema),
    controller.updateItem
  );

  /**
   * @route   DELETE /api/cart/items/:itemId
   * @desc    Remove item from cart
   * @access  Public
   */
  router.delete(
    '/items/:itemId',
    controller.removeItem
  );

  /**
   * @route   DELETE /api/cart/clear
   * @desc    Clear entire cart
   * @access  Public
   */
  router.delete(
    '/clear',
    controller.clearCart
  );

  /**
   * @route   POST /api/cart/apply-coupon
   * @desc    Apply discount coupon
   * @access  Public
   */
  router.post(
    '/apply-coupon',
    validateRequest(applyCouponSchema),
    controller.applyCoupon
  );

  /**
   * @route   POST /api/cart/remove-coupon
   * @desc    Remove discount coupon from cart
   * @access  Public
   */
  router.post(
    '/remove-coupon',
    controller.removeCoupon
  );

  /**
   * @route   POST /api/cart/merge
   * @desc    Merge guest cart with user cart (after login)
   * @access  Authenticated
   */
  router.post(
    '/merge',
    controller.mergeCart
  );

  return router;
};

