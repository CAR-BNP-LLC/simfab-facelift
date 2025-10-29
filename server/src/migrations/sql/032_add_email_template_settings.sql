-- Add trigger event and custom recipient settings to email templates
ALTER TABLE email_templates 
  ADD COLUMN IF NOT EXISTS trigger_event VARCHAR(100),
  ADD COLUMN IF NOT EXISTS custom_recipient_email VARCHAR(255);

-- Update recipient_type constraint to include 'custom'
ALTER TABLE email_templates 
  DROP CONSTRAINT IF EXISTS email_templates_recipient_type_check;

ALTER TABLE email_templates 
  ADD CONSTRAINT email_templates_recipient_type_check CHECK (
    recipient_type IN ('admin', 'customer', 'both', 'custom')
  );

-- Update existing templates with trigger events
UPDATE email_templates SET trigger_event = 'order.created' WHERE type = 'new_order_admin';
UPDATE email_templates SET trigger_event = 'order.cancelled' WHERE type IN ('order_cancelled_admin', 'order_cancelled_customer');
UPDATE email_templates SET trigger_event = 'order.payment_failed' WHERE type IN ('order_failed_admin', 'order_failed_customer');
UPDATE email_templates SET trigger_event = 'order.on_hold' WHERE type = 'order_on_hold';
UPDATE email_templates SET trigger_event = 'order.processing' WHERE type = 'order_processing';
UPDATE email_templates SET trigger_event = 'order.completed' WHERE type = 'order_completed';
UPDATE email_templates SET trigger_event = 'order.refunded' WHERE type = 'order_refunded';
UPDATE email_templates SET trigger_event = 'order.details_requested' WHERE type = 'order_details';
UPDATE email_templates SET trigger_event = 'admin.note_added' WHERE type = 'customer_note';
UPDATE email_templates SET trigger_event = 'auth.password_reset' WHERE type = 'reset_password';
UPDATE email_templates SET trigger_event = 'auth.account_created' WHERE type = 'new_account';

