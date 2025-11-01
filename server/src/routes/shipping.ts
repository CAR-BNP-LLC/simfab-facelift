/**
 * Shipping Routes
 * Routes for shipping calculation
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { ShippingController } from '../controllers/shippingController';
import { apiRateLimiter } from '../middleware/rateLimiter';

export const createShippingRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new ShippingController(pool);

  // Apply rate limiting
  router.use(apiRateLimiter);

  /**
   * @route   POST /api/shipping/calculate
   * @desc    Calculate shipping rates for given address and package
   * @access  Public
   * @body    { shippingAddress: {...}, packageSize: 'S'|'M'|'L', orderTotal: number }
   */
  router.post(
    '/calculate',
    controller.calculate
  );

  return router;
};

