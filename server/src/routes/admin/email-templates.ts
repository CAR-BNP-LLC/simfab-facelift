/**
 * Email Templates Routes
 * Admin routes for managing email templates
 */

import { Router } from 'express';
import { AdminEmailController } from '../../controllers/adminEmailController';
import { isAuthenticated } from '../../middleware/auth';
import { Pool } from 'pg';

export function createEmailTemplateRoutes(pool: Pool): Router {
  const router = Router();
  const controller = new AdminEmailController(pool);

  // Get all email templates
  router.get(
    '/email-templates',
    controller.getTemplates.bind(controller)
  );

  // Get single template by type
  router.get(
    '/email-templates/:type',
    controller.getTemplate.bind(controller)
  );

  // Update email template
  router.put(
    '/email-templates/:type',
    controller.updateTemplate.bind(controller)
  );

  // Send test email
  router.post(
    '/email-templates/:type/test',
    controller.sendTestEmail.bind(controller)
  );

  // Get email logs
  router.get(
    '/email-logs',
    controller.getEmailLogs.bind(controller)
  );

  // Get email statistics
  router.get(
    '/email-stats',
    controller.getEmailStats.bind(controller)
  );

  return router;
}

