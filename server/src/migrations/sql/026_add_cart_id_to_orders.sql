-- Add cart_id column to orders table
-- This allows us to track which cart was used to create the order

ALTER TABLE orders ADD COLUMN IF NOT EXISTS cart_id VARCHAR(255);

-- Add index for cart_id lookups
CREATE INDEX IF NOT EXISTS idx_orders_cart_id ON orders(cart_id);

-- Add comment for documentation
COMMENT ON COLUMN orders.cart_id IS 'ID of the cart used to create this order';
