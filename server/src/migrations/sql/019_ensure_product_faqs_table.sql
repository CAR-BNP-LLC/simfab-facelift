-- Ensure product_faqs table exists with correct structure
-- This migration ensures the table is created properly before constraints are added

-- Drop the table if it exists (to ensure clean creation)
DROP TABLE IF EXISTS product_faqs CASCADE;

-- Create the product_faqs table with correct structure
CREATE TABLE product_faqs (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active TEXT DEFAULT '1',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add a comment to the table
COMMENT ON TABLE product_faqs IS 'Stores FAQ questions and answers for products';
COMMENT ON COLUMN product_faqs.is_active IS 'Active status: 1 for active, 0 for inactive';
COMMENT ON COLUMN product_faqs.sort_order IS 'Order in which FAQs should be displayed';
