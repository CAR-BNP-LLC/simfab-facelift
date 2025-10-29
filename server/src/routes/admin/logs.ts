/**
 * Admin Error Logs Routes
 * Routes for viewing and managing server error logs
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { LoggerController } from '../../controllers/loggerController';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { adminRateLimiter } from '../../middleware/rateLimiter';

export const createLogsRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new LoggerController(pool);

  // Apply admin authentication and rate limiting
  router.use(requireAuth, requireAdmin, adminRateLimiter);

  /**
   * @route   GET /api/admin/logs
   * @desc    Get error logs with pagination and filtering
   * @access  Admin
   */
  router.get('/', controller.getErrorLogs);

  /**
   * @route   GET /api/admin/logs/stats
   * @desc    Get error logs statistics
   * @access  Admin
   */
  router.get('/stats', controller.getErrorLogStats);

  /**
   * @route   GET /api/admin/logs/:id
   * @desc    Get a single error log by ID
   * @access  Admin
   */
  router.get('/:id', controller.getErrorLog);

  /**
   * @route   DELETE /api/admin/logs/:id
   * @desc    Delete a single error log by ID
   * @access  Admin
   */
  router.delete('/:id', controller.deleteErrorLog);

  /**
   * @route   DELETE /api/admin/logs
   * @desc    Delete error logs with optional filters
   * @access  Admin
   */
  router.delete('/', controller.deleteErrorLogs);

  return router;
};

