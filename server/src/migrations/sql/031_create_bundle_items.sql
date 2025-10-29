-- Migration 031: Create bundle items system
-- Products that contain other products (bundles)

-- Bundle items (replaces and extends product_addons)
CREATE TABLE IF NOT EXISTS product_bundle_items (
  id SERIAL PRIMARY KEY,
  bundle_product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  item_product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  item_type VARCHAR(20) DEFAULT 'required' 
    CHECK (item_type IN ('required', 'optional')),
  is_configurable BOOLEAN DEFAULT false,
  price_adjustment DECIMAL(10,2) DEFAULT 0,
  display_name VARCHAR(255),
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_bundle_item UNIQUE(bundle_product_id, item_product_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle ON product_bundle_items(bundle_product_id);
CREATE INDEX IF NOT EXISTS idx_bundle_items_item ON product_bundle_items(item_product_id);
CREATE INDEX IF NOT EXISTS idx_bundle_items_type ON product_bundle_items(bundle_product_id, item_type);

COMMENT ON TABLE product_bundle_items IS 'Items included in bundle products (required and optional)';
COMMENT ON COLUMN product_bundle_items.item_type IS 'required = must be included, optional = addon';
COMMENT ON COLUMN product_bundle_items.is_configurable IS 'Customer can select variations for this item';
COMMENT ON COLUMN product_bundle_items.price_adjustment IS 'Price modifier for optional items';
