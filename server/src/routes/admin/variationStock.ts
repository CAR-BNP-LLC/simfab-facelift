/**
 * Admin Variation Stock Routes
 * Routes for managing variation-level stock
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { VariationStockController } from '../../controllers/admin/variationStockController';
import { validate } from '../../middleware/validation';
import { requireAuthority } from '../../middleware/auth';
import { adminRateLimiter } from '../../middleware/rateLimiter';
import Joi from 'joi';

export const createVariationStockRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new VariationStockController(pool);

  // Apply rate limiting and auth
  router.use(adminRateLimiter);
  router.use(requireAuthority('products:edit'));

  /**
   * @route   GET /api/admin/variations/:variationId/stock
   * @desc    Get stock for all options in a variation
   * @access  Admin
   */
  router.get('/:variationId/stock', controller.getVariationStock);

  /**
   * @route   GET /api/admin/products/:productId/variation-stock-summary
   * @desc    Get stock summary for all variations in a product
   * @access  Admin
   */
  router.get('/products/:productId/variation-stock-summary', controller.getProductVariationStockSummary);

  /**
   * @route   PUT /api/admin/variations/:variationId/stock
   * @desc    Update stock for variation options
   * @access  Admin
   */
  router.put(
    '/:variationId/stock',
    validate(Joi.object({
      options: Joi.array().items(
        Joi.object({
          optionId: Joi.number().required(),
          stock_quantity: Joi.number().allow(null),
          low_stock_threshold: Joi.number().allow(null)
        })
      ).required()
    })),
    controller.updateVariationStock
  );

  /**
   * @route   POST /api/admin/variations/:variationId/stock/adjust
   * @desc    Adjust stock quantity for variation options
   * @access  Admin
   */
  router.post(
    '/:variationId/stock/adjust',
    validate(Joi.object({
      optionId: Joi.number().required(),
      adjustment: Joi.number().required(),
      reason: Joi.string().optional()
    })),
    controller.adjustVariationStock
  );

  return router;
};
