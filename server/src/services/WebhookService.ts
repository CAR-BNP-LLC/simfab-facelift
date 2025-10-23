import { Pool } from 'pg';
import { paypalClient } from '../config/paypal';
import * as paypal from '@paypal/checkout-server-sdk';
import { OrderService } from './OrderService';

export interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  create_time: string;
  resource_type: string;
  resource: any;
  summary: string;
  links: any[];
}

export class WebhookService {
  private orderService: OrderService;

  constructor(private pool: Pool) {
    this.orderService = new OrderService(pool);
  }

  async verifyWebhookSignature(
    headers: any,
    body: string,
    webhookId: string
  ): Promise<boolean> {
    try {
      const request = new (paypal as any).notifications.WebhooksVerifySignatureRequest();
      request.requestBody({
        auth_algo: headers['paypal-auth-algo'],
        cert_id: headers['paypal-cert-id'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: webhookId,
        webhook_event: JSON.parse(body)
      });

      const response = await paypalClient.execute(request);
      return response.result.verification_status === 'SUCCESS';
    } catch (error) {
      console.error('Webhook verification failed:', error);
      return false;
    }
  }

  async handleWebhookEvent(event: PayPalWebhookEvent): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Log webhook event
      await this.logWebhookEvent(event);

      switch (event.event_type) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          await this.handlePaymentCompleted(event);
          break;
        case 'PAYMENT.CAPTURE.DENIED':
          await this.handlePaymentDenied(event);
          break;
        case 'PAYMENT.CAPTURE.PENDING':
          await this.handlePaymentPending(event);
          break;
        case 'PAYMENT.CAPTURE.REFUNDED':
          await this.handlePaymentRefunded(event);
          break;
        default:
          console.log(`Unhandled webhook event: ${event.event_type}`);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Webhook processing failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private async handlePaymentCompleted(event: PayPalWebhookEvent) {
    const client = await this.pool.connect();
    try {
      const capture = event.resource;
      const orderId = capture.custom_id;

      // Update payment status
      await client.query(
        `UPDATE payments 
         SET status = 'completed', transaction_id = $1, completed_at = CURRENT_TIMESTAMP
         WHERE order_id = $2 AND transaction_id = $3`,
        [capture.id, orderId, capture.id]
      );

      // Update order payment status and confirm stock reservations
      await this.orderService.confirmOrderPayment(orderId);

      console.log(`Payment completed for order ${orderId}`);
    } finally {
      client.release();
    }
  }

  private async handlePaymentDenied(event: PayPalWebhookEvent) {
    const client = await this.pool.connect();
    try {
      const capture = event.resource;
      const orderId = capture.custom_id;

      // Get order first
      const orderResult = await client.query(
        'SELECT order_number FROM orders WHERE id = $1',
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        console.error(`Order ${orderId} not found for payment denial`);
        return;
      }

      const order = orderResult.rows[0];

      // Update payment status
      await client.query(
        `UPDATE payments 
         SET status = 'failed', failure_reason = $1
         WHERE order_id = $2`,
        [capture.reason_code || 'Payment denied', orderId]
      );

      // Update order status and cancel stock reservations
      await client.query(
        `UPDATE orders 
         SET payment_status = 'failed', status = 'cancelled'
         WHERE id = $1`,
        [orderId]
      );

      // Cancel stock reservations
      await this.orderService.cancelOrder(order.order_number);

      console.log(`Payment denied for order ${orderId}`);
    } finally {
      client.release();
    }
  }

  private async handlePaymentPending(event: PayPalWebhookEvent) {
    const client = await this.pool.connect();
    try {
      const capture = event.resource;
      const orderId = capture.custom_id;

      // Update payment status
      await client.query(
        `UPDATE payments 
         SET status = 'processing'
         WHERE order_id = $1`,
        [orderId]
      );

      console.log(`Payment pending for order ${orderId}`);
    } finally {
      client.release();
    }
  }

  private async handlePaymentRefunded(event: PayPalWebhookEvent) {
    const client = await this.pool.connect();
    try {
      const refund = event.resource;
      const orderId = refund.custom_id;

      // Create refund record
      await client.query(
        `INSERT INTO refunds (payment_id, order_id, refund_transaction_id, amount, status)
         SELECT p.id, $1, $2, $3, 'completed'
         FROM payments p WHERE p.order_id = $1`,
        [orderId, refund.id, refund.amount.value]
      );

      // Update payment status
      await client.query(
        `UPDATE payments 
         SET status = 'refunded'
         WHERE order_id = $1`,
        [orderId]
      );

      // Restore stock for refunded items
      await this.restoreStockFromRefund(client, orderId);

      console.log(`Payment refunded for order ${orderId}`);
    } finally {
      client.release();
    }
  }

  private async restoreStockFromRefund(client: any, orderId: number) {
    // Get order items for refund
    const orderItems = await client.query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [orderId]
    );

    for (const item of orderItems.rows) {
      // Restore stock
      await client.query(
        'UPDATE products SET stock = stock + $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }
  }

  private async logWebhookEvent(event: PayPalWebhookEvent) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO webhook_events (event_id, event_type, event_data, processed_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [event.id, event.event_type, JSON.stringify(event), new Date()]
      );
    } finally {
      client.release();
    }
  }
}