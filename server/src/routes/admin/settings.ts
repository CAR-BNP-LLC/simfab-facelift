/**
 * Admin Settings Routes
 * Routes for managing region-specific settings
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { AdminSettingsController } from '../../controllers/adminSettingsController';
import { requireAuthority, loadUserAuthorities } from '../../middleware/auth';
import { adminRateLimiter } from '../../middleware/rateLimiter';
import RBACModel from '../../models/rbac';

export const createAdminSettingsRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new AdminSettingsController(pool);
  const rbacModel = new RBACModel(pool);

  // Apply rate limiting to all admin routes
  router.use(adminRateLimiter);
  
  // Load user authorities into session for all authenticated routes
  router.use(loadUserAuthorities(rbacModel));

  /**
   * @route   GET /api/admin/settings/regions/:region
   * @desc    Get all settings for a region (admin only)
   * @access  Admin with rbac:manage authority
   */
  router.get(
    '/regions/:region',
    requireAuthority('rbac:manage'),
    controller.getRegionSettings
  );

  /**
   * @route   GET /api/admin/settings/regions/:region/public
   * @desc    Get public settings for a region (no auth required)
   * @access  Public
   */
  router.get(
    '/regions/:region/public',
    controller.getPublicRegionSettings
  );

  /**
   * @route   PUT /api/admin/settings/regions/:region
   * @desc    Update multiple settings for a region
   * @access  Admin with rbac:manage authority
   */
  router.put(
    '/regions/:region',
    requireAuthority('rbac:manage'),
    controller.updateRegionSettings
  );

  /**
   * @route   PUT /api/admin/settings/regions/:region/:key
   * @desc    Update a single setting
   * @access  Admin with rbac:manage authority
   */
  router.put(
    '/regions/:region/:key',
    requireAuthority('rbac:manage'),
    controller.updateRegionSetting
  );

  return router;
};


