/**
 * Shared Config Routes
 * Routes for shared product configuration endpoints
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { SharedConfigController } from '../controllers/sharedConfigController';
import { validateRequest } from '../validators/product';
import { createSharedConfigSchema } from '../validators/sharedConfig';
import { apiRateLimiter } from '../middleware/rateLimiter';

export const createSharedConfigRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new SharedConfigController(pool);

  // Apply rate limiting to all shared config routes
  router.use(apiRateLimiter);

  /**
   * @route   POST /api/shared-configs
   * @desc    Create a shared product configuration
   * @access  Public
   */
  router.post(
    '/',
    validateRequest(createSharedConfigSchema),
    controller.createSharedConfig
  );

  /**
   * @route   GET /api/shared-configs/:shortCode
   * @desc    Get shared configuration by short code
   * @access  Public
   */
  router.get(
    '/:shortCode',
    controller.getSharedConfig
  );

  return router;
};

