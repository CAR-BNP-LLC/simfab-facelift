-- Migration: 061_add_region_smtp_settings.sql
-- Purpose: Add SMTP email settings to region_settings table for US and EU
-- Date: 2025

-- Insert SMTP settings for US region
INSERT INTO region_settings (region, setting_key, setting_value, setting_type, description, is_public) VALUES
  ('us', 'smtp_host', '', 'string', 'SMTP server hostname (e.g., smtp.gmail.com)', false),
  ('us', 'smtp_port', '587', 'number', 'SMTP server port (587 for TLS, 465 for SSL)', false),
  ('us', 'smtp_user', '', 'string', 'SMTP username/email', false),
  ('us', 'smtp_password', '', 'string', 'SMTP password or app password', false),
  ('us', 'smtp_from_email', '', 'string', 'Email address to send from', false),
  ('us', 'smtp_from_name', 'SimFab', 'string', 'Display name for sent emails', false),
  ('us', 'smtp_enabled', 'true', 'boolean', 'Enable/disable email sending for this region', false),
  ('us', 'smtp_test_mode', 'false', 'boolean', 'Test mode (logs emails instead of sending)', false),
  ('us', 'smtp_test_email', '', 'string', 'Test email address (redirects all emails in test mode)', false)
ON CONFLICT (region, setting_key) DO NOTHING;

-- Insert SMTP settings for EU region
INSERT INTO region_settings (region, setting_key, setting_value, setting_type, description, is_public) VALUES
  ('eu', 'smtp_host', '', 'string', 'SMTP server hostname (e.g., smtp.gmail.com)', false),
  ('eu', 'smtp_port', '587', 'number', 'SMTP server port (587 for TLS, 465 for SSL)', false),
  ('eu', 'smtp_user', '', 'string', 'SMTP username/email', false),
  ('eu', 'smtp_password', '', 'string', 'SMTP password or app password', false),
  ('eu', 'smtp_from_email', '', 'string', 'Email address to send from', false),
  ('eu', 'smtp_from_name', 'SimFab EU', 'string', 'Display name for sent emails', false),
  ('eu', 'smtp_enabled', 'true', 'boolean', 'Enable/disable email sending for this region', false),
  ('eu', 'smtp_test_mode', 'false', 'boolean', 'Test mode (logs emails instead of sending)', false),
  ('eu', 'smtp_test_email', '', 'string', 'Test email address (redirects all emails in test mode)', false)
ON CONFLICT (region, setting_key) DO NOTHING;

-- Comments
COMMENT ON TABLE region_settings IS 'Region-specific configuration settings for US and EU, including SMTP email settings';

