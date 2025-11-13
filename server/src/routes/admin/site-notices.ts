/**
 * Admin Site Notice Routes
 * Routes for admin site notice management
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { SiteNoticeController } from '../../controllers/siteNoticeController';
import { requireAuthority } from '../../middleware/auth';
import { adminRateLimiter } from '../../middleware/rateLimiter';

export const createAdminSiteNoticeRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new SiteNoticeController(pool);

  // Apply rate limiting to all admin routes
  router.use(adminRateLimiter);

  /**
   * @route   GET /api/admin/site-notices
   * @desc    List all site notices
   * @access  Admin
   */
  router.get(
    '/',
    controller.getAllNotices
  );

  /**
   * @route   POST /api/admin/site-notices
   * @desc    Create new site notice
   * @access  Admin
   */
  router.post(
    '/',
    controller.createNotice
  );

  /**
   * @route   PUT /api/admin/site-notices/:id
   * @desc    Update site notice
   * @access  Admin
   */
  router.put(
    '/:id',
    controller.updateNotice
  );

  /**
   * @route   DELETE /api/admin/site-notices/:id
   * @desc    Delete site notice
   * @access  Admin
   */
  router.delete(
    '/:id',
    controller.deleteNotice
  );

  return router;
};

