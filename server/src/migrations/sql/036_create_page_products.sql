-- ============================================================================
-- Page Products CMS Migration
-- Migration: 036_create_page_products.sql
-- Description: Creates table for managing featured products and categories on specific pages
-- ============================================================================

-- Create page_products table
CREATE TABLE IF NOT EXISTS page_products (
  id SERIAL PRIMARY KEY,
  page_route VARCHAR(255) NOT NULL,
  page_section VARCHAR(255) NOT NULL,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  category_id VARCHAR(255) NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  display_type VARCHAR(50) DEFAULT 'products',
  max_items INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure each product appears only once per section
  CONSTRAINT page_products_unique UNIQUE(page_route, page_section, product_id),
  
  -- Validate display_type
  CONSTRAINT page_products_display_type_check CHECK (display_type IN ('products', 'category'))
);

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_page_products_route_section ON page_products(page_route, page_section);
CREATE INDEX IF NOT EXISTS idx_page_products_product ON page_products(product_id);
CREATE INDEX IF NOT EXISTS idx_page_products_active ON page_products(is_active);
CREATE INDEX IF NOT EXISTS idx_page_products_display_order ON page_products(page_route, page_section, display_order);

-- Create function if it doesn't exist (function created in migration 002)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_page_products_updated_at'
  ) THEN
    CREATE TRIGGER update_page_products_updated_at
      BEFORE UPDATE ON page_products
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Add comments
COMMENT ON TABLE page_products IS 'Manages which products are featured on specific pages and sections';
COMMENT ON COLUMN page_products.page_route IS 'Page route identifier (e.g., /sim-racing, /flight-sim)';
COMMENT ON COLUMN page_products.page_section IS 'Section identifier within the page (e.g., base-models, add-ons)';
COMMENT ON COLUMN page_products.product_id IS 'Reference to product (when display_type is products)';
COMMENT ON COLUMN page_products.category_id IS 'Category identifier (when display_type is category)';
COMMENT ON COLUMN page_products.display_order IS 'Order of display on the page (lower = first)';
COMMENT ON COLUMN page_products.is_active IS 'Whether this assignment is active';
COMMENT ON COLUMN page_products.display_type IS 'Type: products (individual) or category (category-based)';
COMMENT ON COLUMN page_products.max_items IS 'Max products to show (when using category mode)';

