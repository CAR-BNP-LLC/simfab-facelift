/**
 * Order Routes
 * Routes for order management
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { OrderController } from '../controllers/orderController';
import {
  validateRequest,
  createOrderSchema,
  cancelOrderSchema
} from '../validators/cart';
import { apiRateLimiter } from '../middleware/rateLimiter';

export const createOrderRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new OrderController(pool);

  // Apply rate limiting
  router.use(apiRateLimiter);

  /**
   * @route   POST /api/orders
   * @desc    Create new order from cart
   * @access  Public (can be guest or authenticated)
   */
  router.post(
    '/',
    validateRequest(createOrderSchema),
    controller.createOrder
  );

  /**
   * @route   POST /api/orders/debug
   * @desc    Debug order data (no validation)
   * @access  Public
   */
  router.post(
    '/debug',
    controller.debugOrder
  );

  /**
   * @route   GET /api/orders
   * @desc    Get user's orders
   * @access  Authenticated
   */
  router.get(
    '/',
    controller.getUserOrders
  );

  /**
   * @route   GET /api/orders/:orderNumber
   * @desc    Get order by order number (for confirmation page)
   * @access  Public
   */
  router.get(
    '/:orderNumber',
    controller.getOrderByNumber
  );

  /**
   * @route   POST /api/orders/:orderNumber/cancel
   * @desc    Cancel order
   * @access  Public (authenticated to cancel own orders)
   */
  router.post(
    '/:orderNumber/cancel',
    validateRequest(cancelOrderSchema),
    controller.cancelOrder
  );

  return router;
};

