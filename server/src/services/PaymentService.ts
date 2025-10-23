import { Pool } from 'pg';
import { paypalClient, paypalConfig } from '../config/paypal';
import * as paypal from '@paypal/checkout-server-sdk';
import { PaymentError } from '../utils/errors';
import { OrderService } from './OrderService';
import { CartService } from './CartService';

export interface CreatePaymentData {
  orderId: number;
  amount: number;
  currency: string;
  paymentMethod?: 'paypal_account' | 'guest_card';
  returnUrl: string;
  cancelUrl: string;
}

export interface PaymentResult {
  paymentId: string;
  approvalUrl: string;
  status: string;
  orderNumber?: string;
}

export class PaymentService {
  private orderService: OrderService;
  private cartService: CartService;

  constructor(private pool: Pool) {
    this.orderService = new OrderService(pool);
    this.cartService = new CartService(pool);
  }

  async createPayment(data: CreatePaymentData): Promise<PaymentResult> {
    const client = await this.pool.connect();
    
    try {
      // Create PayPal order request
      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer("return=representation");
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: data.currency,
            value: data.amount.toString()
          },
          custom_id: data.orderId.toString()
        }],
        application_context: {
          return_url: data.returnUrl,
          cancel_url: data.cancelUrl,
          brand_name: 'SimFab',
          landing_page: data.paymentMethod === 'guest_card' ? 'NO_PREFERENCE' : 'LOGIN',
          user_action: 'PAY_NOW'
        }
      });

      // Execute PayPal request
      const response = await paypalClient.execute(request);
      const order = response.result;

      // Save payment record to database
      await this.savePaymentRecord(data.orderId, order.id, data.amount, data.currency);

      return {
        paymentId: order.id,
        approvalUrl: order.links?.find((link: any) => link.rel === 'approve')?.href || '',
        status: order.status || 'CREATED'
      };
    } catch (error) {
      console.error('Payment creation failed:', error);
      throw new PaymentError('Failed to create payment');
    } finally {
      client.release();
    }
  }

  async executePayment(paymentId: string, payerId: string, orderId: number): Promise<PaymentResult> {
    const client = await this.pool.connect();
    
    try {
      // Execute PayPal payment capture
      const request = new paypal.orders.OrdersCaptureRequest(paymentId);
      request.requestBody({} as any);

      const response = await paypalClient.execute(request);
      const capture = response.result;

      // Update payment record
      await this.updatePaymentStatus(paymentId, 'completed', capture.id);

      // Confirm order payment and stock reservations
      await this.orderService.confirmOrderPayment(orderId);

      // Get order details to find cart ID
      const order = await this.orderService.getOrderById(orderId);
      if (order && order.cart_id) {
        // Clear cart after successful payment
        await this.cartService.clearCartAfterPayment(order.cart_id);
      }

      return {
        paymentId: capture.id,
        approvalUrl: '',
        status: capture.status || 'COMPLETED',
        orderNumber: order?.order_number
      };
    } catch (error) {
      console.error('Payment execution failed:', error);
      await this.updatePaymentStatus(paymentId, 'failed');
      throw new PaymentError('Failed to execute payment');
    } finally {
      client.release();
    }
  }

  async getPaymentStatus(paymentId: string): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM payments WHERE transaction_id = $1',
        [paymentId]
      );
      
      if (result.rows.length === 0) {
        throw new PaymentError('Payment not found');
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  private async savePaymentRecord(orderId: number, paymentId: string, amount: number, currency: string) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO payments (order_id, payment_method, payment_provider, transaction_id, amount, currency, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [orderId, 'paypal', 'paypal', paymentId, amount, currency, 'pending']
      );
    } finally {
      client.release();
    }
  }

  private async updatePaymentStatus(paymentId: string, status: string, transactionId?: string) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `UPDATE payments SET status = $1, transaction_id = COALESCE($2, transaction_id), completed_at = CURRENT_TIMESTAMP
         WHERE transaction_id = $3`,
        [status, transactionId, paymentId]
      );
    } finally {
      client.release();
    }
  }

  private async updateOrderPaymentStatus(orderId: number, status: string) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `UPDATE orders SET payment_status = $1 WHERE id = $2`,
        [status, orderId]
      );
    } finally {
      client.release();
    }
  }
}
