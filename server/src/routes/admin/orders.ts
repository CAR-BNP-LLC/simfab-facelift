/**
 * Admin Order Routes
 * Routes for admin order management
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { AdminOrderController } from '../../controllers/adminOrderController';
import { requireAdmin } from '../../middleware/auth';
import { adminRateLimiter } from '../../middleware/rateLimiter';

export const createAdminOrderRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new AdminOrderController(pool);

  // Apply admin middleware
  router.use(requireAdmin);
  router.use(adminRateLimiter);

  /**
   * @route   GET /api/admin/orders
   * @desc    List all orders with filters
   * @access  Admin
   */
  router.get('/', controller.listOrders);

  /**
   * @route   GET /api/admin/orders/:id
   * @desc    Get order details
   * @access  Admin
   */
  router.get('/:id', controller.getOrder);

  /**
   * @route   PUT /api/admin/orders/:id/status
   * @desc    Update order status
   * @access  Admin
   */
  router.put('/:id/status', controller.updateStatus);

  return router;
};


