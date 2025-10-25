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
  billingAddress?: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
    email?: string;
  };
  shippingAddress?: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
    email?: string;
  };
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
      await client.query('BEGIN');

      // CRITICAL: Check if order already has a pending/completed payment
      const existingPayment = await client.query(
        `SELECT p.*, o.payment_status, o.status as order_status 
         FROM payments p 
         JOIN orders o ON p.order_id = o.id 
         WHERE p.order_id = $1 
         AND p.status IN ('pending', 'processing', 'completed')
         ORDER BY p.created_at DESC 
         LIMIT 1`,
        [data.orderId]
      );

      if (existingPayment.rows.length > 0) {
        const payment = existingPayment.rows[0];
        
        // If payment is already completed, return existing payment
        if (payment.status === 'completed') {
          await client.query('ROLLBACK');
          throw new PaymentError('Payment already completed for this order', 'PAYMENT_ALREADY_COMPLETED', {
            existingPaymentId: payment.transaction_id,
            orderStatus: payment.order_status
          });
        }

        // If payment is pending/processing, return existing payment details
        if (payment.status === 'pending' || payment.status === 'processing') {
          await client.query('ROLLBACK');
          return {
            paymentId: payment.transaction_id,
            approvalUrl: '', // Will be provided by frontend
            status: payment.status.toUpperCase(),
            orderNumber: payment.order_number
          };
        }
      }

      // CRITICAL: Validate order exists and is in correct state
      const orderCheck = await client.query(
        `SELECT id, payment_status, status, total_amount, payment_expires_at 
         FROM orders 
         WHERE id = $1`,
        [data.orderId]
      );

      if (orderCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new PaymentError('Order not found', 'ORDER_NOT_FOUND');
      }

      const order = orderCheck.rows[0];

      // Check if order is expired
      if (order.payment_expires_at && new Date(order.payment_expires_at) < new Date()) {
        await client.query('ROLLBACK');
        throw new PaymentError('Order has expired', 'ORDER_EXPIRED');
      }

      // Check if order is already paid
      if (order.payment_status === 'paid') {
        await client.query('ROLLBACK');
        throw new PaymentError('Order is already paid', 'ORDER_ALREADY_PAID');
      }

      // Validate amount matches order total
      if (Math.abs(parseFloat(data.amount.toString()) - parseFloat(order.total_amount)) > 0.01) {
        await client.query('ROLLBACK');
        throw new PaymentError('Payment amount does not match order total', 'AMOUNT_MISMATCH', {
          expectedAmount: order.total_amount,
          providedAmount: data.amount
        });
      }

      // Create PayPal order request
      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer("return=representation");
      
      // Build purchase unit with address information
      const purchaseUnit: any = {
        amount: {
          currency_code: data.currency,
          value: data.amount.toString()
        },
        custom_id: data.orderId.toString()
      };

      // Add billing address if provided
      if (data.billingAddress) {
        purchaseUnit.payment_source = {
          paypal: {
            experience_context: {
              payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
              brand_name: 'SimFab',
              locale: 'en-US',
              landing_page: data.paymentMethod === 'guest_card' ? 'NO_PREFERENCE' : 'LOGIN',
              user_action: 'PAY_NOW',
              return_url: data.returnUrl,
              cancel_url: data.cancelUrl,
              shipping_preference: 'SET_PROVIDED_ADDRESS'
            }
          }
        };
      }

      // Add shipping address if provided
      if (data.shippingAddress) {
        purchaseUnit.shipping = {
          name: {
            full_name: `${data.shippingAddress.firstName} ${data.shippingAddress.lastName}`
          },
          address: {
            address_line_1: data.shippingAddress.addressLine1,
            address_line_2: data.shippingAddress.addressLine2 || '',
            admin_area_2: data.shippingAddress.city,
            admin_area_1: data.shippingAddress.state,
            postal_code: data.shippingAddress.postalCode,
            country_code: data.shippingAddress.country
          }
        };
      }

      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [purchaseUnit],
        application_context: {
          return_url: data.returnUrl,
          cancel_url: data.cancelUrl,
          brand_name: 'SimFab',
          landing_page: data.paymentMethod === 'guest_card' ? 'NO_PREFERENCE' : 'LOGIN',
          user_action: 'PAY_NOW',
          shipping_preference: data.shippingAddress ? 'SET_PROVIDED_ADDRESS' : 'NO_SHIPPING'
        }
      });

      // Execute PayPal request
      const response = await paypalClient.execute(request);
      const paypalOrder = response.result;

      // CRITICAL: Save payment record with proper error handling
      await this.savePaymentRecord(data.orderId, paypalOrder.id, data.amount, data.currency, client);

      await client.query('COMMIT');

      return {
        paymentId: paypalOrder.id,
        approvalUrl: paypalOrder.links?.find((link: any) => link.rel === 'approve')?.href || '',
        status: paypalOrder.status || 'CREATED'
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Payment creation failed:', error);
      
      if (error instanceof PaymentError) {
        throw error;
      }
      
      throw new PaymentError('Failed to create payment', 'PAYMENT_CREATION_FAILED', { 
        originalError: error instanceof Error ? error.message : String(error) 
      });
    } finally {
      client.release();
    }
  }

  async executePayment(paymentId: string, payerId: string, orderId: number): Promise<PaymentResult> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // CRITICAL: Check if payment is already completed
      const existingPayment = await client.query(
        `SELECT p.*, o.payment_status, o.status as order_status, o.order_number
         FROM payments p 
         JOIN orders o ON p.order_id = o.id 
         WHERE p.transaction_id = $1 AND p.order_id = $2`,
        [paymentId, orderId]
      );

      if (existingPayment.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new PaymentError('Payment not found for this order', 'PAYMENT_NOT_FOUND', { 
          paymentId,
          orderId 
        });
      }

      const payment = existingPayment.rows[0];

      // CRITICAL: Prevent duplicate execution
      if (payment.status === 'completed') {
        await client.query('ROLLBACK');
        return {
          paymentId: payment.transaction_id,
          approvalUrl: '',
          status: 'COMPLETED',
          orderNumber: payment.order_number
        };
      }

      // CRITICAL: Check if payment is in valid state for execution
      if (!['pending', 'processing'].includes(payment.status)) {
        await client.query('ROLLBACK');
        throw new PaymentError('Payment is not in a valid state for execution', 'INVALID_PAYMENT_STATE', {
          currentStatus: payment.status,
          paymentId
        });
      }

      // CRITICAL: Validate order state
      if (payment.order_status !== 'pending') {
        await client.query('ROLLBACK');
        throw new PaymentError('Order is not in a valid state for payment execution', 'INVALID_ORDER_STATE', {
          orderStatus: payment.order_status,
          orderId
        });
      }

      // CRITICAL: Check if order is expired
      const orderCheck = await client.query(
        `SELECT payment_expires_at FROM orders WHERE id = $1`,
        [orderId]
      );

      if (orderCheck.rows.length > 0 && orderCheck.rows[0].payment_expires_at) {
        const expiresAt = new Date(orderCheck.rows[0].payment_expires_at);
        if (expiresAt < new Date()) {
          await client.query('ROLLBACK');
          throw new PaymentError('Order has expired', 'ORDER_EXPIRED', { 
            expiresAt: expiresAt.toISOString()
          });
        }
      }

      // Update payment status to processing before PayPal call
      await client.query(
        `UPDATE payments SET status = 'processing', updated_at = CURRENT_TIMESTAMP 
         WHERE transaction_id = $1`,
        [paymentId]
      );

      // Execute PayPal payment capture
      const request = new paypal.orders.OrdersCaptureRequest(paymentId);
      request.requestBody({} as any);

      const response = await paypalClient.execute(request);
      const capture = response.result;

      // CRITICAL: Validate PayPal response
      if (!capture || capture.status !== 'COMPLETED') {
        await client.query(
          `UPDATE payments SET status = 'failed', failure_reason = $1 
           WHERE transaction_id = $2`,
          [capture?.status || 'Unknown PayPal error', paymentId]
        );
        await client.query('COMMIT');
        throw new PaymentError('PayPal payment capture failed', 'PAYPAL_CAPTURE_FAILED', {
          paypalStatus: capture?.status,
          paymentId
        });
      }

      // Update payment record with success
      await client.query(
        `UPDATE payments 
         SET status = 'completed', 
             transaction_id = $1, 
             completed_at = CURRENT_TIMESTAMP,
             metadata = jsonb_set(COALESCE(metadata, '{}'), '{paypal_capture}', $2::jsonb)
         WHERE transaction_id = $3`,
        [capture.id, JSON.stringify(capture), paymentId]
      );

      // CRITICAL: Confirm order payment and stock reservations atomically
      await this.orderService.confirmOrderPayment(orderId);

      // Get order details to find cart ID
      const order = await this.orderService.getOrderById(orderId);
      if (order && order.cart_id) {
        // Clear cart after successful payment
        await this.cartService.clearCartAfterPayment(order.cart_id);
      }

      await client.query('COMMIT');

      return {
        paymentId: capture.id,
        approvalUrl: '',
        status: capture.status || 'COMPLETED',
        orderNumber: order?.order_number
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Payment execution failed:', error);
      
      // Update payment status to failed if we have a payment record
      try {
        await client.query(
          `UPDATE payments SET status = 'failed', failure_reason = $1 
           WHERE transaction_id = $2`,
          [error instanceof Error ? error.message : String(error), paymentId]
        );
      } catch (updateError) {
        console.error('Failed to update payment status:', updateError);
      }
      
      if (error instanceof PaymentError) {
        throw error;
      }
      
      throw new PaymentError('Failed to execute payment', 'PAYMENT_EXECUTION_FAILED', { 
        originalError: error instanceof Error ? error.message : String(error),
        paymentId,
        orderId
      });
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

  private async savePaymentRecord(orderId: number, paymentId: string, amount: number, currency: string, client?: any) {
    const dbClient = client || await this.pool.connect();
    try {
      // CRITICAL: Check for duplicate transaction_id
      const existingPayment = await dbClient.query(
        'SELECT id FROM payments WHERE transaction_id = $1',
        [paymentId]
      );

      if (existingPayment.rows.length > 0) {
        throw new PaymentError('Payment with this transaction ID already exists', 'DUPLICATE_TRANSACTION_ID', {
          paymentId
        });
      }

      await dbClient.query(
        `INSERT INTO payments (order_id, payment_method, payment_provider, transaction_id, amount, currency, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
        [orderId, 'paypal', 'paypal', paymentId, amount, currency, 'pending']
      );
    } finally {
      if (!client) {
        dbClient.release();
      }
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
