/**
 * Admin Bundle Controller
 * Handles bundle composition management
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { BundleService } from '../../services/BundleService';
import { successResponse } from '../../utils/response';

export class BundleController {
  private bundleService: BundleService;
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.bundleService = new BundleService(pool);
  }

  /**
   * Get all items in a bundle
   * GET /api/admin/products/:productId/bundle-items
   */
  getBundleItems = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.productId);
      const items = await this.bundleService.getBundleItems(productId);

      // Separate required and optional items
      const required = items.filter(item => item.item_type === 'required');
      const optional = items.filter(item => item.item_type === 'optional');

      res.json(successResponse({
        required,
        optional,
        all: items
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Add item to bundle
   * POST /api/admin/products/:productId/bundle-items
   */
  addBundleItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.productId);
      const item = await this.bundleService.addBundleItem(productId, req.body.item_product_id, req.body);

      res.status(201).json(successResponse(item, 'Item added to bundle'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update bundle item
   * PUT /api/admin/products/:productId/bundle-items/:itemId
   */
  updateBundleItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const item = await this.bundleService.updateBundleItem(itemId, req.body);

      res.json(successResponse(item, 'Bundle item updated'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Remove item from bundle
   * DELETE /api/admin/products/:productId/bundle-items/:itemId
   */
  removeBundleItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const itemId = parseInt(req.params.itemId);
      await this.bundleService.removeBundleItem(itemId);

      res.json(successResponse(null, 'Item removed from bundle'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Reorder bundle items
   * POST /api/admin/products/:productId/bundle-items/reorder
   */
  reorderBundleItems = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.productId);
      await this.bundleService.reorderBundleItems(productId, req.body.itemIds, req.body.itemType);

      res.json(successResponse(null, 'Items reordered'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check bundle availability
   * POST /api/admin/products/:productId/bundle-items/check-availability
   */
  checkBundleAvailability = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.productId);
      const availability = await this.bundleService.checkBundleAvailability(productId, req.body);

      res.json(successResponse(availability));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validate bundle configuration
   * POST /api/admin/products/:productId/bundle-items/validate
   */
  validateBundleConfiguration = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.productId);
      const validation = await this.bundleService.validateBundleConfiguration(productId, req.body);

      res.json(successResponse(validation));
    } catch (error) {
      next(error);
    }
  };
}
