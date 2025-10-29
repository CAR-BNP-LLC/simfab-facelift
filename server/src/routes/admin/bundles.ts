/**
 * Admin Bundle Routes
 * Routes for managing bundle product composition
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { BundleController } from '../../controllers/admin/bundleController';
import { validate } from '../../middleware/validation';
import { requireAuthority } from '../../middleware/auth';
import { adminRateLimiter } from '../../middleware/rateLimiter';
import Joi from 'joi';

export const createBundleRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new BundleController(pool);

  // Apply rate limiting and auth
  router.use(adminRateLimiter);
  router.use(requireAuthority('products:edit'));

  /**
   * @route   GET /api/admin/products/:productId/bundle-items
   * @desc    Get all items in a bundle
   * @access  Admin
   */
  router.get('/products/:productId/bundle-items', controller.getBundleItems);

  /**
   * @route   POST /api/admin/products/:productId/bundle-items
   * @desc    Add item to bundle
   * @access  Admin
   */
  router.post(
    '/products/:productId/bundle-items',
    validate(Joi.object({
      item_product_id: Joi.number().required(),
      quantity: Joi.number().integer().min(1).optional(),
      item_type: Joi.string().valid('required', 'optional').optional(),
      is_configurable: Joi.boolean().optional(),
      price_adjustment: Joi.number().optional(),
      display_name: Joi.string().optional(),
      description: Joi.string().allow('').optional()
    })),
    controller.addBundleItem
  );

  /**
   * @route   PUT /api/admin/products/:productId/bundle-items/:itemId
   * @desc    Update bundle item
   * @access  Admin
   */
  router.put(
    '/products/:productId/bundle-items/:itemId',
    validate(Joi.object({
      quantity: Joi.number().integer().min(1).optional(),
      item_type: Joi.string().valid('required', 'optional').optional(),
      is_configurable: Joi.boolean().optional(),
      price_adjustment: Joi.number().optional(),
      display_name: Joi.string().allow('').optional(),
      description: Joi.string().allow('').optional(),
      sort_order: Joi.number().integer().optional()
    })),
    controller.updateBundleItem
  );

  /**
   * @route   DELETE /api/admin/products/:productId/bundle-items/:itemId
   * @desc    Remove item from bundle
   * @access  Admin
   */
  router.delete('/products/:productId/bundle-items/:itemId', controller.removeBundleItem);

  /**
   * @route   POST /api/admin/products/:productId/bundle-items/reorder
   * @desc    Reorder bundle items
   * @access  Admin
   */
  router.post(
    '/products/:productId/bundle-items/reorder',
    validate(Joi.object({
      itemIds: Joi.array().items(Joi.number()).required(),
      itemType: Joi.string().valid('required', 'optional').required()
    })),
    controller.reorderBundleItems
  );

  /**
   * @route   POST /api/admin/products/:productId/bundle-items/check-availability
   * @desc    Check bundle availability with configuration
   * @access  Admin
   */
  router.post(
    '/products/:productId/bundle-items/check-availability',
    validate(Joi.object({
      requiredItems: Joi.object().optional(),
      optionalItems: Joi.array().items(Joi.number()).optional()
    })),
    controller.checkBundleAvailability
  );

  /**
   * @route   POST /api/admin/products/:productId/bundle-items/validate
   * @desc    Validate bundle configuration
   * @access  Admin
   */
  router.post(
    '/products/:productId/bundle-items/validate',
    validate(Joi.object({
      requiredItems: Joi.object().optional(),
      optionalItems: Joi.array().items(Joi.number()).optional()
    })),
    controller.validateBundleConfiguration
  );

  return router;
};
