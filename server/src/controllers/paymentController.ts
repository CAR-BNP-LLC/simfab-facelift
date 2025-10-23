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

      if (!orderId || !amount || !currency) {
        throw new ValidationError('Missing required payment data');
      }

      const paymentData = {
        orderId,
        amount,
        currency,
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
      const { paymentId, payerId } = req.body;
      const orderId = req.body.orderId;

      if (!paymentId || !payerId || !orderId) {
        throw new ValidationError('Missing required payment execution data');
      }

      const result = await this.paymentService.executePayment(paymentId, payerId, orderId);

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
      
      const payment = await this.paymentService.getPaymentStatus(paymentId);

      res.json(successResponse({
        payment
      }));
    } catch (error) {
      next(error);
    }
  };
}
