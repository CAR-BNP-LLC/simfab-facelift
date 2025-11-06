-- Migration 049: Add soft delete support for products
-- Allows products to be marked as deleted instead of hard deleted
-- This maintains referential integrity for products referenced in orders

-- Add deleted_at column to products table
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

-- Create index for efficient filtering of non-deleted products
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at) 
  WHERE deleted_at IS NULL;

-- Create index for finding deleted products (for admin restore functionality)
CREATE INDEX IF NOT EXISTS idx_products_deleted_at_not_null ON products(deleted_at) 
  WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN products.deleted_at IS 'Timestamp when product was soft deleted. NULL means product is active.';

