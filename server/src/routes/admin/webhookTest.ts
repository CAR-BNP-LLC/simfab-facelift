import { Router } from 'express';
import { Pool } from 'pg';
import { WebhookTestController } from '../../controllers/webhookTestController';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { adminRateLimiter } from '../../middleware/rateLimiter';

export const createWebhookTestRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new WebhookTestController(pool);

  // Apply admin authentication and rate limiting
  router.use(requireAuth, requireAdmin, adminRateLimiter);

  /**
   * @route   POST /api/admin/webhook-test/signature
   * @desc    Test webhook signature verification
   * @access  Admin
   */
  router.post('/signature', controller.testWebhookSignature);

  /**
   * @route   POST /api/admin/webhook-test/simulate
   * @desc    Simulate webhook events for testing
   * @access  Admin
   */
  router.post('/simulate', controller.simulateWebhookEvent);

  /**
   * @route   GET /api/admin/webhook-test/history
   * @desc    Get webhook event history
   * @access  Admin
   */
  router.get('/history', controller.getWebhookHistory);

  /**
   * @route   POST /api/admin/webhook-test/payment-flow
   * @desc    Test complete payment flow for an order
   * @access  Admin
   */
  router.post('/payment-flow', controller.testPaymentFlow);

  return router;
};
