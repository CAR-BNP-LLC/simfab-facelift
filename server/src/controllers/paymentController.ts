import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { PaymentService } from '../services/PaymentService';
import { successResponse, errorResponse } from '../utils/response';
import { ValidationError } from '../utils/errors';

export class PaymentController {
  private paymentService: PaymentService;

  constructor(pool: Pool) {
    this.paymentService = new PaymentService(pool);
  }

  createPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId, amount, currency, returnUrl, cancelUrl } = req.body;

      // CRITICAL: Comprehensive input validation
      if (!orderId || !amount || !currency) {
        throw new ValidationError('Missing required payment data: orderId, amount, and currency are required');
      }

      // Validate orderId is a positive integer
      if (!Number.isInteger(Number(orderId)) || Number(orderId) <= 0) {
        throw new ValidationError('Invalid orderId: must be a positive integer');
      }

      // Validate amount is a positive number
      if (isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new ValidationError('Invalid amount: must be a positive number');
      }

      // Validate currency format
      if (typeof currency !== 'string' || currency.length !== 3) {
        throw new ValidationError('Invalid currency: must be a 3-character currency code (e.g., USD)');
      }

      // Validate URLs if provided
      if (returnUrl && !this.isValidUrl(returnUrl)) {
        throw new ValidationError('Invalid returnUrl: must be a valid URL');
      }

      if (cancelUrl && !this.isValidUrl(cancelUrl)) {
        throw new ValidationError('Invalid cancelUrl: must be a valid URL');
      }

      const paymentData = {
        orderId: Number(orderId),
        amount: Number(amount),
        currency: currency.toUpperCase(),
        returnUrl: returnUrl || `${process.env.FRONTEND_URL}/checkout/success`,
        cancelUrl: cancelUrl || `${process.env.FRONTEND_URL}/checkout/cancel`
      };

      const result = await this.paymentService.createPayment(paymentData);

      res.status(201).json(successResponse({
        payment: result,
        message: 'Payment created successfully'
      }));
    } catch (error) {
      next(error);
    }
  };

  executePayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { paymentId, payerId, orderId } = req.body;

      // CRITICAL: Comprehensive input validation
      if (!paymentId || !payerId || !orderId) {
        throw new ValidationError('Missing required payment execution data: paymentId, payerId, and orderId are required');
      }

      // Validate paymentId format (PayPal order IDs are typically 17-19 characters)
      if (typeof paymentId !== 'string' || paymentId.length < 10 || paymentId.length > 50) {
        throw new ValidationError('Invalid paymentId: must be a valid PayPal payment ID');
      }

      // Validate payerId format
      if (typeof payerId !== 'string' || payerId.length < 5 || payerId.length > 50) {
        throw new ValidationError('Invalid payerId: must be a valid PayPal payer ID');
      }

      // Validate orderId is a positive integer
      if (!Number.isInteger(Number(orderId)) || Number(orderId) <= 0) {
        throw new ValidationError('Invalid orderId: must be a positive integer');
      }

      const result = await this.paymentService.executePayment(paymentId, payerId, Number(orderId));

      res.json(successResponse({
        payment: result,
        message: 'Payment executed successfully'
      }));
    } catch (error) {
      next(error);
    }
  };

  getPaymentStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { paymentId } = req.params;
      
      // CRITICAL: Validate paymentId format
      if (!paymentId || typeof paymentId !== 'string' || paymentId.length < 10 || paymentId.length > 50) {
        throw new ValidationError('Invalid paymentId: must be a valid PayPal payment ID');
      }
      
      const payment = await this.paymentService.getPaymentStatus(paymentId);

      res.json(successResponse({
        payment
      }));
    } catch (error) {
      next(error);
    }
  };

  // Helper method to validate URLs
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
