-- Create email service tables for template management and logging
-- Comprehensive email service for order notifications and customer communications

-- Email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  type VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  subject VARCHAR(500) NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  default_recipients TEXT[],
  recipient_type VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  CONSTRAINT email_templates_recipient_type_check CHECK (
    recipient_type IN ('admin', 'customer', 'both')
  )
);

-- Email logs for tracking and debugging
CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  template_type VARCHAR(100) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  subject VARCHAR(500),
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT email_logs_status_check CHECK (
    status IN ('sent', 'failed', 'pending', 'queued')
  )
);

-- Email queue for async processing
CREATE TABLE IF NOT EXISTS email_queue (
  id SERIAL PRIMARY KEY,
  template_type VARCHAR(100) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  variables JSONB NOT NULL,
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  status VARCHAR(50) DEFAULT 'pending',
  scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  CONSTRAINT email_queue_status_check CHECK (
    status IN ('pending', 'processing', 'sent', 'failed')
  )
);

-- System email settings
CREATE TABLE IF NOT EXISTS email_settings (
  id SERIAL PRIMARY KEY,
  smtp_host VARCHAR(255),
  smtp_port INTEGER DEFAULT 587,
  smtp_user VARCHAR(255),
  smtp_password VARCHAR(255),
  smtp_from_email VARCHAR(255),
  smtp_from_name VARCHAR(255),
  test_mode BOOLEAN DEFAULT true,
  test_email VARCHAR(255),
  enabled BOOLEAN DEFAULT true,
  daily_limit INTEGER DEFAULT 1000,
  rate_limit_per_minute INTEGER DEFAULT 10,
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(type);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_email_logs_template_type ON email_logs(template_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON email_queue(priority DESC);

-- Trigger for updated_at on email_templates
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_email_templates_updated_at'
  ) THEN
    CREATE TRIGGER update_email_templates_updated_at
        BEFORE UPDATE ON email_templates
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Insert default email templates
INSERT INTO email_templates (type, name, description, subject, html_body, recipient_type, default_recipients) VALUES
  ('new_order_admin', 'New Order (Admin)', 'Sent to admin when a new order is placed', 'New Order #{{order_number}}', '<h2>New Order Received!</h2><p>Order #{{order_number}}</p><p>Customer: {{customer_name}} ({{customer_email}})</p><p>Total: {{order_total}}</p><p>Date: {{order_date}}</p>', 'admin', ARRAY['info@simfab.com']),
  ('order_cancelled_admin', 'Order Cancelled (Admin)', 'Sent to admin when an order is cancelled', 'Order Cancelled #{{order_number}}', '<h2>Order Cancelled</h2><p>Order #{{order_number}} has been cancelled.</p><p>Customer: {{customer_name}} ({{customer_email}})</p><p>Reason: {{cancellation_reason}}</p>', 'admin', ARRAY['info@simfab.com']),
  ('order_cancelled_customer', 'Order Cancelled (Customer)', 'Sent to customer when their order is cancelled', 'Your Order #{{order_number}} Has Been Cancelled', '<h2>Order Cancellation</h2><p>Hi {{customer_name}},</p><p>Your order #{{order_number}} has been cancelled.</p><p>Total: {{order_total}}</p><p>If you have questions, please contact us.</p>', 'customer', ARRAY[]::text[]),
  ('order_failed_admin', 'Order Failed (Admin)', 'Sent to admin when payment fails', 'Payment Failed for Order #{{order_number}}', '<h2>Payment Failed</h2><p>Order #{{order_number}}</p><p>Customer: {{customer_email}}</p><p>Error: {{error_message}}</p>', 'admin', ARRAY['info@simfab.com']),
  ('order_failed_customer', 'Order Failed (Customer)', 'Sent to customer when payment fails', 'Payment Failed for Your Order', '<h2>Payment Failed</h2><p>Hi {{customer_name}},</p><p>Your payment for order #{{order_number}} could not be processed.</p><p>Please try again or use a different payment method.</p>', 'customer', ARRAY[]::text[]),
  ('order_on_hold', 'Order On Hold', 'Sent to customer when order is placed on hold', 'Your Order #{{order_number}} is On Hold', '<h2>Order On Hold</h2><p>Hi {{customer_name}},</p><p>Your order #{{order_number}} is currently on hold.</p><p>We will contact you soon with more information.</p>', 'customer', ARRAY[]::text[]),
  ('order_processing', 'Order Processing', 'Sent to customer when order starts processing', 'Your Order #{{order_number}} is Being Processed', '<h2>Order Processing</h2><p>Hi {{customer_name}},</p><p>Your order #{{order_number}} is now being processed.</p><p>We will notify you once it ships.</p><p>Total: {{order_total}}</p>', 'customer', ARRAY[]::text[]),
  ('order_completed', 'Order Completed', 'Sent to customer when order is completed', 'Your Order #{{order_number}} is Complete!', '<h2>Order Complete!</h2><p>Hi {{customer_name}},</p><p>Your order #{{order_number}} has been delivered successfully!</p><p>Thank you for shopping with SimFab!</p>', 'customer', ARRAY[]::text[]),
  ('order_refunded', 'Order Refunded', 'Sent to customer when order is refunded', 'Refund for Order #{{order_number}}', '<h2>Order Refunded</h2><p>Hi {{customer_name}},</p><p>Your order #{{order_number}} has been refunded.</p><p>Amount: {{refund_amount}}</p><p>Please allow 5-7 business days for processing.</p>', 'customer', ARRAY[]::text[]),
  ('order_details', 'Order Details', 'Sent to customer with order details', 'Order Details for #{{order_number}}', '<h2>Order Details</h2><p>Hi {{customer_name}},</p><p>Here are the details for your order #{{order_number}}:</p><p>Total: {{order_total}}</p><p>Date: {{order_date}}</p>', 'customer', ARRAY[]::text[]),
  ('customer_note', 'Customer Note', 'Sent to customer with a note from admin', 'Update on Your Order #{{order_number}}', '<h2>Order Update</h2><p>Hi {{customer_name}},</p><p>{{note}}</p>', 'customer', ARRAY[]::text[]),
  ('reset_password', 'Reset Password', 'Sent when customer requests password reset', 'Reset Your Password', '<h2>Password Reset</h2><p>Hi {{customer_name}},</p><p>You requested to reset your password.</p><p>Click here to reset: {{reset_url}}</p><p>This link expires in 24 hours.</p>', 'customer', ARRAY[]::text[]),
  ('new_account', 'New Account', 'Welcome email for new accounts', 'Welcome to SimFab!', '<h2>Welcome to SimFab!</h2><p>Hi {{customer_name}},</p><p>Thank you for creating an account!</p><p>You can now track your orders and save your address.</p>', 'customer', ARRAY[]::text[])
ON CONFLICT (type) DO NOTHING;

-- Insert default email settings
INSERT INTO email_settings (
  smtp_from_email, smtp_from_name, test_mode, enabled
) VALUES (
  'noreply@simfab.com', 'SimFab', true, true
) ON CONFLICT DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE email_templates IS 'Email templates for all system emails';
COMMENT ON TABLE email_logs IS 'Audit trail of all sent emails';
COMMENT ON TABLE email_queue IS 'Queue for async email processing';
COMMENT ON TABLE email_settings IS 'SMTP configuration and email service settings';
COMMENT ON COLUMN email_queue.variables IS 'JSON object with template variables like {order_number, customer_name, etc}';
COMMENT ON COLUMN email_templates.html_body IS 'HTML email body with {{variable}} placeholders';
COMMENT ON COLUMN email_settings.test_mode IS 'In test mode, emails are logged instead of sent';

