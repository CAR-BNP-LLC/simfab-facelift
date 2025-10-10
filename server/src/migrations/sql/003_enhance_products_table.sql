-- Enhanced products table with e-commerce fields
-- Adds: slug, status, featured, JSONB fields, SEO, and proper pricing structure

-- Add new columns to existing products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS price_min DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS price_max DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS meta_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS seo_description TEXT;

-- Update type column to support configurable products
ALTER TABLE products
ALTER COLUMN type SET DEFAULT 'simple';

-- Add status constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_status_check'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_status_check 
    CHECK (status IN ('active', 'inactive', 'draft', 'archived'));
  END IF;
END $$;

-- Add type constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_type_check'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_type_check 
    CHECK (type IN ('simple', 'variable', 'configurable'));
  END IF;
END $$;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
CREATE INDEX IF NOT EXISTS idx_products_price_range ON products(price_min, price_max);

-- Create full-text search index on name and description
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN (
  to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(short_description, ''))
);

-- Trigger for updated_at
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Generate slug from name for existing products
UPDATE products 
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL;

COMMENT ON COLUMN products.slug IS 'URL-friendly product identifier';
COMMENT ON COLUMN products.status IS 'Product status: active, inactive, draft, archived';
COMMENT ON COLUMN products.featured IS 'Whether product should be featured on homepage';
COMMENT ON COLUMN products.price_min IS 'Minimum price for configurable products';
COMMENT ON COLUMN products.price_max IS 'Maximum price for configurable products';
COMMENT ON COLUMN products.meta_data IS 'Additional product metadata in JSON format';
COMMENT ON COLUMN products.seo_title IS 'SEO optimized title';
COMMENT ON COLUMN products.seo_description IS 'SEO meta description';


