-- Product images table for supporting multiple images per product
-- Includes ordering and primary image functionality

CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255),
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_primary ON product_images(product_id, is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_product_images_sort ON product_images(product_id, sort_order);

-- Function to ensure only one primary image per product
CREATE OR REPLACE FUNCTION ensure_one_primary_image()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    -- Set all other images for this product to not primary
    UPDATE product_images 
    SET is_primary = false 
    WHERE product_id = NEW.product_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure only one primary image
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'ensure_one_primary_image_trigger'
  ) THEN
    CREATE TRIGGER ensure_one_primary_image_trigger
      BEFORE INSERT OR UPDATE ON product_images
      FOR EACH ROW
      WHEN (NEW.is_primary = true)
      EXECUTE FUNCTION ensure_one_primary_image();
  END IF;
END $$;

COMMENT ON TABLE product_images IS 'Product image gallery with ordering support';
COMMENT ON COLUMN product_images.is_primary IS 'Primary image shown in product listings';
COMMENT ON COLUMN product_images.sort_order IS 'Display order in gallery';


