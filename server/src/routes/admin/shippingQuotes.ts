/**
 * Admin Shipping Quotes Routes
 * Routes for admin shipping quote management
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { AdminShippingQuoteController } from '../../controllers/adminShippingQuoteController';
import { apiRateLimiter } from '../../middleware/rateLimiter';

export const createAdminShippingQuoteRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new AdminShippingQuoteController(pool);

  // Apply rate limiting
  router.use(apiRateLimiter);

  /**
   * @route   GET /api/admin/shipping-quotes
   * @desc    Get all shipping quotes with pagination
   * @access  Admin
   * @query   page, limit, status
   */
  router.get('/', controller.getShippingQuotes);

  /**
   * @route   GET /api/admin/shipping-quotes/:id
   * @desc    Get shipping quote by ID
   * @access  Admin
   */
  router.get('/:id', controller.getShippingQuoteById);

  /**
   * @route   GET /api/admin/shipping-quotes/order/:orderId
   * @desc    Get shipping quote by order ID
   * @access  Admin
   */
  router.get('/order/:orderId', controller.getShippingQuoteByOrderId);

  /**
   * @route   PUT /api/admin/shipping-quotes/:id
   * @desc    Update shipping quote (admin confirms rate)
   * @access  Admin
   * @body    { quotedAmount, quoteConfirmationNumber?, notes? }
   */
  router.put('/:id', controller.updateShippingQuote);

  return router;
};

