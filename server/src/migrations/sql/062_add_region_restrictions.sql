-- Migration: 062_add_region_restrictions.sql
-- Purpose: Add region restrictions settings for EU-only deployment mode
-- Date: 2025

-- Insert region restriction settings for EU region
INSERT INTO region_settings (region, setting_key, setting_value, setting_type, description, is_public) VALUES
  ('eu', 'region_restrictions_enabled', 'false', 'boolean', 'Enable EU-only mode. When enabled, US region selection redirects to simfab.com', true),
  ('eu', 'default_region', 'eu', 'string', 'Default region for EU deployment (eu or us)', true)
ON CONFLICT (region, setting_key) DO NOTHING;

-- Insert default region setting for US region (for consistency)
INSERT INTO region_settings (region, setting_key, setting_value, setting_type, description, is_public) VALUES
  ('us', 'default_region', 'us', 'string', 'Default region for US deployment (eu or us)', true)
ON CONFLICT (region, setting_key) DO NOTHING;

-- Comments
COMMENT ON TABLE region_settings IS 'Region-specific configuration settings for US and EU, including region restrictions for EU-only deployment';

