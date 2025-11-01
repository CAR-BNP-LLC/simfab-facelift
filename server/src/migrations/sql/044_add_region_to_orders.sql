-- Add region support to orders table
-- Order region indicates whether this is a US or EU order

ALTER TABLE orders 
ADD COLUMN region VARCHAR(10) CHECK (region IN ('us', 'eu'));

-- Set default region for existing orders (default to US)
UPDATE orders SET region = 'us' WHERE region IS NULL;

-- Make region NOT NULL after setting defaults
ALTER TABLE orders ALTER COLUMN region SET NOT NULL;

-- Add index for region queries (especially for ShipStation which only handles US orders)
CREATE INDEX IF NOT EXISTS idx_orders_region ON orders(region);

-- Add comment
COMMENT ON COLUMN orders.region IS 'Region of the order (us or eu). US orders are exported to ShipStation, EU orders use different fulfillment.';

