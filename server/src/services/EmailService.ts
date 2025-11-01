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

    // Determine if we should use test mode or production
    // Only use test mode if:
    // 1. Explicitly set to test_mode = true, OR
    // 2. SMTP credentials are missing
    const hasSMTPCredentials = settings.smtp_host && settings.smtp_user && settings.smtp_password;
    const shouldUseTestMode = settings.test_mode === true || !hasSMTPCredentials;
    
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
      if (!hasSMTPCredentials) {
        console.log('   💡 Add SMTP_HOST, SMTP_USER, and SMTP_PASS to docker-compose.yml or .env file');
        console.log('   💡 Set EMAIL_TEST_MODE=false when credentials are configured');
      }
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true
      });
    } else {
      // Production SMTP - credentials are verified to exist
      this.transporter = nodemailer.createTransport({
        host: settings.smtp_host!,
        port: settings.smtp_port || 587,
        secure: settings.smtp_port === 465, // true for 465 (SSL), false for 587 (TLS)
        auth: {
          user: settings.smtp_user!,
          pass: settings.smtp_password!
        },
        // Additional options for better compatibility
        tls: {
          rejectUnauthorized: false // For self-signed certificates (development only)
        }
      });
      console.log('✅ Email service initialized for PRODUCTION');
      console.log(`   SMTP: ${settings.smtp_host}:${settings.smtp_port}`);
      console.log(`   From: ${settings.smtp_from_name} <${settings.smtp_from_email}>`);
      console.log(`   Test Mode: ${settings.test_mode}`);
    }
  }

  /**
   * Send email using template
   */
  async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    console.log(`📧 [DEBUG] sendEmail called:`, {
      templateType: options.templateType,
      recipientEmail: options.recipientEmail,
      recipientName: options.recipientName,
      hasVariables: !!options.variables,
      variableKeys: options.variables ? Object.keys(options.variables) : []
    });

    const client = await this.pool.connect();
    
    try {
      // Get template
      const template = await this.getTemplate(options.templateType);
      
      if (!template) {
        console.error(`❌ [DEBUG] Template not found: ${options.templateType}`);
        throw new NotFoundError(`Template not found: ${options.templateType}`);
      }

      console.log(`📧 [DEBUG] Template found:`, {
        id: template.id,
        type: template.type,
        is_active: template.is_active,
        recipient_type: template.recipient_type
      });

      if (!template.is_active) {
        console.log(`📧 [DEBUG] Template ${options.templateType} is inactive, skipping email`);
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
      // Production mode = test_mode is explicitly false AND SMTP credentials exist
      const hasSMTPConfig = settings.smtp_host && settings.smtp_user && settings.smtp_password;
      const isProductionMode = settings.test_mode === false && hasSMTPConfig;
      
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
      
      // Ensure transporter is properly initialized for production
      if (isProductionMode) {
        if (!this.transporter) {
          console.log('📧 Re-initializing transporter for production email send...');
          await this.initialize();
        }
        
        if (!this.transporter) {
          console.error('❌ Failed to initialize transporter for production');
          result = {
            success: false,
            error: 'Email transporter not initialized',
            logId
          };
          await client.query(
            'UPDATE email_logs SET status = $1, error_message = $2 WHERE id = $3',
            ['failed', 'Email transporter not initialized', logId]
          );
          client.release();
          return result;
        }
        
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
          console.log(`📧 [DEBUG] Sending email via SMTP:`, {
            to: actualRecipient,
            from: mailOptions.from,
            subject: mailOptions.subject,
            hasHtml: !!mailOptions.html,
            hasText: !!mailOptions.text,
            template: options.templateType
          });

          const info: any = await this.transporter!.sendMail(mailOptions);
          
          console.log(`✅ [DEBUG] Email sent successfully!`, {
            messageId: info?.messageId,
            response: info?.response,
            accepted: info?.accepted,
            rejected: info?.rejected
          });
          
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
          console.error('❌ [DEBUG] Error sending email:', error);
          console.error('❌ [DEBUG] Error details:', {
            code: error.code,
            command: error.command,
            response: error.response,
            responseCode: error.responseCode,
            message: error.message,
            stack: error.stack,
            to: actualRecipient,
            from: mailOptions.from,
            subject: mailOptions.subject
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
        test_mode: (() => {
          // Intelligent test mode detection:
          // - Explicitly false if EMAIL_TEST_MODE='false' or '0'
          // - Explicitly true if EMAIL_TEST_MODE='true' or '1'
          // - Auto-detect: If SMTP credentials are provided, default to FALSE (production)
          // - Only default to TRUE (test) if SMTP credentials are missing
          const explicitTestMode = process.env.EMAIL_TEST_MODE;
          const smtpUser = process.env.SMTP_USER || process.env.EMAIL_SMTP_USER;
          const smtpPassword = process.env.SMTP_PASS || process.env.EMAIL_SMTP_PASSWORD || process.env.EMAIL_SMTP_PASSWORD;
          
          if (explicitTestMode === 'false' || explicitTestMode === '0') {
            return false;
          } else if (explicitTestMode === 'true' || explicitTestMode === '1') {
            return true;
          } else {
            // Auto-detect: If SMTP credentials are provided, use production mode
            // Otherwise default to test mode
            return !(smtpHost && smtpUser && smtpPassword);
          }
        })(),
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

  /**
   * Trigger emails based on event
   * Automatically finds and sends all active templates registered for the given event
   * 
   * @param event - The trigger event (e.g., 'order.created', 'order.processing')
   * @param variables - Template variables to use
   * @param recipientInfo - Information about recipients (customer email, admin email, etc.)
   */
  async triggerEvent(
    event: string,
    variables: Record<string, any>,
    recipientInfo: {
      customerEmail?: string;
      customerName?: string;
      adminEmail?: string;
    }
  ): Promise<EmailResult[]> {
    const results: EmailResult[] = [];
    
    console.log(`📧 [DEBUG] triggerEvent called:`, {
      event,
      recipientInfo,
      variableKeys: Object.keys(variables),
      hasCustomerEmail: !!recipientInfo.customerEmail,
      hasAdminEmail: !!recipientInfo.adminEmail
    });
    
    try {
      // Get all active templates for this trigger event
      const templatesResult = await this.pool.query(
        `SELECT * FROM email_templates 
         WHERE trigger_event = $1 AND is_active = true 
         ORDER BY id`,
        [event]
      );

      const templates = templatesResult.rows;

      console.log(`📧 [DEBUG] Query result for event '${event}':`, {
        rowCount: templates.length,
        templates: templates.map(t => ({
          id: t.id,
          type: t.type,
          recipient_type: t.recipient_type,
          is_active: t.is_active
        }))
      });

      if (templates.length === 0) {
        console.log(`📧 [DEBUG] No active templates found for trigger event: ${event}`);
        return results;
      }

      console.log(`📧 [DEBUG] Triggering event '${event}': Found ${templates.length} active template(s)`);

      // Send email for each matching template
      for (const template of templates) {
        console.log(`📧 [DEBUG] Processing template:`, {
          id: template.id,
          type: template.type,
          recipient_type: template.recipient_type,
          custom_recipient_email: template.custom_recipient_email || 'none'
        });

        try {
          // Determine recipients based on recipient_type
          const recipients: Array<{ email: string; name?: string }> = [];

          if (template.recipient_type === 'admin') {
            // Admin recipients
            if (template.custom_recipient_email) {
              recipients.push({ email: template.custom_recipient_email, name: 'SimFab Admin' });
            } else if (template.default_recipients && template.default_recipients.length > 0) {
              template.default_recipients.forEach((email: string) => {
                recipients.push({ email, name: 'SimFab Admin' });
              });
            } else {
              // Default admin email
              recipients.push({ email: recipientInfo.adminEmail || 'info@simfab.com', name: 'SimFab Admin' });
            }
          } else if (template.recipient_type === 'customer') {
            // Customer recipients
            if (!recipientInfo.customerEmail) {
              console.warn(`📧 Skipping template ${template.type}: No customer email provided`);
              continue;
            }
            recipients.push({
              email: recipientInfo.customerEmail,
              name: recipientInfo.customerName || recipientInfo.customerEmail
            });
          } else if (template.recipient_type === 'both') {
            // Both admin and customer
            if (recipientInfo.customerEmail) {
              recipients.push({
                email: recipientInfo.customerEmail,
                name: recipientInfo.customerName || recipientInfo.customerEmail
              });
            }
            
            // Add admin recipients
            if (template.custom_recipient_email) {
              recipients.push({ email: template.custom_recipient_email, name: 'SimFab Admin' });
            } else if (template.default_recipients && template.default_recipients.length > 0) {
              template.default_recipients.forEach((email: string) => {
                recipients.push({ email, name: 'SimFab Admin' });
              });
            } else {
              recipients.push({ email: recipientInfo.adminEmail || 'info@simfab.com', name: 'SimFab Admin' });
            }
          } else if (template.recipient_type === 'custom' && template.custom_recipient_email) {
            // Custom recipient
            recipients.push({ email: template.custom_recipient_email, name: 'Recipient' });
          }

          console.log(`📧 [DEBUG] Template ${template.type} will send to ${recipients.length} recipient(s):`, 
            recipients.map(r => ({ email: r.email, name: r.name }))
          );

          // Send email to each recipient
          for (const recipient of recipients) {
            console.log(`📧 [DEBUG] Sending email for template ${template.type} to ${recipient.email}...`);
            const result = await this.sendEmail({
              templateType: template.type,
              recipientEmail: recipient.email,
              recipientName: recipient.name,
              variables
            });
            console.log(`📧 [DEBUG] Email send result for ${recipient.email}:`, {
              success: result.success,
              messageId: result.messageId,
              error: result.error,
              logId: result.logId
            });
            results.push(result);
          }
        } catch (error: any) {
          console.error(`❌ [DEBUG] Failed to send email for template ${template.type}:`, error);
          console.error(`❌ [DEBUG] Error details:`, {
            message: error.message,
            stack: error.stack,
            code: error.code
          });
          results.push({
            success: false,
            error: error.message || 'Failed to send email'
          });
        }
      }

      console.log(`📧 [DEBUG] triggerEvent completed for '${event}':`, {
        totalTemplates: templates.length,
        results: results.map(r => ({ success: r.success, error: r.error }))
      });
    } catch (error: any) {
      console.error(`❌ [DEBUG] Error triggering event ${event}:`, error);
      console.error(`❌ [DEBUG] Error stack:`, error.stack);
      results.push({
        success: false,
        error: error.message || 'Failed to trigger event'
      });
    }

    return results;
  }
}

