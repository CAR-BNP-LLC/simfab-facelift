/**
 * Email Service Types
 * Type definitions for the email service system
 */

export interface EmailTemplate {
  id: number;
  type: string;
  name: string;
  description: string;
  subject: string;
  html_body: string;
  text_body?: string;
  default_recipients: string[];
  recipient_type: 'admin' | 'customer' | 'both';
  is_active: boolean;
  header_image?: string;
  header_title?: string;
  created_at: Date;
  updated_at: Date;
  created_by?: number;
  updated_by?: number;
}

export interface EmailLog {
  id: number;
  template_type: string;
  recipient_email: string;
  recipient_name?: string;
  subject?: string;
  status: 'sent' | 'failed' | 'pending' | 'queued';
  error_message?: string;
  metadata: Record<string, any>;
  sent_at?: Date;
  delivered_at?: Date;
  opened_at?: Date;
  clicked_at?: Date;
  created_at: Date;
}

export interface EmailLogInput {
  template_type: string;
  recipient_email: string;
  recipient_name?: string;
  subject?: string;
  status: 'sent' | 'failed' | 'pending' | 'queued';
  error_message?: string;
  metadata?: Record<string, any>;
}

export interface EmailQueue {
  id: number;
  template_type: string;
  recipient_email: string;
  recipient_name?: string;
  variables: Record<string, any>;
  priority: number;
  attempts: number;
  max_attempts: number;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  scheduled_for: Date;
  error_message?: string;
  created_at: Date;
  processed_at?: Date;
}

export interface EmailSettings {
  id?: number;
  smtp_host?: string;
  smtp_port: number;
  smtp_user?: string;
  smtp_password?: string;
  smtp_from_email: string;
  smtp_from_name: string;
  test_mode: boolean;
  test_email?: string;
  enabled: boolean;
  daily_limit: number;
  rate_limit_per_minute: number;
  updated_by?: number;
  updated_at: Date;
}

export interface SendEmailOptions {
  templateType: string;
  recipientEmail: string;
  recipientName?: string;
  variables: Record<string, any>;
  adminCopy?: boolean;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  logId?: number;
}

