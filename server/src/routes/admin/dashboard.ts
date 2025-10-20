/**
 * Admin Dashboard Routes
 * Routes for admin dashboard and analytics
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { AdminOrderController } from '../../controllers/adminOrderController';
import { requireAuthority } from '../../middleware/auth';
import { adminRateLimiter } from '../../middleware/rateLimiter';

export const createAdminDashboardRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new AdminOrderController(pool);

  // Apply rate limiting to all admin routes
  router.use(adminRateLimiter);

  /**
   * @route   GET /api/admin/dashboard/stats
   * @desc    Get dashboard statistics
   * @access  Admin with dashboard:view authority
   */
  router.get('/stats', requireAuthority('dashboard:view'), controller.getDashboardStats);

  return router;
};


