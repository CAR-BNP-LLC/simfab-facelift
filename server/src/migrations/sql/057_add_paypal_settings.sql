-- Migration: 057_add_paypal_settings.sql
-- Purpose: Add PayPal client ID and secret settings for US and EU regions
-- Date: 2025

-- Insert PayPal settings for US region (not public - admin only)
INSERT INTO region_settings (region, setting_key, setting_value, setting_type, description, is_public) VALUES
  ('us', 'paypal_client_id', '', 'string', 'PayPal Client ID for US region', false),
  ('us', 'paypal_client_secret', '', 'string', 'PayPal Client Secret for US region (sensitive)', false)
ON CONFLICT (region, setting_key) DO NOTHING;

-- Insert PayPal settings for EU region (not public - admin only)
INSERT INTO region_settings (region, setting_key, setting_value, setting_type, description, is_public) VALUES
  ('eu', 'paypal_client_id', '', 'string', 'PayPal Client ID for EU region', false),
  ('eu', 'paypal_client_secret', '', 'string', 'PayPal Client Secret for EU region (sensitive)', false)
ON CONFLICT (region, setting_key) DO NOTHING;

-- Comments
COMMENT ON TABLE region_settings IS 'Region-specific configuration settings for US and EU, including PayPal credentials';

