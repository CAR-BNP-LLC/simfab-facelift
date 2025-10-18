-- Create product FAQs table
-- Allows dynamic FAQ management per product

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
