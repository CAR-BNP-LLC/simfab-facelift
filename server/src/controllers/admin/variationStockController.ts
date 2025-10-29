/**
 * Admin Variation Stock Controller
 * Handles variation-level stock management
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { VariationStockService } from '../../services/VariationStockService';
import { successResponse } from '../../utils/response';

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
      
      const result = await this.pool.query(
        `SELECT 
          v.id as variation_id, v.name as variation_name, v.tracks_stock,
          vo.id as option_id, vo.option_name,
          vo.stock_quantity, vo.low_stock_threshold,
          COALESCE(vo.reserved_quantity, 0) as reserved_quantity,
          (vo.stock_quantity - COALESCE(vo.reserved_quantity, 0)) as available,
          CASE 
            WHEN vo.stock_quantity IS NULL THEN 'no_track'
            WHEN vo.stock_quantity - COALESCE(vo.reserved_quantity, 0) <= 0 THEN 'out_of_stock'
            WHEN vo.stock_quantity <= vo.low_stock_threshold THEN 'low_stock'
            ELSE 'in_stock'
          END as status
         FROM product_variations v
         LEFT JOIN variation_options vo ON vo.variation_id = v.id
         WHERE v.product_id = $1
         ORDER BY v.sort_order, vo.sort_order`,
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
    try {
      const variationId = parseInt(req.params.variationId);
      const { options } = req.body;

      const client = await this.pool.connect();
      await client.query('BEGIN');

      for (const option of options) {
        await client.query(
          `UPDATE variation_options 
           SET stock_quantity = $1, low_stock_threshold = $2
           WHERE id = $3 AND variation_id = $4`,
          [
            option.stock_quantity,
            option.low_stock_threshold,
            option.optionId,
            variationId
          ]
        );
      }

      await client.query('COMMIT');
      client.release();

      res.json(successResponse({ message: 'Stock updated successfully' }));
    } catch (error) {
      next(error);
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
