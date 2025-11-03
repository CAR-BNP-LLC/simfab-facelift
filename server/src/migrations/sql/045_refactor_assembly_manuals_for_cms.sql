-- Migration: 045_refactor_assembly_manuals_for_cms.sql
-- Purpose: Create CMS structure for assembly manuals with many-to-many product relationships
-- Date: 2025

-- ============================================================================
-- Step 1: Create new assembly_manuals_cms table
-- ============================================================================

CREATE TABLE IF NOT EXISTS assembly_manuals_cms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) DEFAULT 'pdf',
  file_size INTEGER,
  thumbnail_url VARCHAR(500), -- Preview image/thumbnail for display
  qr_code_url VARCHAR(500), -- QR code image file URL for printing
  qr_code_data TEXT, -- URL encoded in QR code (e.g., https://simfab.com/manuals/:id)
  is_public BOOLEAN DEFAULT true, -- Can be viewed on website (for QR code scanning)
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Step 2: Create junction table for many-to-many relationship
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_assembly_manuals (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  manual_id INTEGER NOT NULL REFERENCES assembly_manuals_cms(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, manual_id) -- Prevent duplicate assignments
);

-- ============================================================================
-- Step 3: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_product_assembly_manuals_product_id 
  ON product_assembly_manuals(product_id);

CREATE INDEX IF NOT EXISTS idx_product_assembly_manuals_manual_id 
  ON product_assembly_manuals(manual_id);

CREATE INDEX IF NOT EXISTS idx_assembly_manuals_cms_public 
  ON assembly_manuals_cms(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_assembly_manuals_cms_sort_order 
  ON assembly_manuals_cms(sort_order);

-- ============================================================================
-- Step 4: Migrate existing data (if any exists)
-- ============================================================================

-- Migrate unique manuals from old table to new table
-- Using DISTINCT ON to handle duplicate file_urls and WHERE NOT EXISTS to avoid duplicates
INSERT INTO assembly_manuals_cms (
  name, 
  description, 
  file_url, 
  file_type, 
  file_size, 
  thumbnail_url, 
  is_public, 
  sort_order, 
  created_at
)
SELECT DISTINCT ON (file_url)
  name, 
  description, 
  file_url, 
  COALESCE(file_type, 'pdf'), 
  file_size, 
  image_url, 
  true, -- All existing manuals set as public by default
  sort_order, 
  created_at
FROM assembly_manuals
WHERE file_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM assembly_manuals_cms WHERE assembly_manuals_cms.file_url = assembly_manuals.file_url
  )
ORDER BY file_url, created_at DESC;

-- Migrate product-manual relationships to junction table
-- Join by file_url to match old manuals with new CMS manuals
INSERT INTO product_assembly_manuals (
  product_id, 
  manual_id, 
  sort_order, 
  created_at
)
SELECT 
  am.product_id, 
  amc.id, 
  am.sort_order, 
  am.created_at
FROM assembly_manuals am
INNER JOIN assembly_manuals_cms amc ON am.file_url = amc.file_url
WHERE am.product_id IS NOT NULL
ON CONFLICT (product_id, manual_id) DO NOTHING;

-- ============================================================================
-- Step 5: Add table comments for documentation
-- ============================================================================

COMMENT ON TABLE assembly_manuals_cms IS 
  'Central repository for assembly manuals. Manuals are independent entities that can be assigned to multiple products.';

COMMENT ON TABLE product_assembly_manuals IS 
  'Junction table for many-to-many relationship between products and assembly manuals. Allows a manual to be assigned to multiple products.';

COMMENT ON COLUMN assembly_manuals_cms.qr_code_url IS 
  'QR code image file URL. Generated automatically when manual is created. Can be downloaded/printed for packaging.';

COMMENT ON COLUMN assembly_manuals_cms.qr_code_data IS 
  'URL encoded in QR code. Format: {FRONTEND_URL}/manuals/:id. Used for QR code scanning.';

COMMENT ON COLUMN assembly_manuals_cms.is_public IS 
  'Whether manual can be viewed publicly via QR code scan. Private manuals are admin-only.';

COMMENT ON COLUMN product_assembly_manuals.sort_order IS 
  'Display order of manual on product detail page. Lower numbers appear first.';

