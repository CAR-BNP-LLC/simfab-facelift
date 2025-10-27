-- Migration 030: Add per-variation stock tracking
-- Adds stock tracking capabilities to variation options

-- Enable stock tracking flag on variations
ALTER TABLE product_variations
ADD COLUMN IF NOT EXISTS tracks_stock BOOLEAN DEFAULT false;

-- Add stock fields to variation options
ALTER TABLE variation_options 
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER DEFAULT 0;

-- Add inventory mode to products (simple or bundle)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN DEFAULT false;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_variation_options_stock 
  ON variation_options(variation_id, stock_quantity) 
  WHERE stock_quantity IS NOT NULL;

COMMENT ON COLUMN product_variations.tracks_stock IS 'If true, each option has separate stock tracking';
COMMENT ON COLUMN variation_options.stock_quantity IS 'Stock available for this specific variation option';
COMMENT ON COLUMN variation_options.reserved_quantity IS 'Stock currently reserved in pending orders';
COMMENT ON COLUMN products.is_bundle IS 'If true, this product contains other products (bundle)';
