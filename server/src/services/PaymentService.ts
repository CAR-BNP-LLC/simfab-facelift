import { Pool } from 'pg';
import { getPayPalClientForRegion } from '../config/paypal';
import * as paypal from '@paypal/checkout-server-sdk';
import { PaymentError } from '../utils/errors';
import { OrderService } from './OrderService';
import { CartService } from './CartService';
import { EmailService } from './EmailService';

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
  private emailService: EmailService;

  constructor(private pool: Pool) {
    this.orderService = new OrderService(pool);
    this.cartService = new CartService(pool);
    this.emailService = new EmailService(pool);
    this.emailService.initialize();
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
        `SELECT id, payment_status, status, total_amount, shipping_amount, subtotal, discount_amount, tax_amount, payment_expires_at, region 
         FROM orders 
         WHERE id = $1`,
        [data.orderId]
      );

      if (orderCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new PaymentError('Order not found', 'ORDER_NOT_FOUND');
      }

      const order = orderCheck.rows[0];
      const orderRegion = (order.region || 'us') as 'us' | 'eu';

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

      // Parse order total (PostgreSQL returns numeric as string)
      // CRITICAL: Round to 2 decimal places to handle floating-point precision issues
      const orderTotal = Math.round((typeof order.total_amount === 'string' 
        ? parseFloat(order.total_amount) 
        : Number(order.total_amount) || 0) * 100) / 100;
      const paymentAmount = Math.round(parseFloat(data.amount.toString()) * 100) / 100;
      const difference = Math.abs(paymentAmount - orderTotal);
      
      console.log('💳 Payment Amount Validation:', {
        'order.total_amount (raw)': order.total_amount,
        'order.total_amount (type)': typeof order.total_amount,
        'orderTotal (parsed)': orderTotal,
        'paymentAmount (raw)': data.amount,
        'paymentAmount (parsed)': paymentAmount,
        difference,
        'difference > 0.01?': difference > 0.01,
        'threshold check': difference > 0.01 ? 'WILL VALIDATE' : 'WILL PASS (within tolerance)'
      });
      
      // If amounts don't match, check if it's due to shipping being added/updated
      // Allow update if payment amount is higher (likely shipping was added after order creation)
      if (difference > 0.01) {
        // Round all amounts to 2 decimal places for consistent comparison
        const orderShipping = Math.round((typeof order.shipping_amount === 'string'
          ? parseFloat(order.shipping_amount)
          : Number(order.shipping_amount) || 0) * 100) / 100;
        const orderSubtotal = Math.round((typeof order.subtotal === 'string' ? parseFloat(order.subtotal) : Number(order.subtotal) || 0) * 100) / 100;
        const orderDiscount = Math.round((typeof order.discount_amount === 'string' ? parseFloat(order.discount_amount) : Number(order.discount_amount) || 0) * 100) / 100;
        const orderTax = Math.round((typeof order.tax_amount === 'string' ? parseFloat(order.tax_amount) : Number(order.tax_amount) || 0) * 100) / 100;
        
        // Calculate expected total with current shipping
        const expectedTotalWithShipping = Math.round((orderSubtotal - orderDiscount + orderShipping + orderTax) * 100) / 100;
        
        // Calculate what the shipping should be based on payment amount
        const expectedShipping = Math.round((paymentAmount - orderSubtotal + orderDiscount - orderTax) * 100) / 100;
        
        // If payment amount is higher and shipping is missing/wrong, update the order
        // This handles cases where shipping was 0 or incorrectly calculated
        if (paymentAmount > orderTotal && (orderShipping === 0 || expectedShipping > orderShipping)) {
          console.log('⚠️ Updating order total - shipping was missing or incorrect', {
            oldTotal: orderTotal,
            newTotal: paymentAmount,
            difference,
            oldShipping: orderShipping,
            newShipping: expectedShipping,
            expectedTotalWithShipping
          });
          
          // Update order with new shipping and total
          await client.query(
            `UPDATE orders 
             SET shipping_amount = $1, 
                 total_amount = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [expectedShipping, paymentAmount, data.orderId]
          );
          
          // Refresh order data
          const updatedOrder = await client.query(
            `SELECT total_amount FROM orders WHERE id = $1`,
            [data.orderId]
          );
          order.total_amount = updatedOrder.rows[0].total_amount;
          console.log('✅ Order updated with correct shipping:', {
            newShipping: expectedShipping,
            newTotal: paymentAmount
          });
        } else {
          // Payment amount is wrong or lower - reject
          console.error('❌ Payment amount mismatch - rejecting payment', {
            expectedAmount: order.total_amount,
            providedAmount: data.amount,
            difference: difference.toFixed(2),
            orderShipping,
            orderSubtotal,
            orderDiscount,
            orderTax,
            calculatedExpected: expectedTotalWithShipping.toFixed(2),
            'paymentAmount > orderTotal?': paymentAmount > orderTotal,
            'orderShipping === 0?': orderShipping === 0,
            'expectedShipping > orderShipping?': expectedShipping > orderShipping
          });
          await client.query('ROLLBACK');
          throw new PaymentError('Payment amount does not match order total', 'AMOUNT_MISMATCH', {
            expectedAmount: order.total_amount,
            providedAmount: data.amount,
            difference: difference.toFixed(2),
            orderShipping,
            orderSubtotal,
            orderDiscount,
            orderTax,
            calculatedExpected: expectedTotalWithShipping.toFixed(2)
          });
        }
      } else {
        console.log('✅ Payment amount matches order total (within tolerance):', {
          orderTotal,
          paymentAmount,
          difference
        });
      }

      // Create PayPal order request
      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer("return=representation");
      
      // Build purchase unit with address information
      // CRITICAL: Round amount to 2 decimal places for PayPal (required format)
      const paypalAmount = Math.round(paymentAmount * 100) / 100;
      const purchaseUnit: any = {
        amount: {
          currency_code: data.currency,
          value: paypalAmount.toFixed(2) // PayPal requires exactly 2 decimal places
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

      // Get region-specific PayPal client
      const paypalClient = await getPayPalClientForRegion(this.pool, orderRegion);
      
      // Execute PayPal request
      console.log('🚀 Executing PayPal API request:', {
        orderId: data.orderId,
        region: orderRegion,
        amount: data.amount.toString(),
        currency: data.currency,
        purchaseUnitAmount: purchaseUnit.amount.value,
        purchaseUnitCurrency: purchaseUnit.amount.currency_code
      });
      
      let response;
      let paypalOrder;
      try {
        response = await paypalClient.execute(request);
        paypalOrder = response.result;
        console.log('✅ PayPal API response received:', {
          paypalOrderId: paypalOrder.id,
          status: paypalOrder.status,
          links: paypalOrder.links?.map((l: any) => ({ rel: l.rel, href: l.href }))
        });
      } catch (paypalError: any) {
        console.error('❌ PayPal API error:', {
          message: paypalError.message,
          statusCode: paypalError.statusCode,
          details: paypalError.details,
          orderId: data.orderId,
          amount: data.amount,
          currency: data.currency
        });
        await client.query('ROLLBACK');
        throw new PaymentError('PayPal API error: ' + (paypalError.message || 'Unknown error'), 'PAYPAL_API_ERROR', {
          paypalError: paypalError.message,
          statusCode: paypalError.statusCode,
          details: paypalError.details
        });
      }

      // CRITICAL: Save payment record with proper error handling
      // Use the rounded paymentAmount (not the original data.amount which may have precision issues)
      await this.savePaymentRecord(data.orderId, paypalOrder.id, paymentAmount, data.currency, client);

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

  async executePayment(paymentId: string, payerId: string | undefined, orderId: number): Promise<PaymentResult> {
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

      // CRITICAL: Check if order is expired and get region
      const orderCheck = await client.query(
        `SELECT payment_expires_at, region FROM orders WHERE id = $1`,
        [orderId]
      );

      if (orderCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new PaymentError('Order not found', 'ORDER_NOT_FOUND');
      }

      const orderData = orderCheck.rows[0];
      const orderRegion = (orderData.region || 'us') as 'us' | 'eu';

      if (orderData.payment_expires_at) {
        const expiresAt = new Date(orderData.payment_expires_at);
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

      // Get region-specific PayPal client
      const paypalClient = await getPayPalClientForRegion(this.pool, orderRegion);

      // Execute PayPal payment capture
      const request = new paypal.orders.OrdersCaptureRequest(paymentId);
      request.requestBody({} as any);

      const response = await paypalClient.execute(request);
      const capture = response.result;

      // CRITICAL: Validate PayPal response
      if (!capture || capture.status !== 'COMPLETED') {
        // Get order details BEFORE updating payment status (while still in transaction)
        const orderResult = await client.query(
          `SELECT o.order_number, o.customer_email, o.total_amount, o.billing_address
           FROM orders o
           WHERE o.id = $1`,
          [orderId]
        );

        await client.query(
          `UPDATE payments SET status = 'failed', failure_reason = $1 
           WHERE transaction_id = $2`,
          [capture?.status || 'Unknown PayPal error', paymentId]
        );
        
        await client.query('COMMIT');
        
        // Trigger payment failure email event (after commit, outside transaction)
        if (orderResult.rows.length > 0) {
          const order = orderResult.rows[0];
          try {
            // Get customer name from billing address
            let customerName = order.customer_email;
            try {
              const billingAddress = typeof order.billing_address === 'string'
                ? JSON.parse(order.billing_address)
                : order.billing_address;
              if (billingAddress?.firstName && billingAddress?.lastName) {
                customerName = `${billingAddress.firstName} ${billingAddress.lastName}`;
              }
            } catch (error) {
              // Use email as fallback
            }

            const totalAmount = typeof order.total_amount === 'string' ? parseFloat(order.total_amount) : Number(order.total_amount) || 0;
            // Get region from order (default to 'us' for backward compatibility)
            const orderRegion = (order.region || 'us') as 'us' | 'eu';
            
            await this.emailService.triggerEvent(
              'order.payment_failed',
              {
                order_number: order.order_number,
                customer_name: customerName,
                customer_email: order.customer_email,
                order_total: `$${totalAmount.toFixed(2)}`,
                error_message: capture?.status || 'Unknown PayPal error'
              },
              {
                customerEmail: order.customer_email,
                customerName: customerName,
                adminEmail: 'info@simfab.com'
              },
              orderRegion
            );
          } catch (emailError) {
            console.error('Failed to trigger payment failed email event:', emailError);
          }
        }
        
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
      let failureReason = error instanceof Error ? error.message : String(error);
      try {
        await client.query(
          `UPDATE payments SET status = 'failed', failure_reason = $1 
           WHERE transaction_id = $2`,
          [failureReason, paymentId]
        );
      } catch (updateError) {
        console.error('Failed to update payment status:', updateError);
      }
      
      // Get order details for email notification (only if not already sent above)
      if (!(error instanceof PaymentError && error.code === 'PAYPAL_CAPTURE_FAILED')) {
        try {
          const orderResult = await client.query(
            `SELECT o.order_number, o.customer_email, o.total_amount, o.billing_address
             FROM orders o
             WHERE o.id = $1`,
            [orderId]
          );
          
          if (orderResult.rows.length > 0) {
            const order = orderResult.rows[0];
            
            // Get customer name from billing address
            let customerName = order.customer_email;
            try {
              const billingAddress = typeof order.billing_address === 'string'
                ? JSON.parse(order.billing_address)
                : order.billing_address;
              if (billingAddress?.firstName && billingAddress?.lastName) {
                customerName = `${billingAddress.firstName} ${billingAddress.lastName}`;
              }
            } catch (parseError) {
              // Use email as fallback
            }

            const totalAmount = typeof order.total_amount === 'string' ? parseFloat(order.total_amount) : Number(order.total_amount) || 0;
            // Get region from order (default to 'us' for backward compatibility)
            const orderRegion = (order.region || 'us') as 'us' | 'eu';
            
            await this.emailService.triggerEvent(
              'order.payment_failed',
              {
                order_number: order.order_number,
                customer_name: customerName,
                customer_email: order.customer_email,
                order_total: `$${totalAmount.toFixed(2)}`,
                error_message: failureReason
              },
              {
                customerEmail: order.customer_email,
                customerName: customerName,
                adminEmail: 'info@simfab.com'
              },
              orderRegion
            );
          }
        } catch (emailError) {
          console.error('Failed to trigger payment failed email event:', emailError);
        }
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
