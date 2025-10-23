import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { WebhookService } from '../services/WebhookService';
import { successResponse, errorResponse } from '../utils/response';

export class WebhookController {
  private webhookService: WebhookService;

  constructor(pool: Pool) {
    this.webhookService = new WebhookService(pool);
  }

  handlePayPalWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = JSON.stringify(req.body);
      const headers = req.headers;
      const webhookId = process.env.PAYPAL_WEBHOOK_ID;

      if (!webhookId) {
        return res.status(500).json(errorResponse('Webhook ID not configured'));
      }

      // Verify webhook signature
      const isValid = await this.webhookService.verifyWebhookSignature(
        headers,
        body,
        webhookId
      );

      if (!isValid) {
        console.error('Invalid webhook signature');
        return res.status(400).json(errorResponse('Invalid webhook signature'));
      }

      // Process webhook event
      await this.webhookService.handleWebhookEvent(req.body);

      res.status(200).json(successResponse({
        message: 'Webhook processed successfully'
      }));
    } catch (error) {
      console.error('Webhook processing failed:', error);
      next(error);
    }
  };
}
