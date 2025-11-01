-- Make SKU unique per region (allows same SKU for US and EU)
-- Similar to how slug works - same SKU can exist for different regions

BEGIN;

-- Drop the existing unique constraint on sku
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS products_sku_key;

-- Create a new unique constraint on (sku, region)
-- This allows the same SKU to exist for both US and EU regions
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_region 
ON products(sku, region);

COMMENT ON INDEX idx_products_sku_region IS 'Ensures SKU is unique per region, allowing same SKU for US and EU';

COMMIT;

