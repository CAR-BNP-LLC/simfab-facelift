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
   * @desc    Get order details
   * @access  Public (authenticated to see own orders)
   */
  router.get(
    '/:orderNumber',
    controller.getOrder
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

