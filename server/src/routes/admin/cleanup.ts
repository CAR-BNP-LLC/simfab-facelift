import { Router } from 'express';
import { Pool } from 'pg';
import { CleanupController } from '../../controllers/cleanupController';
import { requireAdmin } from '../../middleware/auth';

export const createCleanupRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new CleanupController(pool);

  // Apply admin authentication to all routes
  router.use(requireAdmin);

  /**
   * @route   POST /api/admin/cleanup/run
   * @desc    Manually trigger cleanup of expired orders
   * @access  Admin only
   */
  router.post('/run', controller.runCleanup);

  /**
   * @route   GET /api/admin/cleanup/stats
   * @desc    Get cleanup statistics
   * @access  Admin only
   */
  router.get('/stats', controller.getCleanupStats);

  return router;
};
