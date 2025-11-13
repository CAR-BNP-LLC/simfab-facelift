-- Migration 052: Create site_notices table
-- Stores site-wide notices shown once per session on the home page

CREATE TABLE IF NOT EXISTS site_notices (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on is_active for faster queries
CREATE INDEX IF NOT EXISTS idx_site_notices_is_active ON site_notices(is_active);

COMMENT ON TABLE site_notices IS 'Site-wide notices displayed on home page once per session';
COMMENT ON COLUMN site_notices.message IS 'Notice message text (e.g., "Black Friday promo" or "Out of office orders will be slowed by a few days")';
COMMENT ON COLUMN site_notices.is_active IS 'Whether this notice is currently active. Only one notice should be active at a time.';

