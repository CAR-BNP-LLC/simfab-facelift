/**
 * Email Templates Routes
 * Admin routes for managing email templates
 */

import { Router } from 'express';
import { AdminEmailController } from '../../controllers/adminEmailController';
import { requireAuthority } from '../../middleware/auth';
import { adminRateLimiter } from '../../middleware/rateLimiter';
import { Pool } from 'pg';

export function createEmailTemplateRoutes(pool: Pool): Router {
  const router = Router();
  const controller = new AdminEmailController(pool);

  // Apply rate limiting to all admin routes
  router.use(adminRateLimiter);

  /**
   * @route   GET /api/admin/email-templates
   * @desc    Get all email templates
   * @access  Admin with emails:view authority
   */
  router.get(
    '/email-templates',
    requireAuthority('emails:view'),
    controller.getTemplates.bind(controller)
  );

  /**
   * @route   POST /api/admin/email-templates
   * @desc    Create new email template
   * @access  Admin with emails:manage authority
   */
  router.post(
    '/email-templates',
    requireAuthority('emails:manage'),
    controller.createTemplate.bind(controller)
  );

  /**
   * @route   GET /api/admin/email-templates/:type
   * @desc    Get single template by type
   * @access  Admin with emails:view authority
   */
  router.get(
    '/email-templates/:type',
    requireAuthority('emails:view'),
    controller.getTemplate.bind(controller)
  );

  /**
   * @route   PUT /api/admin/email-templates/:type
   * @desc    Update email template
   * @access  Admin with emails:manage authority
   */
  router.put(
    '/email-templates/:type',
    requireAuthority('emails:manage'),
    controller.updateTemplate.bind(controller)
  );

  /**
   * @route   POST /api/admin/email-templates/:type/test
   * @desc    Send test email
   * @access  Admin with emails:manage authority
   */
  router.post(
    '/email-templates/:type/test',
    requireAuthority('emails:manage'),
    controller.sendTestEmail.bind(controller)
  );

  /**
   * @route   GET /api/admin/email-logs
   * @desc    Get email logs
   * @access  Admin with emails:view authority
   */
  router.get(
    '/email-logs',
    requireAuthority('emails:view'),
    controller.getEmailLogs.bind(controller)
  );

  /**
   * @route   GET /api/admin/email-stats
   * @desc    Get email statistics
   * @access  Admin with emails:view authority
   */
  router.get(
    '/email-stats',
    requireAuthority('emails:view'),
    controller.getEmailStats.bind(controller)
  );

  return router;
}

