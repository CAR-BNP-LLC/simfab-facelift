import { Pool } from 'pg';
import { NotFoundError, ValidationError } from '../utils/errors';
import { OrderService } from './OrderService';
import { PaymentService } from './PaymentService';

export interface AdvancedRefundRequest {
  orderId: number;
  refundType: 'full' | 'partial' | 'item_specific';
  amount?: number;
  reason: string;
  reasonCode: 'customer_request' | 'defective_product' | 'wrong_item' | 'not_delivered' | 'duplicate_payment' | 'fraud' | 'other';
  initiatedBy: number;
  notifyCustomer: boolean;
  items?: Array<{
    orderItemId: number;
    quantity: number;
    reason: string;
  }>;
}

export interface RefundAnalytics {
  totalRefunds: number;
  totalRefundAmount: number;
  averageRefundAmount: number;
  refundRate: number;
  refundReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
    totalAmount: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    refunds: number;
    amount: number;
  }>;
  topRefundedProducts: Array<{
    productId: number;
    productName: string;
    refundCount: number;
    refundAmount: number;
  }>;
}

export class AdvancedRefundService {
  private orderService: OrderService;
  private paymentService: PaymentService;

  constructor(private pool: Pool) {
    this.orderService = new OrderService(pool);
    this.paymentService = new PaymentService(pool);
  }

  /**
   * Process advanced refund with detailed tracking
   */
  async processAdvancedRefund(refundRequest: AdvancedRefundRequest): Promise<{
    refundId: number;
    orderId: number;
    refundType: string;
    amount: number;
    status: string;
    estimatedProcessingTime: string;
    customerNotificationSent: boolean;
  }> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get comprehensive order details
      const orderResult = await client.query(
        `SELECT o.*, p.status as payment_status, p.transaction_id, p.amount as payment_amount,
                u.email as customer_email, u.first_name, u.last_name
         FROM orders o
         LEFT JOIN payments p ON o.id = p.order_id
         LEFT JOIN users u ON o.user_id = u.id
         WHERE o.id = $1`,
        [refundRequest.orderId]
      );

      if (orderResult.rows.length === 0) {
        throw new NotFoundError('Order', { orderId: refundRequest.orderId });
      }

      const order = orderResult.rows[0];

      // Validate refund eligibility
      await this.validateRefundEligibility(order, refundRequest);

      // Calculate refund amount based on type
      const refundAmount = await this.calculateRefundAmount(client, refundRequest, order);

      // Create detailed refund record
      const refundResult = await client.query(
        `INSERT INTO refunds (
          order_id, payment_id, amount, reason, reason_code, refund_type,
          status, initiated_by, notify_customer, created_at
        ) VALUES ($1, (SELECT id FROM payments WHERE order_id = $1), $2, $3, $4, $5, 'pending', $6, $7, CURRENT_TIMESTAMP)
        RETURNING *`,
        [
          refundRequest.orderId,
          refundAmount,
          refundRequest.reason,
          refundRequest.reasonCode,
          refundRequest.refundType,
          refundRequest.initiatedBy,
          refundRequest.notifyCustomer
        ]
      );

      const refund = refundResult.rows[0];

      // Process item-specific refunds if applicable
      if (refundRequest.refundType === 'item_specific' && refundRequest.items) {
        await this.processItemSpecificRefund(client, refund.id, refundRequest.items);
      }

      // Update order and payment status
      await this.updateOrderRefundStatus(client, refundRequest.orderId, refundAmount, order.payment_amount);

      // Send customer notification if requested
      let customerNotificationSent = false;
      if (refundRequest.notifyCustomer && order.customer_email) {
        customerNotificationSent = await this.sendRefundNotification(order, refund);
      }

      // Log refund action
      await this.logRefundAction(client, refund.id, refundRequest);

      await client.query('COMMIT');

      return {
        refundId: refund.id,
        orderId: refund.order_id,
        refundType: refund.refund_type,
        amount: refund.amount,
        status: refund.status,
        estimatedProcessingTime: this.getEstimatedProcessingTime(refundRequest.refundType),
        customerNotificationSent
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Advanced refund processing failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get comprehensive refund analytics
   */
  async getRefundAnalytics(timeframe: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<RefundAnalytics> {
    const client = await this.pool.connect();
    
    try {
      const interval = this.getTimeframeInterval(timeframe);

      // Basic refund statistics
      const basicStats = await client.query(`
        SELECT 
          COUNT(*) as total_refunds,
          SUM(amount) as total_refund_amount,
          AVG(amount) as average_refund_amount
        FROM refunds
        WHERE created_at >= NOW() - INTERVAL '${interval}'
        AND status = 'completed'
      `);

      // Total payments for refund rate calculation
      const paymentStats = await client.query(`
        SELECT SUM(amount) as total_payments
        FROM payments
        WHERE created_at >= NOW() - INTERVAL '${interval}'
        AND status = 'completed'
      `);

      // Refund reasons breakdown
      const reasonStats = await client.query(`
        SELECT 
          reason_code,
          COUNT(*) as count,
          SUM(amount) as total_amount
        FROM refunds
        WHERE created_at >= NOW() - INTERVAL '${interval}'
        AND status = 'completed'
        GROUP BY reason_code
        ORDER BY count DESC
      `);

      // Monthly trends
      const monthlyTrends = await client.query(`
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM') as month,
          COUNT(*) as refunds,
          SUM(amount) as amount
        FROM refunds
        WHERE created_at >= NOW() - INTERVAL '${interval}'
        AND status = 'completed'
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY month DESC
        LIMIT 12
      `);

      // Top refunded products
      const topProducts = await client.query(`
        SELECT 
          oi.product_id,
          p.name as product_name,
          COUNT(r.id) as refund_count,
          SUM(r.amount) as refund_amount
        FROM refunds r
        JOIN orders o ON r.order_id = o.id
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE r.created_at >= NOW() - INTERVAL '${interval}'
        AND r.status = 'completed'
        GROUP BY oi.product_id, p.name
        ORDER BY refund_count DESC
        LIMIT 10
      `);

      const totalRefunds = parseInt(basicStats.rows[0]?.total_refunds || '0');
      const totalRefundAmount = parseFloat(basicStats.rows[0]?.total_refund_amount || '0');
      const totalPayments = parseFloat(paymentStats.rows[0]?.total_payments || '0');

      return {
        totalRefunds,
        totalRefundAmount,
        averageRefundAmount: parseFloat(basicStats.rows[0]?.average_refund_amount || '0'),
        refundRate: totalPayments > 0 ? (totalRefundAmount / totalPayments) * 100 : 0,
        refundReasons: reasonStats.rows.map(row => ({
          reason: row.reason_code,
          count: parseInt(row.count),
          percentage: totalRefunds > 0 ? (parseInt(row.count) / totalRefunds) * 100 : 0,
          totalAmount: parseFloat(row.total_amount)
        })),
        monthlyTrends: monthlyTrends.rows.map(row => ({
          month: row.month,
          refunds: parseInt(row.refunds),
          amount: parseFloat(row.amount)
        })),
        topRefundedProducts: topProducts.rows.map(row => ({
          productId: row.product_id,
          productName: row.product_name,
          refundCount: parseInt(row.refund_count),
          refundAmount: parseFloat(row.refund_amount)
        }))
      };

    } finally {
      client.release();
    }
  }

  /**
   * Get refund processing insights and recommendations
   */
  async getRefundInsights(): Promise<{
    insights: Array<{
      type: 'warning' | 'info' | 'success';
      title: string;
      description: string;
      recommendation?: string;
    }>;
    metrics: {
      averageProcessingTime: number;
      customerSatisfactionScore: number;
      refundPreventionOpportunities: number;
    };
  }> {
    const client = await this.pool.connect();
    
    try {
      const insights: Array<{
        type: 'warning' | 'info' | 'success';
        title: string;
        description: string;
        recommendation?: string;
      }> = [];

      // Check refund rate trends
      const refundRateTrend = await client.query(`
        SELECT 
          AVG(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) * 100 as recent_rate,
          AVG(CASE WHEN created_at >= NOW() - INTERVAL '30 days' AND created_at < NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) * 100 as previous_rate
        FROM refunds
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);

      const recentRate = parseFloat(refundRateTrend.rows[0]?.recent_rate || '0');
      const previousRate = parseFloat(refundRateTrend.rows[0]?.previous_rate || '0');

      if (recentRate > previousRate * 1.2) {
        insights.push({
          type: 'warning',
          title: 'Refund Rate Increasing',
          description: `Refund rate has increased by ${((recentRate - previousRate) / previousRate * 100).toFixed(1)}% in the last 7 days`,
          recommendation: 'Review recent orders and product quality issues'
        });
      }

      // Check high-refund products
      const highRefundProducts = await client.query(`
        SELECT p.name, COUNT(r.id) as refund_count
        FROM products p
        JOIN order_items oi ON p.id = oi.product_id
        JOIN orders o ON oi.order_id = o.id
        JOIN refunds r ON o.id = r.order_id
        WHERE r.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY p.id, p.name
        HAVING COUNT(r.id) > 3
        ORDER BY refund_count DESC
        LIMIT 3
      `);

      if (highRefundProducts.rows.length > 0) {
        insights.push({
          type: 'warning',
          title: 'High Refund Products',
          description: `${highRefundProducts.rows.length} products have high refund rates`,
          recommendation: 'Review product descriptions and quality control'
        });
      }

      // Check processing time
      const processingTime = await client.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_processing_time
        FROM refunds
        WHERE completed_at IS NOT NULL
        AND created_at >= NOW() - INTERVAL '30 days'
      `);

      const avgProcessingTime = parseFloat(processingTime.rows[0]?.avg_processing_time || '0');

      if (avgProcessingTime > 86400) { // More than 24 hours
        insights.push({
          type: 'info',
          title: 'Slow Refund Processing',
          description: `Average refund processing time is ${(avgProcessingTime / 3600).toFixed(1)} hours`,
          recommendation: 'Consider automating refund approvals for small amounts'
        });
      }

      return {
        insights,
        metrics: {
          averageProcessingTime: avgProcessingTime,
          customerSatisfactionScore: this.calculateSatisfactionScore(insights),
          refundPreventionOpportunities: highRefundProducts.rows.length
        }
      };

    } finally {
      client.release();
    }
  }

  /**
   * Validate refund eligibility
   */
  private async validateRefundEligibility(order: any, refundRequest: AdvancedRefundRequest): Promise<void> {
    if (order.payment_status !== 'paid') {
      throw new ValidationError('Order must be paid to process refund');
    }

    if (order.status === 'cancelled') {
      throw new ValidationError('Cannot refund a cancelled order');
    }

    // Check if order is too old (e.g., more than 90 days)
    const orderAge = Date.now() - new Date(order.created_at).getTime();
    const maxRefundAge = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds

    if (orderAge > maxRefundAge) {
      throw new ValidationError('Order is too old for automatic refund processing');
    }
  }

  /**
   * Calculate refund amount based on type
   */
  private async calculateRefundAmount(client: any, refundRequest: AdvancedRefundRequest, order: any): Promise<number> {
    switch (refundRequest.refundType) {
      case 'full':
        return order.payment_amount;
      
      case 'partial':
        if (!refundRequest.amount || refundRequest.amount <= 0) {
          throw new ValidationError('Partial refund requires a valid amount');
        }
        if (refundRequest.amount > order.payment_amount) {
          throw new ValidationError('Refund amount cannot exceed payment amount');
        }
        return refundRequest.amount;
      
      case 'item_specific':
        if (!refundRequest.items || refundRequest.items.length === 0) {
          throw new ValidationError('Item-specific refund requires item details');
        }
        return await this.calculateItemSpecificRefund(client, refundRequest.orderId, refundRequest.items);
      
      default:
        throw new ValidationError('Invalid refund type');
    }
  }

  /**
   * Calculate refund amount for specific items
   */
  private async calculateItemSpecificRefund(client: any, orderId: number, items: any[]): Promise<number> {
    let totalRefund = 0;

    for (const item of items) {
      const itemResult = await client.query(
        'SELECT unit_price FROM order_items WHERE id = $1 AND order_id = $2',
        [item.orderItemId, orderId]
      );

      if (itemResult.rows.length === 0) {
        throw new ValidationError(`Order item ${item.orderItemId} not found`);
      }

      const unitPrice = parseFloat(itemResult.rows[0].unit_price);
      totalRefund += unitPrice * item.quantity;
    }

    return totalRefund;
  }

  /**
   * Process item-specific refund
   */
  private async processItemSpecificRefund(client: any, refundId: number, items: any[]): Promise<void> {
    for (const item of items) {
      await client.query(
        `INSERT INTO refund_items (refund_id, order_item_id, quantity, reason)
         VALUES ($1, $2, $3, $4)`,
        [refundId, item.orderItemId, item.quantity, item.reason]
      );
    }
  }

  /**
   * Update order refund status
   */
  private async updateOrderRefundStatus(client: any, orderId: number, refundAmount: number, paymentAmount: number): Promise<void> {
    const refundStatus = refundAmount === paymentAmount ? 'full' : 'partial';
    
    await client.query(
      `UPDATE orders 
       SET refund_status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [refundStatus, orderId]
    );

    await client.query(
      `UPDATE payments 
       SET refunded_amount = refunded_amount + $1, 
           refund_status = CASE 
             WHEN refunded_amount + $1 >= amount THEN 'full'
             ELSE 'partial'
           END
       WHERE order_id = $2`,
      [refundAmount, orderId]
    );
  }

  /**
   * Send refund notification to customer
   */
  private async sendRefundNotification(order: any, refund: any): Promise<boolean> {
    // This would integrate with email service
    console.log(`Refund notification sent to ${order.customer_email} for order ${order.order_number}`);
    return true;
  }

  /**
   * Log refund action
   */
  private async logRefundAction(client: any, refundId: number, refundRequest: AdvancedRefundRequest): Promise<void> {
    await client.query(
      `INSERT INTO refund_logs (refund_id, action, details, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [
        refundId,
        'refund_initiated',
        JSON.stringify({
          refundType: refundRequest.refundType,
          reasonCode: refundRequest.reasonCode,
          notifyCustomer: refundRequest.notifyCustomer
        })
      ]
    );
  }

  /**
   * Get estimated processing time
   */
  private getEstimatedProcessingTime(refundType: string): string {
    switch (refundType) {
      case 'full':
        return '1-3 business days';
      case 'partial':
        return '2-5 business days';
      case 'item_specific':
        return '3-7 business days';
      default:
        return '2-5 business days';
    }
  }

  /**
   * Get timeframe interval
   */
  private getTimeframeInterval(timeframe: string): string {
    switch (timeframe) {
      case '7d': return '7 days';
      case '30d': return '30 days';
      case '90d': return '90 days';
      case '1y': return '1 year';
      default: return '30 days';
    }
  }

  /**
   * Calculate customer satisfaction score
   */
  private calculateSatisfactionScore(insights: any[]): number {
    const warningCount = insights.filter(i => i.type === 'warning').length;
    const infoCount = insights.filter(i => i.type === 'info').length;
    
    // Base score of 80, reduce by warnings, slight reduction for info
    return Math.max(0, 80 - (warningCount * 15) - (infoCount * 5));
  }
}
