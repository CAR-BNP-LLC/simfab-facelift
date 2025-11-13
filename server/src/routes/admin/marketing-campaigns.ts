/**
 * Admin Marketing Campaign Routes
 * Routes for admin marketing campaign management
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { AdminMarketingCampaignController } from '../../controllers/adminMarketingCampaignController';
import { requireAuthority } from '../../middleware/auth';
import { adminRateLimiter } from '../../middleware/rateLimiter';

export const createAdminMarketingCampaignRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new AdminMarketingCampaignController(pool);

  // Apply rate limiting to all admin routes
  router.use(adminRateLimiter);

  /**
   * @route   GET /api/admin/marketing-campaigns
   * @desc    List all campaigns with pagination and filters
   * @access  Admin with marketing:view authority
   */
  router.get(
    '/',
    requireAuthority('marketing:view'),
    controller.listCampaigns
  );

  /**
   * @route   GET /api/admin/marketing-campaigns/eligible-count
   * @desc    Get count of eligible recipients
   * @access  Admin with marketing:view authority
   */
  router.get(
    '/eligible-count',
    requireAuthority('marketing:view'),
    controller.getEligibleCount
  );

  /**
   * @route   GET /api/admin/marketing-campaigns/:id
   * @desc    Get single campaign details
   * @access  Admin with marketing:view authority
   */
  router.get(
    '/:id',
    requireAuthority('marketing:view'),
    controller.getCampaign
  );

  /**
   * @route   POST /api/admin/marketing-campaigns
   * @desc    Create new campaign
   * @access  Admin with marketing:create authority
   */
  router.post(
    '/',
    requireAuthority('marketing:create'),
    controller.createCampaign
  );

  /**
   * @route   PUT /api/admin/marketing-campaigns/:id
   * @desc    Update campaign
   * @access  Admin with marketing:edit authority
   */
  router.put(
    '/:id',
    requireAuthority('marketing:edit'),
    controller.updateCampaign
  );

  /**
   * @route   POST /api/admin/marketing-campaigns/:id/send
   * @desc    Send campaign to all eligible users
   * @access  Admin with marketing:send authority
   */
  router.post(
    '/:id/send',
    requireAuthority('marketing:send'),
    controller.sendCampaign
  );

  /**
   * @route   GET /api/admin/marketing-campaigns/:id/stats
   * @desc    Get campaign statistics
   * @access  Admin with marketing:view authority
   */
  router.get(
    '/:id/stats',
    requireAuthority('marketing:view'),
    controller.getCampaignStats
  );

  return router;
};

