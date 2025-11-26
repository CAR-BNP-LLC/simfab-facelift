/**
 * Payment Validation Service
 * Comprehensive validation for payment operations
 */

import { Pool } from 'pg';
import { PaymentError } from '../utils/errors';

export interface PaymentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  data?: any;
}

export interface PaymentContext {
  orderId: number;
  amount: number;
  currency: string;
  paymentId?: string;
  payerId?: string;
}

export class PaymentValidationService {
  constructor(private pool: Pool) {}

  /**
   * Validate payment creation request
   */
  async validatePaymentCreation(context: PaymentContext): Promise<PaymentValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate order exists and is in correct state
      const orderValidation = await this.validateOrderForPayment(context.orderId);
      if (!orderValidation.valid) {
        errors.push(...orderValidation.errors);
      }

      // Validate amount matches order total
      const amountValidation = await this.validatePaymentAmount(context.orderId, context.amount);
      if (!amountValidation.valid) {
        errors.push(...amountValidation.errors);
      }

      // Check for existing payments
      const existingPaymentCheck = await this.checkExistingPayments(context.orderId);
      if (existingPaymentCheck.hasExisting) {
        if (existingPaymentCheck.isCompleted) {
          errors.push('Order already has a completed payment');
        } else {
          warnings.push('Order already has a pending payment');
        }
      }

      // Validate currency
      if (!this.isValidCurrency(context.currency)) {
        errors.push('Invalid currency code');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        data: {
          orderValidation,
          amountValidation,
          existingPaymentCheck
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      return {
        valid: false,
        errors: [`Validation error: ${errorMessage}`],
        warnings: []
      };
    }
  }

  /**
   * Validate payment execution request
   */
  async validatePaymentExecution(context: PaymentContext): Promise<PaymentValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (!context.paymentId || !context.payerId) {
        errors.push('Payment ID and Payer ID are required for execution');
        return { valid: false, errors, warnings };
      }

      // Validate payment exists and is in correct state
      const paymentValidation = await this.validatePaymentForExecution(context.paymentId, context.orderId);
      if (!paymentValidation.valid) {
        errors.push(...paymentValidation.errors);
      }

      // Validate order state
      const orderValidation = await this.validateOrderForExecution(context.orderId);
      if (!orderValidation.valid) {
        errors.push(...orderValidation.errors);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        data: {
          paymentValidation,
          orderValidation
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      return {
        valid: false,
        errors: [`Validation error: ${errorMessage}`],
        warnings: []
      };
    }
  }

  /**
   * Validate order exists and is in correct state for payment
   */
  private async validateOrderForPayment(orderId: number): Promise<PaymentValidationResult> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        `SELECT id, payment_status, status, total_amount, payment_expires_at, created_at
         FROM orders 
         WHERE id = $1`,
        [orderId]
      );

      if (result.rows.length === 0) {
        return {
          valid: false,
          errors: ['Order not found'],
          warnings: []
        };
      }

      const order = result.rows[0];
      const errors: string[] = [];
      const warnings: string[] = [];

      // Check if order is expired
      if (order.payment_expires_at && new Date(order.payment_expires_at) < new Date()) {
        errors.push('Order has expired');
      }

      // Check if order is already paid
      if (order.payment_status === 'paid') {
        errors.push('Order is already paid');
      }

      // Check if order is cancelled
      if (order.status === 'cancelled') {
        errors.push('Order has been cancelled');
      }

      // Check if order is too old (more than 24 hours)
      const orderAge = Date.now() - new Date(order.created_at).getTime();
      if (orderAge > 24 * 60 * 60 * 1000) {
        warnings.push('Order is older than 24 hours');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        data: order
      };
    } finally {
      client.release();
    }
  }

  /**
   * Validate payment amount matches order total
   */
  private async validatePaymentAmount(orderId: number, amount: number): Promise<PaymentValidationResult> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        'SELECT total_amount FROM orders WHERE id = $1',
        [orderId]
      );

      if (result.rows.length === 0) {
        return {
          valid: false,
          errors: ['Order not found'],
          warnings: []
        };
      }

      const orderTotal = parseFloat(result.rows[0].total_amount);
      const paymentAmount = parseFloat(amount.toString());
      const difference = Math.abs(orderTotal - paymentAmount);

      if (difference > 0.01) { // Allow for small rounding differences
        return {
          valid: false,
          errors: [`Payment amount (${paymentAmount}) does not match order total (${orderTotal})`],
          warnings: []
        };
      }

      return {
        valid: true,
        errors: [],
        warnings: [],
        data: { orderTotal, paymentAmount }
      };
    } finally {
      client.release();
    }
  }

  /**
   * Check for existing payments on the order
   */
  private async checkExistingPayments(orderId: number): Promise<{
    hasExisting: boolean;
    isCompleted: boolean;
    paymentCount: number;
    latestPayment?: any;
  }> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        `SELECT status, transaction_id, created_at
         FROM payments 
         WHERE order_id = $1 
         ORDER BY created_at DESC`,
        [orderId]
      );

      const payments = result.rows;
      const hasExisting = payments.length > 0;
      const isCompleted = payments.some(p => p.status === 'completed');
      const latestPayment = payments[0];

      return {
        hasExisting,
        isCompleted,
        paymentCount: payments.length,
        latestPayment
      };
    } finally {
      client.release();
    }
  }

  /**
   * Validate payment exists and is in correct state for execution
   */
  private async validatePaymentForExecution(paymentId: string, orderId: number): Promise<PaymentValidationResult> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        `SELECT p.*, o.payment_status, o.status as order_status
         FROM payments p 
         JOIN orders o ON p.order_id = o.id 
         WHERE p.transaction_id = $1 AND p.order_id = $2`,
        [paymentId, orderId]
      );

      if (result.rows.length === 0) {
        return {
          valid: false,
          errors: ['Payment not found for this order'],
          warnings: []
        };
      }

      const payment = result.rows[0];
      const errors: string[] = [];
      const warnings: string[] = [];

      // Check payment status
      if (payment.status === 'completed') {
        errors.push('Payment has already been completed');
      } else if (payment.status === 'failed') {
        errors.push('Payment has already failed');
      } else if (payment.status === 'cancelled') {
        errors.push('Payment has been cancelled');
      } else if (!['pending', 'processing'].includes(payment.status)) {
        errors.push(`Payment is in invalid state: ${payment.status}`);
      }

      // Check if payment is too old (more than 1 hour)
      const paymentAge = Date.now() - new Date(payment.created_at).getTime();
      if (paymentAge > 60 * 60 * 1000) {
        warnings.push('Payment is older than 1 hour');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        data: payment
      };
    } finally {
      client.release();
    }
  }

  /**
   * Validate order is in correct state for payment execution
   */
  private async validateOrderForExecution(orderId: number): Promise<PaymentValidationResult> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        `SELECT payment_status, status, payment_expires_at
         FROM orders 
         WHERE id = $1`,
        [orderId]
      );

      if (result.rows.length === 0) {
        return {
          valid: false,
          errors: ['Order not found'],
          warnings: []
        };
      }

      const order = result.rows[0];
      const errors: string[] = [];
      const warnings: string[] = [];

      // Check order status
      if (order.status !== 'pending') {
        errors.push(`Order is not in pending state: ${order.status}`);
      }

      // Check payment status
      if (order.payment_status === 'paid') {
        errors.push('Order is already paid');
      }

      // Check if order is expired
      if (order.payment_expires_at && new Date(order.payment_expires_at) < new Date()) {
        errors.push('Order has expired');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        data: order
      };
    } finally {
      client.release();
    }
  }

  /**
   * Validate currency code
   */
  private isValidCurrency(currency: string): boolean {
    const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY'];
    return validCurrencies.includes(currency.toUpperCase());
  }

  /**
   * Get payment security statistics
   */
  async getPaymentSecurityStats(): Promise<{
    totalPayments: number;
    pendingPayments: number;
    completedPayments: number;
    failedPayments: number;
    duplicateAttempts: number;
    expiredOrders: number;
  }> {
    const client = await this.pool.connect();
    
    try {
      const [
        totalResult,
        pendingResult,
        completedResult,
        failedResult,
        expiredResult
      ] = await Promise.all([
        client.query('SELECT COUNT(*)::int as count FROM payments'),
        client.query("SELECT COUNT(*)::int as count FROM payments WHERE status = 'pending'"),
        client.query("SELECT COUNT(*)::int as count FROM payments WHERE status = 'completed'"),
        client.query("SELECT COUNT(*)::int as count FROM payments WHERE status = 'failed'"),
        client.query(`
          SELECT COUNT(*)::int as count 
          FROM orders 
          WHERE payment_expires_at < NOW() 
          AND payment_status = 'pending'
        `)
      ]);

      return {
        totalPayments: totalResult.rows[0].count,
        pendingPayments: pendingResult.rows[0].count,
        completedPayments: completedResult.rows[0].count,
        failedPayments: failedResult.rows[0].count,
        duplicateAttempts: 0, // This would need to be tracked separately
        expiredOrders: expiredResult.rows[0].count
      };
    } finally {
      client.release();
    }
  }
}
