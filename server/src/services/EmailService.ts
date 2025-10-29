/**
 * Email Service
 * Handles email template rendering and sending
 */

import { Pool } from 'pg';
import nodemailer from 'nodemailer';
import { EmailTemplate, EmailLogInput, EmailSettings, EmailResult, SendEmailOptions } from '../types/email';
import { EmailTemplateEngine } from '../utils/EmailTemplateEngine';
import { NotFoundError, ValidationError } from '../utils/errors';

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private templateEngine: EmailTemplateEngine;
  
  constructor(private pool: Pool) {
    this.templateEngine = new EmailTemplateEngine();
  }

  /**
   * Initialize SMTP connection
   */
  async initialize(): Promise<void> {
    const settings = await this.getEmailSettings();
    
    if (!settings.enabled) {
      console.log('📧 Email service is disabled');
      return;
    }

    // For test mode, use console transport
    if (settings.test_mode) {
      console.log('📧 Email service initialized in TEST MODE');
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true
      });
    } else {
      // Production SMTP
      this.transporter = nodemailer.createTransport({
        host: settings.smtp_host,
        port: settings.smtp_port,
        secure: false,
        auth: {
          user: settings.smtp_user,
          pass: settings.smtp_password
        }
      });
      console.log('📧 Email service initialized for production');
    }
  }

  /**
   * Send email using template
   */
  async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    const client = await this.pool.connect();
    
    try {
      // Get template
      const template = await this.getTemplate(options.templateType);
      
      if (!template) {
        throw new NotFoundError(`Template not found: ${options.templateType}`);
      }

      if (!template.is_active) {
        console.log(`Template ${options.templateType} is inactive, skipping email`);
        return { success: false, error: 'Template is inactive' };
      }

      // Replace variables in subject and body
      const subject = this.templateEngine.replaceVariables(template.subject, options.variables);
      const htmlBody = this.templateEngine.replaceVariables(template.html_body, options.variables);
      const textBody = template.text_body 
        ? this.templateEngine.replaceVariables(template.text_body, options.variables)
        : null;

      // Get email settings
      const settings = await this.getEmailSettings();

      // Determine actual recipient (use test email in test mode)
      const actualRecipient = settings.test_mode && settings.test_email
        ? settings.test_email
        : options.recipientEmail;

      // Log email
      const logId = await this.logEmail({
        template_type: options.templateType,
        recipient_email: actualRecipient,
        recipient_name: options.recipientName,
        subject,
        status: 'pending',
        metadata: options.variables
      });

      let result: EmailResult;

      // Send email
      if (settings.test_mode) {
        // In test mode, just log to console
        console.log('📧 [TEST MODE] Email would be sent:', {
          to: actualRecipient,
          subject,
          template: options.templateType,
          variables: options.variables
        });
        
        result = {
          success: true,
          logId
        };
        
        // Update log
        await client.query(
          'UPDATE email_logs SET status = $1, sent_at = NOW() WHERE id = $2',
          ['sent', logId]
        );
      } else {
        // Send actual email
        if (!this.transporter) {
          await this.initialize();
        }

        const mailOptions: any = {
          from: `${settings.smtp_from_name} <${settings.smtp_from_email}>`,
          to: actualRecipient,
          subject,
          html: htmlBody,
        };
        
        if (textBody) {
          mailOptions.text = textBody;
        }

        const info: any = await this.transporter!.sendMail(mailOptions);
        
        result = {
          success: true,
          messageId: info?.messageId,
          logId
        };

        // Update log
        await client.query(
          'UPDATE email_logs SET status = $1, sent_at = NOW() WHERE id = $2',
          ['sent', logId]
        );
      }

      // Add admin copy if requested
      if (options.adminCopy && template.default_recipients && template.default_recipients.length > 0) {
        for (const adminEmail of template.default_recipients) {
          await this.sendEmail({
            templateType: options.templateType,
            recipientEmail: adminEmail,
            recipientName: 'SimFab Admin',
            variables: options.variables,
            adminCopy: false
          });
        }
      }

      return result;
    } catch (error: any) {
      console.error('❌ Email sending error:', error);
      
      // Log error
      await this.logEmail({
        template_type: options.templateType,
        recipient_email: options.recipientEmail,
        recipient_name: options.recipientName,
        subject: '',
        status: 'failed',
        error_message: error.message,
        metadata: options.variables
      });

      return {
        success: false,
        error: error.message
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get email template by type
   */
  private async getTemplate(type: string): Promise<EmailTemplate | null> {
    const result = await this.pool.query(
      'SELECT * FROM email_templates WHERE type = $1',
      [type]
    );
    
    return result.rows[0] || null;
  }

  /**
   * Get email settings
   */
  private async getEmailSettings(): Promise<EmailSettings> {
    const result = await this.pool.query(
      'SELECT * FROM email_settings ORDER BY id DESC LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      // Return defaults
      return {
        test_mode: true,
        enabled: true,
        smtp_from_name: 'SimFab',
        smtp_from_email: 'noreply@simfab.com',
        smtp_port: 587,
        daily_limit: 1000,
        rate_limit_per_minute: 10,
        updated_at: new Date()
      };
    }
    
    return result.rows[0];
  }

  /**
   * Log email attempt
   */
  private async logEmail(log: EmailLogInput): Promise<number> {
    const result = await this.pool.query(
      `INSERT INTO email_logs (template_type, recipient_email, recipient_name, subject, status, error_message, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        log.template_type,
        log.recipient_email,
        log.recipient_name,
        log.subject,
        log.status,
        log.error_message,
        log.metadata || {}
      ]
    );
    
    return result.rows[0].id;
  }

  /**
   * Add email to queue for async processing
   */
  async queueEmail(options: SendEmailOptions, priority: number = 0): Promise<void> {
    await this.pool.query(
      `INSERT INTO email_queue (template_type, recipient_email, recipient_name, variables, priority)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        options.templateType,
        options.recipientEmail,
        options.recipientName,
        options.variables,
        priority
      ]
    );
  }
}

