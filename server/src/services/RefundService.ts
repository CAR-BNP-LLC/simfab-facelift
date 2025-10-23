import { Pool } from 'pg';
import { NotFoundError, ValidationError } from '../utils/errors';
import { OrderService } from './OrderService';

export interface RefundRequest {
  orderId: number;
  amount?: number; // Optional partial refund
  reason: string;
  initiatedBy: number; // Admin user ID
}

export interface RefundResult {
  refundId: number;
  orderId: number;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  refundTransactionId?: string;
  reason: string;
  createdAt: Date;
}

export class RefundService {
  private orderService: OrderService;

  constructor(private pool: Pool) {
    this.orderService = new OrderService(pool);
  }

  /**
   * Process a refund for an order
   */
  async processRefund(refundRequest: RefundRequest): Promise<RefundResult> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get order details
      const orderResult = await client.query(
        `SELECT o.*, p.status as payment_status, p.transaction_id, p.amount as payment_amount
         FROM orders o
         LEFT JOIN payments p ON o.id = p.order_id
         WHERE o.id = $1`,
        [refundRequest.orderId]
      );

      if (orderResult.rows.length === 0) {
        throw new NotFoundError('Order', { orderId: refundRequest.orderId });
      }

      const order = orderResult.rows[0];

      // Validate refund eligibility
      if (order.payment_status !== 'paid') {
        throw new ValidationError('Order must be paid to process refund');
      }

      if (order.status === 'cancelled') {
        throw new ValidationError('Cannot refund a cancelled order');
      }

      // Calculate refund amount
      const refundAmount = refundRequest.amount || order.payment_amount;
      
      if (refundAmount > order.payment_amount) {
        throw new ValidationError('Refund amount cannot exceed payment amount');
      }

      if (refundAmount <= 0) {
        throw new ValidationError('Refund amount must be greater than zero');
      }

      // Check for existing refunds
      const existingRefundsResult = await client.query(
        'SELECT SUM(amount) as total_refunded FROM refunds WHERE order_id = $1 AND status = $2',
        [refundRequest.orderId, 'completed']
      );

      const totalRefunded = parseFloat(existingRefundsResult.rows[0]?.total_refunded || '0');
      
      if (totalRefunded + refundAmount > order.payment_amount) {
        throw new ValidationError(
          `Total refunds (${totalRefunded + refundAmount}) cannot exceed payment amount (${order.payment_amount})`
        );
      }

      // Create refund record
      const refundResult = await client.query(
        `INSERT INTO refunds (order_id, payment_id, amount, reason, status, initiated_by, created_at)
         VALUES ($1, (SELECT id FROM payments WHERE order_id = $1), $2, $3, 'pending', $4, CURRENT_TIMESTAMP)
         RETURNING *`,
        [refundRequest.orderId, refundAmount, refundRequest.reason, refundRequest.initiatedBy]
      );

      const refund = refundResult.rows[0];

      // Update order status if full refund
      if (refundAmount === order.payment_amount) {
        await client.query(
          `UPDATE orders 
           SET status = 'refunded', payment_status = 'refunded', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [refundRequest.orderId]
        );

        // Restore stock for full refunds
        await this.restoreStockForRefund(client, refundRequest.orderId);
      } else {
        // Partial refund - update payment status
        await client.query(
          `UPDATE orders 
           SET payment_status = 'partially_refunded', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [refundRequest.orderId]
        );
      }

      await client.query('COMMIT');

      return {
        refundId: refund.id,
        orderId: refund.order_id,
        amount: refund.amount,
        status: refund.status,
        reason: refund.reason,
        createdAt: refund.created_at
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Refund processing failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Complete a refund (called by webhook or manual completion)
   */
  async completeRefund(refundId: number, refundTransactionId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update refund status
      await client.query(
        `UPDATE refunds 
         SET status = 'completed', refund_transaction_id = $1, completed_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [refundTransactionId, refundId]
      );

      // Get refund details
      const refundResult = await client.query(
        'SELECT * FROM refunds WHERE id = $1',
        [refundId]
      );

      if (refundResult.rows.length === 0) {
        throw new NotFoundError('Refund', { refundId });
      }

      const refund = refundResult.rows[0];

      // Update payment status
      await client.query(
        `UPDATE payments 
         SET status = CASE 
           WHEN (SELECT SUM(amount) FROM refunds WHERE order_id = $1 AND status = 'completed') >= amount 
           THEN 'refunded' 
           ELSE 'partially_refunded' 
         END
         WHERE order_id = $1`,
        [refund.order_id]
      );

      await client.query('COMMIT');
      console.log(`Refund ${refundId} completed successfully`);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Refund completion failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get refund history for an order
   */
  async getRefundHistory(orderId: number): Promise<RefundResult[]> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        `SELECT r.*, u.email as initiated_by_email
         FROM refunds r
         LEFT JOIN users u ON r.initiated_by = u.id
         WHERE r.order_id = $1
         ORDER BY r.created_at DESC`,
        [orderId]
      );

      return result.rows.map(row => ({
        refundId: row.id,
        orderId: row.order_id,
        amount: row.amount,
        status: row.status,
        refundTransactionId: row.refund_transaction_id,
        reason: row.reason,
        createdAt: row.created_at
      }));

    } finally {
      client.release();
    }
  }

  /**
   * Get refund statistics
   */
  async getRefundStatistics(): Promise<{
    totalRefunds: number;
    totalRefundAmount: number;
    averageRefundAmount: number;
    refundRate: number;
    pendingRefunds: number;
  }> {
    const client = await this.pool.connect();
    
    try {
      // Get refund stats
      const refundStats = await client.query(`
        SELECT 
          COUNT(*) as total_refunds,
          SUM(amount) as total_refund_amount,
          AVG(amount) as average_refund_amount,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_refunds
        FROM refunds
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      `);

      // Get total payments for refund rate calculation
      const paymentStats = await client.query(`
        SELECT SUM(amount) as total_payments
        FROM payments
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND status = 'completed'
      `);

      const refundData = refundStats.rows[0];
      const paymentData = paymentStats.rows[0];

      const totalRefunds = parseInt(refundData.total_refunds || '0');
      const totalRefundAmount = parseFloat(refundData.total_refund_amount || '0');
      const totalPayments = parseFloat(paymentData.total_payments || '0');

      return {
        totalRefunds,
        totalRefundAmount,
        averageRefundAmount: parseFloat(refundData.average_refund_amount || '0'),
        refundRate: totalPayments > 0 ? (totalRefundAmount / totalPayments) * 100 : 0,
        pendingRefunds: parseInt(refundData.pending_refunds || '0')
      };

    } finally {
      client.release();
    }
  }

  /**
   * Restore stock for refunded items
   */
  private async restoreStockForRefund(client: any, orderId: number): Promise<void> {
    // Get order items
    const orderItems = await client.query(
      'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
      [orderId]
    );

    // Restore stock for each item
    for (const item of orderItems.rows) {
      await client.query(
        'UPDATE products SET stock = stock + $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    console.log(`Stock restored for ${orderItems.rows.length} items in order ${orderId}`);
  }
}
