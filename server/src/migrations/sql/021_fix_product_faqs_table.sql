-- Fix product_faqs table structure
-- This migration ensures the table has the correct structure

-- First, check if the table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS product_faqs (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active TEXT DEFAULT '1',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add the is_active column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_faqs' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE product_faqs ADD COLUMN is_active TEXT DEFAULT '1';
  END IF;
END $$;

-- Add other columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_faqs' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE product_faqs ADD COLUMN sort_order INTEGER DEFAULT 0;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_faqs' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE product_faqs ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
