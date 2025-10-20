/**
 * Admin Order Routes
 * Routes for admin order management
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { AdminOrderController } from '../../controllers/adminOrderController';
import { requireAuthority } from '../../middleware/auth';
import { adminRateLimiter } from '../../middleware/rateLimiter';

export const createAdminOrderRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new AdminOrderController(pool);

  // Apply rate limiting to all admin routes
  router.use(adminRateLimiter);

  /**
   * @route   GET /api/admin/orders
   * @desc    List all orders with filters
   * @access  Admin with orders:view authority
   */
  router.get('/', requireAuthority('orders:view'), controller.listOrders);

  /**
   * @route   GET /api/admin/orders/:id
   * @desc    Get order details
   * @access  Admin with orders:view authority
   */
  router.get('/:id', requireAuthority('orders:view'), controller.getOrder);

  /**
   * @route   PUT /api/admin/orders/:id/status
   * @desc    Update order status
   * @access  Admin with orders:manage authority
   */
  router.put('/:id/status', requireAuthority('orders:manage'), controller.updateStatus);

  return router;
};


