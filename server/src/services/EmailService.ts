/**
 * Email Service
 * Handles email template rendering and sending
 */

import { Pool } from 'pg';
import nodemailer from 'nodemailer';
import { EmailTemplate, EmailLogInput, EmailSettings, EmailResult, SendEmailOptions } from '../types/email';
import { EmailTemplateEngine } from '../utils/EmailTemplateEngine';
import { EmailTemplateWrapper } from '../utils/EmailTemplateWrapper';
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
    
    // Debug: Log environment variables (without passwords)
    console.log('📧 Email Service Debug:', {
      SMTP_HOST: process.env.SMTP_HOST ? '✓ Set' : '✗ Missing',
      SMTP_USER: process.env.SMTP_USER ? '✓ Set' : '✗ Missing',
      SMTP_PASS: process.env.SMTP_PASS ? '✓ Set' : '✗ Missing',
      EMAIL_TEST_MODE: process.env.EMAIL_TEST_MODE,
      test_mode: settings.test_mode,
      has_host: !!settings.smtp_host,
      has_user: !!settings.smtp_user,
      has_pass: !!settings.smtp_password
    });
    
    if (!settings.enabled) {
      console.log('📧 Email service is disabled');
      return;
    }

    // Check if we should use test mode or production
    const shouldUseTestMode = settings.test_mode === true || !settings.smtp_host || !settings.smtp_user || !settings.smtp_password;
    
    if (shouldUseTestMode) {
      console.log('📧 Email service initialized in TEST MODE');
      if (!settings.smtp_host) {
        console.log('   ❌ SMTP_HOST not found in environment variables');
      }
      if (!settings.smtp_user) {
        console.log('   ❌ SMTP_USER not found in environment variables');
      }
      if (!settings.smtp_password) {
        console.log('   ❌ SMTP_PASS not found in environment variables');
      }
      if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_password) {
        console.log('   💡 Add SMTP_HOST, SMTP_USER, and SMTP_PASS to docker-compose.yml or .env file');
      }
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true
      });
    } else {
      // Production SMTP from environment variables
      if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_password) {
        console.warn('⚠️  SMTP credentials missing. Using test mode.');
        console.warn('   Required: EMAIL_SMTP_HOST, EMAIL_SMTP_USER, EMAIL_SMTP_PASSWORD');
        this.transporter = nodemailer.createTransport({
          streamTransport: true,
          newline: 'unix',
          buffer: true
        });
        return;
      }
      
      this.transporter = nodemailer.createTransport({
        host: settings.smtp_host,
        port: settings.smtp_port || 587,
        secure: settings.smtp_port === 465, // true for 465 (SSL), false for 587 (TLS)
        auth: {
          user: settings.smtp_user,
          pass: settings.smtp_password
        },
        // Additional options for better compatibility
        tls: {
          rejectUnauthorized: false // For self-signed certificates (development only)
        }
      });
      console.log('📧 Email service initialized for production');
      console.log(`   SMTP: ${settings.smtp_host}:${settings.smtp_port}`);
      console.log(`   From: ${settings.smtp_from_name} <${settings.smtp_from_email}>`);
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
      let htmlBody = this.templateEngine.replaceVariables(template.html_body, options.variables);
      
      // Wrap content in styled template with logo and branding
      htmlBody = EmailTemplateWrapper.wrap(
        htmlBody,
        template.header_title,
        template.header_image
      );
      
      const textBody = template.text_body 
        ? this.templateEngine.replaceVariables(template.text_body, options.variables)
        : null;

      // Get email settings
      const settings = await this.getEmailSettings();

      // Determine actual recipient
      // In test mode, redirect to test email if configured
      // Otherwise, use the actual recipient
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
      const hasSMTPConfig = settings.smtp_host && settings.smtp_user && settings.smtp_password;
      const isProductionMode = !settings.test_mode && hasSMTPConfig;
      
      // Debug logging
      console.log('📧 Email send debug:', {
        test_mode: settings.test_mode,
        hasSMTPConfig,
        isProductionMode,
        hasTransporter: !!this.transporter,
        smtp_host: settings.smtp_host ? 'Set' : 'Missing',
        smtp_user: settings.smtp_user ? 'Set' : 'Missing',
        smtp_password: settings.smtp_password ? 'Set' : 'Missing'
      });
      
      // Ensure transporter is initialized if needed
      if (isProductionMode && !this.transporter) {
        console.log('📧 Initializing transporter for email send...');
        await this.initialize();
      }
      
      // Re-check after initialization
      if (isProductionMode && this.transporter) {
        // Send actual email in production mode

        const mailOptions: any = {
          from: `${settings.smtp_from_name} <${settings.smtp_from_email}>`,
          to: actualRecipient,
          subject,
          html: htmlBody,
        };
        
        if (textBody) {
          mailOptions.text = textBody;
        }

        try {
          console.log(`📧 Sending email via SMTP to: ${actualRecipient}`);
          const info: any = await this.transporter!.sendMail(mailOptions);
          
          console.log(`✅ Email sent successfully! Message ID: ${info?.messageId}`);
          
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
        } catch (error: any) {
          console.error('❌ Error sending email:', error);
          console.error('Error details:', {
            code: error.code,
            command: error.command,
            response: error.response,
            responseCode: error.responseCode
          });
          
          result = {
            success: false,
            error: error.message || 'Failed to send email',
            logId
          };

          // Update log with error
          await client.query(
            'UPDATE email_logs SET status = $1, error_message = $2 WHERE id = $3',
            ['failed', error.message || 'Failed to send email', logId]
          );
        }
      } else {
        // Test mode or no SMTP configured - log to console
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
   * Priority: Environment variables > Database settings > Defaults
   */
  private async getEmailSettings(): Promise<EmailSettings> {
    // Check for environment variables first (production mode)
    // Support both EMAIL_SMTP_* and SMTP_* variable names
    const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_SMTP_HOST;
    const useEnv = process.env.EMAIL_USE_ENV === 'true' || smtpHost;
    
    if (useEnv) {
      // Use environment variables (more secure)
      // Support both naming conventions: SMTP_* and EMAIL_SMTP_*
      return {
        test_mode: !(process.env.EMAIL_TEST_MODE === 'false' || process.env.EMAIL_TEST_MODE === '0'),
        enabled: process.env.EMAIL_ENABLED !== 'false',
        smtp_host: smtpHost,
        smtp_port: parseInt(
          process.env.SMTP_PORT || process.env.EMAIL_SMTP_PORT || '587', 
          10
        ),
        smtp_user: process.env.SMTP_USER || process.env.EMAIL_SMTP_USER,
        smtp_password: process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.EMAIL_SMTP_PASSWORD,
        smtp_from_email: process.env.EMAIL_FROM_EMAIL || 'noreply@simfab.com',
        smtp_from_name: process.env.EMAIL_FROM_NAME || 'SimFab',
        test_email: process.env.EMAIL_TEST_EMAIL,
        daily_limit: parseInt(process.env.EMAIL_DAILY_LIMIT || '1000', 10),
        rate_limit_per_minute: parseInt(process.env.EMAIL_RATE_LIMIT || '10', 10),
        updated_at: new Date()
      };
    }
    
    // Fall back to database settings (for test mode or legacy)
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

