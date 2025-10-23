import { Pool } from 'pg';
import { NotFoundError, ValidationError } from '../utils/errors';

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
  constructor(private pool: Pool) {}

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

      // Check current stock
      const productResult = await client.query(
        'SELECT stock FROM products WHERE id = $1',
        [productId]
      );

      if (productResult.rows.length === 0) {
        throw new NotFoundError('Product', { productId });
      }

      const currentStock = productResult.rows[0].stock;

      // Check existing reservations
      const reservationResult = await client.query(
        `SELECT COALESCE(SUM(quantity), 0) as reserved
         FROM stock_reservations 
         WHERE product_id = $1 AND status = 'pending' AND expires_at > NOW()`,
        [productId]
      );

      const reservedStock = parseInt(reservationResult.rows[0].reserved);
      const availableStock = currentStock - reservedStock;

      if (quantity > availableStock) {
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
  async getAvailableStock(productId: number): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      // Get current stock
      const productResult = await client.query(
        'SELECT stock FROM products WHERE id = $1',
        [productId]
      );

      if (productResult.rows.length === 0) {
        throw new NotFoundError('Product', { productId });
      }

      const currentStock = productResult.rows[0].stock;

      // Get reserved stock
      const reservationResult = await client.query(
        `SELECT COALESCE(SUM(quantity), 0) as reserved
         FROM stock_reservations 
         WHERE product_id = $1 AND status = 'pending' AND expires_at > NOW()`,
        [productId]
      );

      const reservedStock = parseInt(reservationResult.rows[0].reserved);
      return currentStock - reservedStock;
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
}
