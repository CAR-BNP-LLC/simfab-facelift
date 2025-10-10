-- Admin activity logging and system settings

-- Admin activity logs for audit trail
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id INTEGER,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System settings and configuration
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(50) DEFAULT 'string',
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT system_settings_type_check CHECK (
    setting_type IN ('string', 'number', 'boolean', 'json')
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id ON admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_action ON admin_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_resource ON admin_activity_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_public ON system_settings(is_public) WHERE is_public = true;

-- Trigger for system_settings updated_at
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
  ('site_name', 'SimFab', 'string', 'Website name', true),
  ('free_shipping_threshold', '500', 'number', 'Free shipping for orders over this amount', true),
  ('tax_rate', '0.08', 'number', 'Default tax rate (8%)', false),
  ('currency', 'USD', 'string', 'Default currency', true),
  ('order_email_enabled', 'true', 'boolean', 'Send order confirmation emails', false),
  ('low_stock_threshold', '5', 'number', 'Alert when product stock is below this', false),
  ('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', false),
  ('max_cart_items', '50', 'number', 'Maximum items allowed in cart', true)
ON CONFLICT (setting_key) DO NOTHING;

COMMENT ON TABLE admin_activity_logs IS 'Audit trail of all admin actions';
COMMENT ON TABLE system_settings IS 'System-wide configuration settings';
COMMENT ON COLUMN admin_activity_logs.details IS 'JSON details of what was changed';
COMMENT ON COLUMN system_settings.is_public IS 'Whether this setting can be accessed by frontend';


