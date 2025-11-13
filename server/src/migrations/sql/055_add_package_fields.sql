-- Migration 055: Add package weight, dimensions, and tariff code fields
-- Adds package-specific shipping information with unit selectors

BEGIN;

-- Add package weight fields
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS package_weight REAL,
  ADD COLUMN IF NOT EXISTS package_weight_unit TEXT CHECK (package_weight_unit IN ('kg', 'lbs')) DEFAULT 'lbs';

-- Add package dimension fields
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS package_length REAL,
  ADD COLUMN IF NOT EXISTS package_width REAL,
  ADD COLUMN IF NOT EXISTS package_height REAL,
  ADD COLUMN IF NOT EXISTS package_dimension_unit TEXT CHECK (package_dimension_unit IN ('cm', 'in')) DEFAULT 'in';

-- Add tariff code field
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS tariff_code TEXT;

COMMENT ON COLUMN products.package_weight IS 'Package weight value';
COMMENT ON COLUMN products.package_weight_unit IS 'Unit for package weight: kg or lbs';
COMMENT ON COLUMN products.package_length IS 'Package length';
COMMENT ON COLUMN products.package_width IS 'Package width';
COMMENT ON COLUMN products.package_height IS 'Package height';
COMMENT ON COLUMN products.package_dimension_unit IS 'Unit for package dimensions: cm or in';
COMMENT ON COLUMN products.tariff_code IS 'HS tariff code for customs (optional)';

COMMIT;

