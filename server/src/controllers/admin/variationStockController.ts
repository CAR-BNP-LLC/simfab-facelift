/**
 * Admin Variation Stock Controller
 * Handles variation-level stock management
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { VariationStockService } from '../../services/VariationStockService';
import { successResponse } from '../../utils/response';
import { ValidationError } from '../../utils/errors';

export class VariationStockController {
  private variationStockService: VariationStockService;
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.variationStockService = new VariationStockService(pool);
  }

  /**
   * Get stock for all options in a variation
   * GET /api/admin/variations/:variationId/stock
   */
  getVariationStock = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const variationId = parseInt(req.params.variationId);
      
      const result = await this.pool.query(
        `SELECT 
          vo.id, vo.option_name, vo.option_value,
          vo.stock_quantity, vo.low_stock_threshold, vo.reserved_quantity,
          (vo.stock_quantity - COALESCE(vo.reserved_quantity, 0)) as available
         FROM variation_options vo
         WHERE vo.variation_id = $1
         ORDER BY vo.sort_order`,
        [variationId]
      );

      res.json(successResponse(result.rows));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get stock summary for all variations in a product
   * GET /api/admin/products/:productId/variation-stock-summary
   */
  getProductVariationStockSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.productId);
      
      // Get variations with stock tracking enabled, even if they have no options yet
      const result = await this.pool.query(
        `SELECT 
          v.id as variation_id, v.name as variation_name, v.tracks_stock,
          vo.id as option_id, vo.option_name,
          vo.stock_quantity, vo.low_stock_threshold,
          COALESCE(vo.reserved_quantity, 0) as reserved_quantity,
          CASE 
            WHEN vo.stock_quantity IS NULL THEN NULL
            ELSE COALESCE((vo.stock_quantity - COALESCE(vo.reserved_quantity, 0)), 0)
          END as available,
          CASE 
            WHEN vo.stock_quantity IS NULL THEN 'unlimited'
            WHEN vo.stock_quantity - COALESCE(vo.reserved_quantity, 0) <= 0 THEN 'out_of_stock'
            WHEN vo.stock_quantity <= vo.low_stock_threshold THEN 'low_stock'
            ELSE 'in_stock'
          END as status
         FROM product_variations v
         LEFT JOIN variation_options vo ON vo.variation_id = v.id
         WHERE v.product_id = $1 AND v.tracks_stock = true
         ORDER BY v.sort_order, COALESCE(vo.sort_order, 0)`,
        [productId]
      );

      res.json(successResponse(result.rows));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update stock for variation options
   * PUT /api/admin/variations/:variationId/stock
   */
  updateVariationStock = async (req: Request, res: Response, next: NextFunction) => {
    const client = await this.pool.connect();
    
    try {
      const variationId = parseInt(req.params.variationId);
      const { options } = req.body;

      console.log('updateVariationStock called with:', { variationId, optionsCount: options?.length, options });

      if (!options || !Array.isArray(options) || options.length === 0) {
        throw new ValidationError('Options array is required and cannot be empty');
      }

      await client.query('BEGIN');

      for (const option of options) {
        if (!option.optionId) {
          throw new ValidationError('optionId is required for each option');
        }

        const stockQty = option.stock_quantity === null || option.stock_quantity === undefined || option.stock_quantity === '' 
          ? null 
          : Number(option.stock_quantity);
        const threshold = option.low_stock_threshold === null || option.low_stock_threshold === undefined || option.low_stock_threshold === ''
          ? null 
          : Number(option.low_stock_threshold);

        console.log(`Updating option ${option.optionId}: stock_quantity=${stockQty}, low_stock_threshold=${threshold}`);

        await client.query(
          `UPDATE variation_options 
           SET stock_quantity = $1, low_stock_threshold = $2
           WHERE id = $3 AND variation_id = $4`,
          [stockQty, threshold, option.optionId, variationId]
        );
      }

      await client.query('COMMIT');
      
      console.log('Stock update successful for variation', variationId);

      res.json(successResponse({ message: 'Stock updated successfully' }));
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating variation stock:', error);
      next(error);
    } finally {
      client.release();
    }
  };

  /**
   * Adjust stock for a variation option
   * POST /api/admin/variations/:variationId/stock/adjust
   */
  adjustVariationStock = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { optionId, adjustment, reason } = req.body;

      await this.variationStockService.adjustStock(optionId, adjustment, reason);

      res.json(successResponse({ 
        message: `Stock adjusted by ${adjustment > 0 ? '+' : ''}${adjustment}` 
      }));
    } catch (error) {
      next(error);
    }
  };
}
