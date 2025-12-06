-- Migration 058: Create shared product configurations table
-- Allows users to share product configurations via short URLs
-- Stores complete product configuration (variations, bundle items, etc.) for easy sharing

BEGIN;

-- Create shared_product_configs table
CREATE TABLE IF NOT EXISTS shared_product_configs (
  id SERIAL PRIMARY KEY,
  short_code VARCHAR(20) UNIQUE NOT NULL,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  configuration JSONB NOT NULL,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shared_configs_short_code ON shared_product_configs(short_code);
CREATE INDEX IF NOT EXISTS idx_shared_configs_product_id ON shared_product_configs(product_id);

-- Add comments for documentation
COMMENT ON TABLE shared_product_configs IS 'Stores product configurations for sharing via short URLs';
COMMENT ON COLUMN shared_product_configs.short_code IS 'Unique short code used in shareable URL (e.g., /share/abc123)';
COMMENT ON COLUMN shared_product_configs.product_id IS 'Product this configuration belongs to';
COMMENT ON COLUMN shared_product_configs.configuration IS 'Complete product configuration JSON (variations, bundle items, etc.)';
COMMENT ON COLUMN shared_product_configs.view_count IS 'Number of times this shared config has been viewed';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_shared_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_shared_config_updated_at'
  ) THEN
    CREATE TRIGGER update_shared_config_updated_at
      BEFORE UPDATE ON shared_product_configs
      FOR EACH ROW
      EXECUTE FUNCTION update_shared_config_updated_at();
  END IF;
END $$;

COMMIT;

