-- Migration 051: Add note field to products table
-- Adds optional note field for product-specific notices displayed on product detail pages

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS note TEXT;

COMMENT ON COLUMN products.note IS 'Optional note displayed on product detail page (e.g., "Product available only on back order, expect on date")';

