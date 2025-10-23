import { Router } from 'express';
import { Pool } from 'pg';
import { TestingController } from '../../controllers/testingController';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { adminRateLimiter } from '../../middleware/rateLimiter';

export const createTestingRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new TestingController(pool);

  // Apply admin authentication and rate limiting
  router.use(requireAuth, requireAdmin, adminRateLimiter);

  /**
   * @route   POST /api/admin/testing/comprehensive
   * @desc    Run comprehensive test suite
   * @access  Admin
   */
  router.post('/comprehensive', controller.runComprehensiveTests);

  /**
   * @route   POST /api/admin/testing/suite/:suite
   * @desc    Run specific test suite (database, payment, webhook, stock, refund, security)
   * @access  Admin
   */
  router.post('/suite/:suite', controller.runSpecificTests);

  /**
   * @route   GET /api/admin/testing/history
   * @desc    Get test execution history
   * @access  Admin
   */
  router.get('/history', controller.getTestHistory);

  return router;
};
