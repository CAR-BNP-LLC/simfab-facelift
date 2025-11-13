-- Migration: 056_add_fedex_warehouse_address.sql
-- Purpose: Add FedEx warehouse address setting to region_settings
-- Date: 2025

-- Insert FedEx warehouse address settings for US and EU regions
INSERT INTO region_settings (region, setting_key, setting_value, setting_type, description, is_public) VALUES
  ('us', 'fedex_warehouse_address', '{"streetLines":["123 Business St"],"city":"Miami","stateOrProvinceCode":"FL","postalCode":"33101","countryCode":"US"}', 'json', 'FedEx ship-from warehouse address', false),
  ('eu', 'fedex_warehouse_address', '{"streetLines":["Business Address"],"city":"Berlin","stateOrProvinceCode":"","postalCode":"10115","countryCode":"DE"}', 'json', 'FedEx ship-from warehouse address', false)
ON CONFLICT (region, setting_key) DO NOTHING;

COMMENT ON COLUMN region_settings.setting_type IS 'Data type: string, number, boolean, or json';

