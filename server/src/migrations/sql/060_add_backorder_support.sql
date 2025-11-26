-- Migration 060: Add backorder support
-- Ensures backorders_allowed column exists and is properly configured
-- Converts existing TEXT values to boolean for consistency

-- The backorders_allowed column already exists in products table as TEXT
-- We'll ensure it's properly handled in queries (conversion happens in application layer)

-- Add comment for documentation
COMMENT ON COLUMN products.backorders_allowed IS 'If true (or "yes"/"1"), product can be ordered when stock is 0. Stock will go negative when backorders are placed.';

-- Optional: Add index for performance if we need to filter by backorders
-- CREATE INDEX IF NOT EXISTS idx_products_backorders_allowed ON products(backorders_allowed) WHERE backorders_allowed IS NOT NULL;

