import { Router } from 'express';
import { Pool } from 'pg';
import { PaymentController } from '../controllers/paymentController';
import { apiRateLimiter } from '../middleware/rateLimiter';

export const createPaymentRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new PaymentController(pool);

  // Apply rate limiting
  router.use(apiRateLimiter);

  /**
   * @route   GET /api/payments/config/:region
   * @desc    Get PayPal configuration for region
   * @access  Public
   */
  router.get('/config/:region', controller.getPaymentConfig);

  /**
   * @route   POST /api/payments/create
   * @desc    Create PayPal payment
   * @access  Public (with order validation)
   */
  router.post('/create', controller.createPayment);

  /**
   * @route   POST /api/payments/execute
   * @desc    Execute PayPal payment
   * @access  Public (with validation)
   */
  router.post('/execute', controller.executePayment);

  /**
   * @route   GET /api/payments/:paymentId
   * @desc    Get payment status
   * @access  Public
   */
  router.get('/:paymentId', controller.getPaymentStatus);

  return router;
};
