-- Add product discount fields and cart_coupons join table
-- Supports product-level discounts and coupon tracking in carts

-- Add discount fields to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_on_sale BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_start_date TIMESTAMP;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_end_date TIMESTAMP;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_label VARCHAR(100);

-- Create index for products on sale for performance
CREATE INDEX IF NOT EXISTS idx_products_on_sale ON products(is_on_sale, sale_start_date, sale_end_date) 
WHERE is_on_sale = true;

-- Create cart_coupons join table to track applied coupons
CREATE TABLE IF NOT EXISTS cart_coupons (
  id SERIAL PRIMARY KEY,
  cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  discount_amount DECIMAL(10,2) NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT cart_coupons_unique_cart_coupon UNIQUE(cart_id, coupon_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cart_coupons_cart_id ON cart_coupons(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_coupons_coupon_id ON cart_coupons(coupon_id);
CREATE INDEX IF NOT EXISTS idx_cart_coupons_applied_at ON cart_coupons(applied_at);

COMMENT ON TABLE cart_coupons IS 'Tracks which coupons are applied to which carts';
COMMENT ON COLUMN cart_coupons.discount_amount IS 'The calculated discount amount at time of application';
COMMENT ON COLUMN products.is_on_sale IS 'Whether the product is currently on sale';
COMMENT ON COLUMN products.sale_label IS 'Badge text to display on sale products (e.g., "50% OFF")';
