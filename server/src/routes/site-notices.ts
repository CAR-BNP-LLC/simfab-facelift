/**
 * Site Notice Routes (Public)
 * Public routes for site notices
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { SiteNoticeController } from '../controllers/siteNoticeController';

export const createSiteNoticeRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new SiteNoticeController(pool);

  /**
   * @route   GET /api/site-notices/active
   * @desc    Get active site notice (public)
   * @access  Public
   */
  router.get('/active', controller.getActiveNotice);

  return router;
};

