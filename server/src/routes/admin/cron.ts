import { Router } from 'express';
import { Pool } from 'pg';
import { CronController } from '../../controllers/cronController';
import { CronService } from '../../services/CronService';
import { requireAdmin } from '../../middleware/auth';

export const createCronRoutes = (pool: Pool, cronService: CronService): Router => {
  const router = Router();
  const controller = new CronController(pool, cronService);

  // Apply admin authentication to all routes
  router.use(requireAdmin);

  /**
   * @route   GET /api/admin/cron/status
   * @desc    Get all cron jobs status
   * @access  Admin only
   */
  router.get('/status', controller.getCronStatus);

  /**
   * @route   POST /api/admin/cron/trigger/:jobName
   * @desc    Manually trigger a cron job
   * @access  Admin only
   */
  router.post('/trigger/:jobName', controller.triggerJob);

  /**
   * @route   POST /api/admin/cron/validate
   * @desc    Validate a cron schedule expression
   * @access  Admin only
   */
  router.post('/validate', controller.validateSchedule);

  /**
   * @route   GET /api/admin/cron/examples
   * @desc    Get common cron schedule examples
   * @access  Admin only
   */
  router.get('/examples', controller.getScheduleExamples);

  return router;
};
