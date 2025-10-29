/**
 * Admin Email Controller
 * CRUD operations for email templates
 */

import { Request, Response } from 'express';
import { Pool } from 'pg';
import { EmailService } from '../services/EmailService';
import { NotFoundError, ValidationError } from '../utils/errors';

export class AdminEmailController {
  private emailService: EmailService;

  constructor(private pool: Pool) {
    this.emailService = new EmailService(pool);
    // Initialize email service to ensure transporter is set up
    this.emailService.initialize().catch(err => {
      console.error('Failed to initialize email service in AdminEmailController:', err);
    });
  }

  /**
   * Get all email templates
   * GET /api/admin/email-templates
   */
  async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM email_templates ORDER BY type'
      );
      
      res.json(result.rows);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  }

  /**
   * Get template by type
   * GET /api/admin/email-templates/:type
   */
  async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      
      const result = await this.pool.query(
        'SELECT * FROM email_templates WHERE type = $1',
        [type]
      );
      
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Email template not found' });
        return;
      }
      
      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('Error fetching template:', error);
      res.status(500).json({ error: 'Failed to fetch template' });
    }
  }

  /**
   * Update email template
   * PUT /api/admin/email-templates/:type
   */
  async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const { subject, html_body, text_body, is_active } = req.body;
      
      // Validate
      if (!subject || !html_body) {
        res.status(400).json({ error: 'Subject and HTML body are required' });
        return;
      }
      
      const userId = (req as any).user?.id;
      
      const result = await this.pool.query(
        `UPDATE email_templates 
         SET subject = $1, html_body = $2, text_body = $3, is_active = $4, 
             updated_by = $5, updated_at = NOW()
         WHERE type = $6
         RETURNING *`,
        [subject, html_body, text_body || null, is_active !== false, userId, type]
      );
      
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Email template not found' });
        return;
      }
      
      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('Error updating template:', error);
      res.status(500).json({ error: 'Failed to update template' });
    }
  }

  /**
   * Send test email
   * POST /api/admin/email-templates/:type/test
   */
  async sendTestEmail(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const { recipientEmail } = req.body;
      
      if (!recipientEmail) {
        res.status(400).json({ error: 'Recipient email is required' });
        return;
      }
      
      const result = await this.emailService.sendEmail({
        templateType: type,
        recipientEmail: recipientEmail,
        recipientName: 'Test Recipient',
        variables: {
          order_number: 'SF-TEST-12345',
          customer_name: 'Test User',
          customer_email: 'test@example.com',
          order_total: '$199.99',
          order_date: new Date().toLocaleDateString(),
          subtotal: '$179.99',
          tax_amount: '$14.40',
          shipping_amount: '$5.60',
          discount_amount: '$0.00',
          tracking_number: '1Z999AA10123456784',
          tracking_url: 'https://example.com/track/1Z999AA10123456784',
          carrier: 'UPS',
          reset_url: 'https://simfab.com/reset-password?token=test-token',
          login_url: 'https://simfab.com/login',
          note: 'This is a test note from the admin.'
        }
      });
      
      res.json(result);
    } catch (error: any) {
      console.error('Error sending test email:', error);
      res.status(500).json({ error: 'Failed to send test email', details: error.message });
    }
  }

  /**
   * Get email logs
   * GET /api/admin/email-logs
   */
  async getEmailLogs(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 100, offset = 0, status, template_type } = req.query;
      
      let query = 'SELECT * FROM email_logs WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;
      
      if (status) {
        query += ` AND status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }
      
      if (template_type) {
        query += ` AND template_type = $${paramCount}`;
        params.push(template_type);
        paramCount++;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(parseInt(limit as string), parseInt(offset as string));
      
      const result = await this.pool.query(query, params);
      
      res.json(result.rows);
    } catch (error: any) {
      console.error('Error fetching email logs:', error);
      res.status(500).json({ error: 'Failed to fetch email logs' });
    }
  }

  /**
   * Get email statistics
   * GET /api/admin/email-stats
   */
  async getEmailStats(req: Request, res: Response): Promise<void> {
    try {
      // Get total emails sent today
      const todayResult = await this.pool.query(
        `SELECT COUNT(*) as count FROM email_logs 
         WHERE DATE(created_at) = CURRENT_DATE`
      );
      
      // Get total emails sent this week
      const weekResult = await this.pool.query(
        `SELECT COUNT(*) as count FROM email_logs 
         WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`
      );
      
      // Get emails by status
      const statusResult = await this.pool.query(
        `SELECT status, COUNT(*) as count 
         FROM email_logs 
         GROUP BY status`
      );
      
      // Get emails by template type (top 10)
      const templateResult = await this.pool.query(
        `SELECT template_type, COUNT(*) as count 
         FROM email_logs 
         GROUP BY template_type 
         ORDER BY count DESC 
         LIMIT 10`
      );
      
      res.json({
        today: parseInt(todayResult.rows[0]?.count || '0'),
        thisWeek: parseInt(weekResult.rows[0]?.count || '0'),
        byStatus: statusResult.rows,
        topTemplates: templateResult.rows
      });
    } catch (error: any) {
      console.error('Error fetching email stats:', error);
      res.status(500).json({ error: 'Failed to fetch email stats' });
    }
  }
}

