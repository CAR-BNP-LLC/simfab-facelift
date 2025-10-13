/**
 * Admin Dashboard Routes
 * Routes for admin dashboard and analytics
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { AdminOrderController } from '../../controllers/adminOrderController';
import { requireAdmin } from '../../middleware/auth';
import { adminRateLimiter } from '../../middleware/rateLimiter';

export const createAdminDashboardRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new AdminOrderController(pool);

  // Apply admin middleware
  router.use(requireAdmin);
  router.use(adminRateLimiter);

  /**
   * @route   GET /api/admin/dashboard/stats
   * @desc    Get dashboard statistics
   * @access  Admin
   */
  router.get('/stats', controller.getDashboardStats);

  return router;
};


