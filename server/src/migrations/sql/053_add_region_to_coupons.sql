-- Migration 053: Add region support to coupons table
-- Each coupon should have a region (us or eu) and can only be applied to carts from the same region

ALTER TABLE coupons 
ADD COLUMN region VARCHAR(10) CHECK (region IN ('us', 'eu'));

-- Set default region for existing coupons (default to US)
UPDATE coupons SET region = 'us' WHERE region IS NULL;

-- Make region NOT NULL after setting defaults
ALTER TABLE coupons ALTER COLUMN region SET NOT NULL;

-- Add index for region queries
CREATE INDEX IF NOT EXISTS idx_coupons_region ON coupons(region);

-- Add comment
COMMENT ON COLUMN coupons.region IS 'Region of the coupon (us or eu). Coupons can only be applied to carts from the same region.';

