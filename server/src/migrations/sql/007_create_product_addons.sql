-- Product add-ons and their options
-- Supports optional accessories and upgrades with pricing

CREATE TABLE IF NOT EXISTS product_addons (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2),
  price_range_min DECIMAL(10,2),
  price_range_max DECIMAL(10,2),
  is_required BOOLEAN DEFAULT false,
  has_options BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add-on options table (sub-options within an add-on)
CREATE TABLE IF NOT EXISTS addon_options (
  id SERIAL PRIMARY KEY,
  addon_id INTEGER NOT NULL REFERENCES product_addons(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url VARCHAR(500),
  is_available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_addons_product_id ON product_addons(product_id);
CREATE INDEX IF NOT EXISTS idx_addon_options_addon_id ON addon_options(addon_id);
CREATE INDEX IF NOT EXISTS idx_addon_options_available ON addon_options(addon_id, is_available);

COMMENT ON TABLE product_addons IS 'Optional add-ons and accessories for products';
COMMENT ON TABLE addon_options IS 'Configuration options for add-ons';
COMMENT ON COLUMN product_addons.has_options IS 'Whether this add-on has multiple configuration options';
COMMENT ON COLUMN product_addons.base_price IS 'Price if add-on has no options';
COMMENT ON COLUMN product_addons.price_range_min IS 'Minimum price if add-on has options';
COMMENT ON COLUMN product_addons.price_range_max IS 'Maximum price if add-on has options';


