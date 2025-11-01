-- Add region support to carts table
-- Cart region should match the region of products in the cart

ALTER TABLE carts 
ADD COLUMN region VARCHAR(10) CHECK (region IN ('us', 'eu'));

-- Set default region for existing carts (default to US)
UPDATE carts SET region = 'us' WHERE region IS NULL;

-- Make region NOT NULL after setting defaults
ALTER TABLE carts ALTER COLUMN region SET NOT NULL;

-- Add index for region queries
CREATE INDEX IF NOT EXISTS idx_carts_region ON carts(region);

-- Add comment
COMMENT ON COLUMN carts.region IS 'Region of the cart (us or eu). Cart region must match the region of all products in the cart.';

