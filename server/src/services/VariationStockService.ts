/**
 * Variation Stock Service
 * Manages stock tracking for individual variation options
 */

import { Pool } from 'pg';
import { NotFoundError, ValidationError } from '../utils/errors';
import {
  VariationStockReservation,
  StockCheckResult,
  ProductConfiguration
} from '../types/product';

export class VariationStockService {
  constructor(private pool: Pool) {}

  /**
   * Get available stock for a specific variation option
   */
  async getVariationOptionStock(optionId: number): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        `SELECT 
          COALESCE(stock_quantity, 0) as stock,
          COALESCE(reserved_quantity, 0) as reserved
         FROM variation_options 
         WHERE id = $1`,
        [optionId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Variation Option', { optionId });
      }

      const { stock, reserved } = result.rows[0];
      return Math.max(0, stock - reserved);
    } finally {
      client.release();
    }
  }

  /**
   * Reserve stock for a variation option
   */
  async reserveVariationStock(
    optionId: number, 
    quantity: number, 
    orderId: number
  ): Promise<VariationStockReservation> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check available stock
      const availableStock = await this.getVariationOptionStock(optionId);
      
      if (quantity > availableStock) {
        throw new ValidationError(
          `Insufficient stock. Only ${availableStock} available for this option`,
          { available: availableStock, requested: quantity }
        );
      }

      // Create reservation
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minute expiration

      const result = await client.query(
        `INSERT INTO variation_stock_reservations 
         (order_id, variation_option_id, quantity, status, expires_at)
         VALUES ($1, $2, $3, 'pending', $4)
         RETURNING *`,
        [orderId, optionId, quantity, expiresAt]
      );

      // Update reserved quantity
      await client.query(
        `UPDATE variation_options 
         SET reserved_quantity = reserved_quantity + $1
         WHERE id = $2`,
        [quantity, optionId]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error('Error reserving variation stock:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Release reserved stock (cancel reservation)
   */
  async releaseVariationStock(orderId: number, optionId?: number): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get reservations to cancel
      const whereClause = optionId 
        ? 'order_id = $1 AND variation_option_id = $2 AND status = $3'
        : 'order_id = $1 AND status = $2';
      
      const params = optionId 
        ? [orderId, optionId, 'pending']
        : [orderId, 'pending'];

      const reservations = await client.query(
        `SELECT variation_option_id, quantity 
         FROM variation_stock_reservations 
         WHERE ${whereClause}`,
        params
      );

      // Reduce reserved quantities
      for (const reservation of reservations.rows) {
        await client.query(
          `UPDATE variation_options 
           SET reserved_quantity = GREATEST(0, reserved_quantity - $1)
           WHERE id = $2`,
          [reservation.quantity, reservation.variation_option_id]
        );
      }

      // Mark reservations as cancelled
      const statusParam = optionId ? 3 : 2;
      await client.query(
        `UPDATE variation_stock_reservations 
         SET status = 'cancelled'
         WHERE ${whereClause}`,
        params
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error releasing variation stock:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Confirm reservation and deduct stock (on payment)
   */
  async confirmReservation(orderId: number): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get pending reservations
      const reservations = await client.query(
        `SELECT variation_option_id, quantity 
         FROM variation_stock_reservations 
         WHERE order_id = $1 AND status = 'pending'`,
        [orderId]
      );

      // Deduct stock and reduce reserved quantity
      for (const reservation of reservations.rows) {
        await client.query(
          `UPDATE variation_options 
           SET 
             stock_quantity = GREATEST(0, stock_quantity - $1),
             reserved_quantity = GREATEST(0, reserved_quantity - $1)
           WHERE id = $2`,
          [reservation.quantity, reservation.variation_option_id]
        );
      }

      // Mark as confirmed
      await client.query(
        `UPDATE variation_stock_reservations 
         SET status = 'confirmed'
         WHERE order_id = $1 AND status = 'pending'`,
        [orderId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error confirming variation stock reservation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check availability for a product configuration
   */
  async checkAvailability(
    productId: number,
    configuration: ProductConfiguration
  ): Promise<StockCheckResult> {
    const client = await this.pool.connect();
    
    try {
      // Check if product has stock-tracked variations
      const productResult = await client.query(
        `SELECT p.stock, 
         COUNT(v.id) FILTER (WHERE v.tracks_stock = true) as tracked_variations
         FROM products p
         LEFT JOIN product_variations v ON v.product_id = p.id AND v.tracks_stock = true
         WHERE p.id = $1
         GROUP BY p.id, p.stock`,
        [productId]
      );

      if (productResult.rows.length === 0) {
        return { available: false, availableQuantity: 0, message: 'Product not found' };
      }

      const { stock: productStock, tracked_variations } = productResult.rows[0];

      // If no stock-tracked variations, use product-level stock
      if (tracked_variations === 0 || !configuration.variations) {
        return {
          available: productStock > 0,
          availableQuantity: productStock
        };
      }

      // Check each variation option's stock (only for variations that track stock)
      const variationStock: any[] = [];
      let minAvailable = Infinity;

      // Get which variations track stock
      const tracksStockResult = await client.query(
        `SELECT id FROM product_variations WHERE product_id = $1 AND tracks_stock = true`,
        [productId]
      );
      const tracksStockVariationIds = new Set(tracksStockResult.rows.map((r: any) => r.id.toString()));

      for (const [variationId, optionIdOrValue] of Object.entries(configuration.variations)) {
        // Only check stock for variations that have tracks_stock = true
        if (!tracksStockVariationIds.has(variationId.toString())) {
          continue; // Skip this variation, it doesn't track stock
        }

        // Get the variation type to handle boolean values
        const variationTypeResult = await client.query(
          `SELECT variation_type FROM product_variations WHERE id = $1 AND product_id = $2`,
          [Number(variationId), productId]
        );

        if (variationTypeResult.rows.length === 0) {
          continue; // Variation doesn't exist
        }

        const variationType = variationTypeResult.rows[0].variation_type;
        let actualOptionId: number | null = null;

        // Handle boolean variations - convert true/false to option IDs
        if (variationType === 'boolean') {
          // Handle boolean values that may be passed as true/false or as option IDs
          const value: any = optionIdOrValue;
          const isYes = value === true || value === 'true' || value === 1 || value === '1';
          const optionName = isYes ? 'Yes' : 'No';
          
          const booleanOptionResult = await client.query(
            `SELECT vo.id FROM variation_options vo
             JOIN product_variations v ON v.id = vo.variation_id
             WHERE v.id = $1 AND v.product_id = $2 AND vo.option_name = $3`,
            [Number(variationId), productId, optionName]
          );

          if (booleanOptionResult.rows.length > 0) {
            actualOptionId = booleanOptionResult.rows[0].id;
          } else {
            console.warn(`Boolean option "${optionName}" not found for variation ${variationId} in product ${productId}`);
            continue;
          }
        } else {
          // For other types, use the value directly as option ID
          const value: any = optionIdOrValue;
          if (typeof value === 'number') {
            actualOptionId = value;
          } else {
            actualOptionId = Number(value);
            if (isNaN(actualOptionId)) {
              console.warn(`Invalid option ID ${value} for variation ${variationId}`);
              continue;
            }
          }
        }

        // Validate that the option exists and belongs to this variation
        const optionResult = await client.query(
          `SELECT vo.id, vo.option_name, vo.stock_quantity, vo.reserved_quantity,
                  v.name as variation_name, v.id as variation_id
           FROM variation_options vo
           JOIN product_variations v ON v.id = vo.variation_id
           WHERE vo.id = $1 AND v.id = $2 AND v.product_id = $3`,
          [actualOptionId, Number(variationId), productId]
        );

        if (optionResult.rows.length === 0) {
          console.warn(`Variation option ${actualOptionId} not found for variation ${variationId} in product ${productId}`);
          continue; // Skip invalid option
        }

        const option = optionResult.rows[0];
        const stock = Number(option.stock_quantity) || 0;
        const reserved = Number(option.reserved_quantity) || 0;
        const available = Math.max(0, stock - reserved);
        
        minAvailable = Math.min(minAvailable, available);

        variationStock.push({
          variationName: option.variation_name,
          optionName: option.option_name,
          available
        });
      }

      // If no stock-tracked variations were checked, fall back to product-level stock
      if (minAvailable === Infinity) {
        return {
          available: productStock > 0,
          availableQuantity: productStock,
          variationStock: []
        };
      }

      return {
        available: minAvailable > 0,
        availableQuantity: Math.max(0, minAvailable),
        variationStock
      };
    } finally {
      client.release();
    }
  }

  /**
   * Clean up expired reservations
   */
  async cleanupExpiredReservations(): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      // Get expired reservations
      const expired = await client.query(
        `SELECT variation_option_id, quantity 
         FROM variation_stock_reservations 
         WHERE status = 'pending' AND expires_at < NOW()`
      );

      // Release stock
      for (const reservation of expired.rows) {
        await client.query(
          `UPDATE variation_options 
           SET reserved_quantity = GREATEST(0, reserved_quantity - $1)
           WHERE id = $2`,
          [reservation.quantity, reservation.variation_option_id]
        );
      }

      // Mark as expired
      const result = await client.query(
        `UPDATE variation_stock_reservations 
         SET status = 'expired'
         WHERE status = 'pending' AND expires_at < NOW()`
      );

      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  /**
   * Adjust stock for a variation option (admin operation)
   */
  async adjustStock(optionId: number, adjustment: number, reason?: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE variation_options 
         SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) + $1)
         WHERE id = $2
         RETURNING *`,
        [adjustment, optionId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Variation Option', { optionId });
      }

      // TODO: Log stock adjustment in audit log

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundError) throw error;
      console.error('Error adjusting variation stock:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}
