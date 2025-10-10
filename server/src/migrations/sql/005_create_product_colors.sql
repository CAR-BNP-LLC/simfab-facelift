-- Product colors table for color variations
-- Supports color swatches and availability

CREATE TABLE IF NOT EXISTS product_colors (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color_name VARCHAR(100) NOT NULL,
  color_code VARCHAR(7),
  color_image_url VARCHAR(500),
  is_available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_colors_product_id ON product_colors(product_id);
CREATE INDEX IF NOT EXISTS idx_product_colors_available ON product_colors(product_id, is_available);

-- Check constraint for hex color code format
ALTER TABLE product_colors
ADD CONSTRAINT product_colors_code_check 
CHECK (color_code IS NULL OR color_code ~ '^#[0-9A-Fa-f]{6}$');

COMMENT ON TABLE product_colors IS 'Color variations for products';
COMMENT ON COLUMN product_colors.color_code IS 'Hex color code (e.g., #FF0000)';
COMMENT ON COLUMN product_colors.color_image_url IS 'Image showing product in this color';
COMMENT ON COLUMN product_colors.is_available IS 'Whether this color is currently available';


