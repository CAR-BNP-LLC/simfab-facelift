-- Fix slug unique constraint to allow same slug for different regions
-- Enables products with same slug in US and EU (same URL structure, different regions)

BEGIN;

-- Drop the existing unique constraint on slug
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS products_slug_key;

-- Create a new unique constraint on (slug, region)
-- This allows the same slug to exist for both US and EU regions
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug_region 
ON products(slug, region);

COMMENT ON INDEX idx_products_slug_region IS 'Ensures slug is unique per region, allowing same slug for US and EU';

COMMIT;

