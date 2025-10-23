import { Router } from 'express';
import { Pool } from 'pg';
import { Phase4Controller } from '../../controllers/phase4Controller';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { adminRateLimiter } from '../../middleware/rateLimiter';

export const createPhase4Routes = (pool: Pool): Router => {
  const router = Router();
  const controller = new Phase4Controller(pool);

  // Apply admin authentication and rate limiting
  router.use(requireAuth, requireAdmin, adminRateLimiter);

  /**
   * @route   POST /api/admin/phase4/refund/advanced
   * @desc    Process advanced refund with detailed tracking
   * @access  Admin
   */
  router.post('/refund/advanced', controller.processAdvancedRefund);

  /**
   * @route   GET /api/admin/phase4/refund/analytics
   * @desc    Get comprehensive refund analytics
   * @access  Admin
   */
  router.get('/refund/analytics', controller.getRefundAnalytics);

  /**
   * @route   GET /api/admin/phase4/refund/insights
   * @desc    Get refund insights and recommendations
   * @access  Admin
   */
  router.get('/refund/insights', controller.getRefundInsights);

  /**
   * @route   GET /api/admin/phase4/payment/analytics
   * @desc    Get comprehensive payment analytics
   * @access  Admin
   */
  router.get('/payment/analytics', controller.getPaymentAnalytics);

  /**
   * @route   GET /api/admin/phase4/payment/optimization
   * @desc    Get payment optimization recommendations
   * @access  Admin
   */
  router.get('/payment/optimization', controller.getPaymentOptimization);

  /**
   * @route   GET /api/admin/phase4/payment/monitoring
   * @desc    Get real-time payment monitoring data
   * @access  Admin
   */
  router.get('/payment/monitoring', controller.getRealTimeMonitoring);

  /**
   * @route   GET /api/admin/phase4/performance/metrics
   * @desc    Get performance metrics
   * @access  Admin
   */
  router.get('/performance/metrics', controller.getPerformanceMetrics);

  /**
   * @route   GET /api/admin/phase4/performance/recommendations
   * @desc    Get optimization recommendations
   * @access  Admin
   */
  router.get('/performance/recommendations', controller.getOptimizationRecommendations);

  /**
   * @route   POST /api/admin/phase4/performance/optimize
   * @desc    Run optimization tasks
   * @access  Admin
   */
  router.post('/performance/optimize', controller.runOptimizationTasks);

  /**
   * @route   GET /api/admin/phase4/dashboard
   * @desc    Get comprehensive Phase 4 dashboard
   * @access  Admin
   */
  router.get('/dashboard', controller.getPhase4Dashboard);

  return router;
};
