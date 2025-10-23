import { Router } from 'express';
import { Pool } from 'pg';
import { ProductionController } from '../../controllers/productionController';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { adminRateLimiter } from '../../middleware/rateLimiter';

export const createProductionRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new ProductionController(pool);

  // Apply admin authentication and rate limiting
  router.use(requireAuth, requireAdmin, adminRateLimiter);

  /**
   * @route   GET /api/admin/production/config
   * @desc    Get production configuration
   * @access  Admin
   */
  router.get('/config', controller.getProductionConfig);

  /**
   * @route   GET /api/admin/production/health
   * @desc    Get system health status
   * @access  Admin
   */
  router.get('/health', controller.getSystemHealth);

  /**
   * @route   GET /api/admin/production/metrics
   * @desc    Get performance metrics
   * @access  Admin
   */
  router.get('/metrics', controller.getPerformanceMetrics);

  /**
   * @route   GET /api/admin/production/dashboard
   * @desc    Get comprehensive production dashboard
   * @access  Admin
   */
  router.get('/dashboard', controller.getProductionDashboard);

  /**
   * @route   POST /api/admin/production/refund
   * @desc    Process a refund
   * @access  Admin
   */
  router.post('/refund', controller.processRefund);

  /**
   * @route   POST /api/admin/production/refund/complete
   * @desc    Complete a refund
   * @access  Admin
   */
  router.post('/refund/complete', controller.completeRefund);

  /**
   * @route   GET /api/admin/production/refund/history/:orderId
   * @desc    Get refund history for an order
   * @access  Admin
   */
  router.get('/refund/history/:orderId', controller.getRefundHistory);

  /**
   * @route   GET /api/admin/production/refund/statistics
   * @desc    Get refund statistics
   * @access  Admin
   */
  router.get('/refund/statistics', controller.getRefundStatistics);

  return router;
};
