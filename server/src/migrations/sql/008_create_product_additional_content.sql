-- Additional product content tables: FAQs, manuals, and extra information

-- Product FAQs
CREATE TABLE IF NOT EXISTS product_faqs (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assembly manuals and documents
CREATE TABLE IF NOT EXISTS assembly_manuals (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  image_url VARCHAR(500),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Additional product information sections
CREATE TABLE IF NOT EXISTS product_additional_info (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content_type VARCHAR(50) DEFAULT 'text',
  content_data JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_faqs_product_id ON product_faqs(product_id);
CREATE INDEX IF NOT EXISTS idx_assembly_manuals_product_id ON assembly_manuals(product_id);
CREATE INDEX IF NOT EXISTS idx_product_additional_info_product_id ON product_additional_info(product_id);

-- Check constraints
ALTER TABLE product_additional_info
ADD CONSTRAINT product_additional_info_type_check 
CHECK (content_type IN ('text', 'images', 'mixed', 'html'));

ALTER TABLE assembly_manuals
ADD CONSTRAINT assembly_manuals_type_check 
CHECK (file_type IN ('pdf', 'doc', 'docx', 'txt', 'zip'));

COMMENT ON TABLE product_faqs IS 'Frequently asked questions for products';
COMMENT ON TABLE assembly_manuals IS 'Assembly instructions and manuals';
COMMENT ON TABLE product_additional_info IS 'Extended product information sections';
COMMENT ON COLUMN product_additional_info.content_data IS 'Flexible JSONB content for images, text, etc.';


