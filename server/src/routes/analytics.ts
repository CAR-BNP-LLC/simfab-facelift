/**
 * Public Analytics Routes
 * Routes for tracking page views and events (no authentication required)
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { AnalyticsController } from '../controllers/analyticsController';
import { requireAuth } from '../middleware/auth';

export const createAnalyticsRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new AnalyticsController(pool);

  /**
   * @route   POST /api/analytics/track-pageview
   * @desc    Track a page view (public, no auth required)
   * @access  Public
   */
  router.post('/track-pageview', controller.trackPageView);

  /**
   * @route   POST /api/analytics/track-event
   * @desc    Track a custom event (public, no auth required)
   * @access  Public
   */
  router.post('/track-event', controller.trackEvent);

  /**
   * @route   POST /api/analytics/link-session
   * @desc    Link anonymous session to user when they log in
   * @access  Authenticated
   */
  router.post('/link-session', requireAuth, controller.linkSession);

  return router;
};

