-- Migration: 046_create_region_settings.sql
-- Purpose: Create region-specific settings table for US and EU configurations
-- Date: 2025

-- Region-specific settings table
CREATE TABLE IF NOT EXISTS region_settings (
  id SERIAL PRIMARY KEY,
  region VARCHAR(2) NOT NULL CHECK (region IN ('us', 'eu')),
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(50) DEFAULT 'string',
  description TEXT,
  is_public BOOLEAN DEFAULT true, -- Can be accessed by frontend
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(region, setting_key),
  CONSTRAINT region_settings_type_check CHECK (
    setting_type IN ('string', 'number', 'boolean', 'json')
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_region_settings_region ON region_settings(region);
CREATE INDEX IF NOT EXISTS idx_region_settings_key ON region_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_region_settings_public ON region_settings(is_public) 
  WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_region_settings_region_public ON region_settings(region, is_public)
  WHERE is_public = true;

-- Trigger for updated_at
CREATE TRIGGER update_region_settings_updated_at
    BEFORE UPDATE ON region_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings for US region
INSERT INTO region_settings (region, setting_key, setting_value, setting_type, description, is_public) VALUES
  ('us', 'admin_email', 'info@simfab.com', 'string', 'Administrative contact email', true),
  ('us', 'phone_number', '1-888-299-2746', 'string', 'Toll-free phone number', true),
  ('us', 'phone_display', 'Toll free for USA & Canada: 1-888-299-2746', 'string', 'Display text for phone', true),
  ('us', 'company_name', 'SimFab US', 'string', 'Company name for US region', true),
  ('us', 'address', '123 Business St, Miami, FL 33101', 'string', 'Business address', false),
  ('us', 'currency', 'USD', 'string', 'Default currency', true),
  ('us', 'tax_rate', '0.08', 'number', 'Tax rate (8%)', false),
  ('us', 'free_shipping_threshold', '500', 'number', 'Free shipping threshold', true),
  ('us', 'site_name', 'SimFab', 'string', 'Website name', true)
ON CONFLICT (region, setting_key) DO NOTHING;

-- Insert default settings for EU region
INSERT INTO region_settings (region, setting_key, setting_value, setting_type, description, is_public) VALUES
  ('eu', 'admin_email', 'info@simfab.eu', 'string', 'Administrative contact email', true),
  ('eu', 'phone_number', '+359 88 930 6855', 'string', 'Phone number', true),
  ('eu', 'phone_display', 'EU Support: +359 88 930 6855', 'string', 'Display text for phone', true),
  ('eu', 'company_name', 'SimFab EU', 'string', 'Company name for EU region', true),
  ('eu', 'address', 'Business Address, City, Country', 'string', 'Business address', false),
  ('eu', 'currency', 'EUR', 'string', 'Default currency', true),
  ('eu', 'tax_rate', '0.19', 'number', 'Tax rate (19% VAT)', false),
  ('eu', 'free_shipping_threshold', '500', 'number', 'Free shipping threshold', true),
  ('eu', 'site_name', 'SimFab', 'string', 'Website name', true)
ON CONFLICT (region, setting_key) DO NOTHING;

-- Comments
COMMENT ON TABLE region_settings IS 'Region-specific configuration settings for US and EU';
COMMENT ON COLUMN region_settings.region IS 'Region code: us or eu';
COMMENT ON COLUMN region_settings.is_public IS 'Whether this setting can be accessed by frontend without authentication';
COMMENT ON COLUMN region_settings.setting_type IS 'Data type: string, number, boolean, or json';


