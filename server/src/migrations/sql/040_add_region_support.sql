-- Add region support to products table
-- Enables multi-region support: US (simfab.com) and EU (eu.simfab.com)
-- Products can be linked via product_group_id when available in both regions

BEGIN;

-- Add region column (nullable initially for migration)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS region VARCHAR(10) CHECK (region IN ('us', 'eu'));

-- Add product_group_id to link related products across regions
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS product_group_id UUID;

-- Migrate existing products to US region
UPDATE products 
SET region = 'us' 
WHERE region IS NULL;

-- Generate unique group IDs for existing products (each gets its own group initially)
UPDATE products 
SET product_group_id = gen_random_uuid() 
WHERE product_group_id IS NULL;

-- Now make region NOT NULL after migration
ALTER TABLE products 
ALTER COLUMN region SET NOT NULL;

-- Create unique constraint: one product per region per group
-- This ensures a product_group_id can only have one US and one EU product
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_group_region 
ON products(product_group_id, region) 
WHERE product_group_id IS NOT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_region ON products(region);
CREATE INDEX IF NOT EXISTS idx_products_group_id ON products(product_group_id);

-- Add comments for documentation
COMMENT ON COLUMN products.region IS 'Region where product is available: us or eu';
COMMENT ON COLUMN products.product_group_id IS 'UUID linking related products across regions. Products with same group_id are variants for different regions.';

COMMIT;

