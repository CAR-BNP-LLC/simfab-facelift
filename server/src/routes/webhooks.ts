import { Router } from 'express';
import { Pool } from 'pg';
import { WebhookController } from '../controllers/webhookController';

export const createWebhookRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new WebhookController(pool);

  // PayPal webhook endpoint (no rate limiting for webhooks)
  router.post('/paypal', controller.handlePayPalWebhook);

  return router;
};
