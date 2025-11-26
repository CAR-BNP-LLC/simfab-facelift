import { Pool } from 'pg';
import { NotFoundError, ValidationError } from '../utils/errors';
import { VariationStockService } from './VariationStockService';
import { ProductConfiguration } from '../types/product';

export interface StockReservation {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired';
  expires_at: Date;
  created_at: Date;
}

export class StockReservationService {
  private variationStockService: VariationStockService;

  constructor(private pool: Pool) {
    this.variationStockService = new VariationStockService(pool);
  }

  /**
   * Reserve stock for an order
   */
  async reserveStock(orderId: number, productId: number, quantity: number, transactionClient?: any): Promise<StockReservation> {
    const client = transactionClient || await this.pool.connect();
    const shouldManageTransaction = !transactionClient;
    
    try {
      if (shouldManageTransaction) {
        await client.query('BEGIN');
      }

      // Check current stock and backorder setting
      const productResult = await client.query(
        `SELECT stock, 
         CASE 
           WHEN backorders_allowed IS NULL THEN false
           WHEN LOWER(TRIM(backorders_allowed)) IN ('yes', '1', 'true', 'on') THEN true
           ELSE false
         END as backorders_allowed
         FROM products WHERE id = $1`,
        [productId]
      );

      if (productResult.rows.length === 0) {
        throw new NotFoundError('Product', { productId });
      }

      const currentStock = productResult.rows[0].stock;
      const backordersAllowed = productResult.rows[0].backorders_allowed;

      // Check existing reservations
      const reservationResult = await client.query(
        `SELECT COALESCE(SUM(quantity), 0) as reserved
         FROM stock_reservations 
         WHERE product_id = $1 AND status = 'pending' AND expires_at > NOW()`,
        [productId]
      );

      const reservedStock = parseInt(reservationResult.rows[0].reserved);
      const availableStock = currentStock - reservedStock;

      // Only throw error if backorders are not allowed and stock is insufficient
      if (quantity > availableStock && !backordersAllowed) {
        throw new ValidationError(`Insufficient stock. Only ${availableStock} available`, {
          available: availableStock,
          requested: quantity,
          currentStock,
          reservedStock
        });
      }

      // Create reservation
      const reservationSql = `
        INSERT INTO stock_reservations (order_id, product_id, quantity, status, expires_at)
        VALUES ($1, $2, $3, 'pending', NOW() + INTERVAL '30 minutes')
        RETURNING *
      `;

      const result = await client.query(reservationSql, [orderId, productId, quantity]);
      
      if (shouldManageTransaction) {
        await client.query('COMMIT');
      }
      return result.rows[0];
    } catch (error) {
      if (shouldManageTransaction) {
        await client.query('ROLLBACK');
      }
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error('Error reserving stock:', error);
      throw error;
    } finally {
      if (shouldManageTransaction) {
        client.release();
      }
    }
  }

  /**
   * Confirm stock reservation (convert to actual stock deduction)
   */
  async confirmReservation(orderId: number, transactionClient?: any): Promise<void> {
    const client = transactionClient || await this.pool.connect();
    const shouldManageTransaction = !transactionClient;
    
    try {
      if (shouldManageTransaction) {
        await client.query('BEGIN');
      }

      // Get all pending reservations for this order
      const reservations = await client.query(
        'SELECT * FROM stock_reservations WHERE order_id = $1 AND status = $2',
        [orderId, 'pending']
      );

      for (const reservation of reservations.rows) {
        // Deduct stock
        await client.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [reservation.quantity, reservation.product_id]
        );

        // Mark reservation as confirmed
        await client.query(
          'UPDATE stock_reservations SET status = $1 WHERE id = $2',
          ['confirmed', reservation.id]
        );
      }

      if (shouldManageTransaction) {
        await client.query('COMMIT');
      }
    } catch (error) {
      if (shouldManageTransaction) {
        await client.query('ROLLBACK');
      }
      console.error('Error confirming reservations:', error);
      throw error;
    } finally {
      if (shouldManageTransaction) {
        client.release();
      }
    }
  }

  /**
   * Cancel stock reservation and restore availability
   */
  async cancelReservation(orderId: number, transactionClient?: any): Promise<void> {
    const client = transactionClient || await this.pool.connect();
    const shouldManageTransaction = !transactionClient;
    
    try {
      if (shouldManageTransaction) {
        await client.query('BEGIN');
      }

      // Get all pending reservations for this order
      const reservations = await client.query(
        'SELECT * FROM stock_reservations WHERE order_id = $1 AND status = $2',
        [orderId, 'pending']
      );

      for (const reservation of reservations.rows) {
        // Mark reservation as cancelled
        await client.query(
          'UPDATE stock_reservations SET status = $1 WHERE id = $2',
          ['cancelled', reservation.id]
        );
      }

      if (shouldManageTransaction) {
        await client.query('COMMIT');
      }
    } catch (error) {
      if (shouldManageTransaction) {
        await client.query('ROLLBACK');
      }
      console.error('Error cancelling reservations:', error);
      throw error;
    } finally {
      if (shouldManageTransaction) {
        client.release();
      }
    }
  }

  /**
   * Clean up expired reservations
   */
  async cleanupExpiredReservations(): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      // Mark expired reservations as expired
      const result = await client.query(
        `UPDATE stock_reservations 
         SET status = 'expired' 
         WHERE status = 'pending' AND expires_at < NOW()`
      );

      return result.rowCount || 0;
    } catch (error) {
      console.error('Error cleaning up expired reservations:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get available stock for a product (considering reservations)
   */
  async getAvailableStock(productId: number, configuration?: ProductConfiguration): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      // Check if product has variation stock tracking
      const variationCheck = await client.query(
        `SELECT COUNT(*) as count 
         FROM product_variations 
         WHERE product_id = $1 AND tracks_stock = true`,
        [productId]
      );

      const hasVariationStock = parseInt(variationCheck.rows[0].count) > 0;

      // If has variation stock and configuration provided, check variation stock
      if (hasVariationStock && configuration?.variations) {
        const result = await this.variationStockService.checkAvailability(productId, configuration);
        return result.availableQuantity;
      }

      // Otherwise use product-level stock
      const productResult = await client.query(
        `SELECT stock,
         CASE 
           WHEN backorders_allowed IS NULL THEN false
           WHEN LOWER(TRIM(backorders_allowed)) IN ('yes', '1', 'true', 'on') THEN true
           ELSE false
         END as backorders_allowed
         FROM products WHERE id = $1`,
        [productId]
      );

      if (productResult.rows.length === 0) {
        throw new NotFoundError('Product', { productId });
      }

      const currentStock = productResult.rows[0].stock;
      const backordersAllowed = productResult.rows[0].backorders_allowed;

      // Get reserved stock
      const reservationResult = await client.query(
        `SELECT COALESCE(SUM(quantity), 0) as reserved
         FROM stock_reservations 
         WHERE product_id = $1 AND status = 'pending' AND expires_at > NOW()`,
        [productId]
      );

      const reservedStock = parseInt(reservationResult.rows[0].reserved);
      const availableStock = currentStock - reservedStock;
      
      // If backorders are allowed and stock is 0 or negative, return 0 to indicate backorder is available
      // Otherwise return the actual available stock
      if (backordersAllowed && availableStock <= 0) {
        return 0; // Indicates backorder is available
      }
      
      return availableStock;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('Error getting available stock:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reserve variation stock for an order
   */
  async reserveVariationStock(
    orderId: number, 
    configuration: ProductConfiguration, 
    quantity: number,
    client?: any
  ): Promise<void> {
    // Check if configuration has variation selections
    if (!configuration.variations || Object.keys(configuration.variations).length === 0) {
      return; // No variations, skip
    }

    // Reserve stock for each variation option
    for (const optionId of Object.values(configuration.variations)) {
      await this.variationStockService.reserveVariationStock(
        Number(optionId),
        quantity,
        orderId,
        client
      );
    }
  }

  /**
   * Confirm variation stock reservations (on payment)
   */
  async confirmVariationReservations(orderId: number): Promise<void> {
    await this.variationStockService.confirmReservation(orderId);
  }

  /**
   * Release variation stock reservations (on order cancellation)
   */
  async releaseVariationReservations(orderId: number): Promise<void> {
    await this.variationStockService.releaseVariationStock(orderId);
  }
}
