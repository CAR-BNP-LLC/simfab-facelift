-- Product variations table for model and dropdown selections
-- Supports different types of variations with options

CREATE TABLE IF NOT EXISTS product_variations (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variation_type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Variation options table
CREATE TABLE IF NOT EXISTS variation_options (
  id SERIAL PRIMARY KEY,
  variation_id INTEGER NOT NULL REFERENCES product_variations(id) ON DELETE CASCADE,
  option_name VARCHAR(255) NOT NULL,
  option_value VARCHAR(255) NOT NULL,
  price_adjustment DECIMAL(10,2) DEFAULT 0,
  image_url VARCHAR(500),
  is_default BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_variations_product_id ON product_variations(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variations_type ON product_variations(variation_type);
CREATE INDEX IF NOT EXISTS idx_variation_options_variation_id ON variation_options(variation_id);
CREATE INDEX IF NOT EXISTS idx_variation_options_default ON variation_options(variation_id, is_default) WHERE is_default = true;

-- Check constraint for variation type
ALTER TABLE product_variations
ADD CONSTRAINT product_variations_type_check 
CHECK (variation_type IN ('model', 'dropdown', 'radio', 'select'));

-- Function to ensure only one default option per variation
CREATE OR REPLACE FUNCTION ensure_one_default_option()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE variation_options 
    SET is_default = false 
    WHERE variation_id = NEW.variation_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure only one default option
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'ensure_one_default_option_trigger'
  ) THEN
    CREATE TRIGGER ensure_one_default_option_trigger
      BEFORE INSERT OR UPDATE ON variation_options
      FOR EACH ROW
      WHEN (NEW.is_default = true)
      EXECUTE FUNCTION ensure_one_default_option();
  END IF;
END $$;

COMMENT ON TABLE product_variations IS 'Product variation types (model, dropdown, etc.)';
COMMENT ON TABLE variation_options IS 'Options for each variation with pricing adjustments';
COMMENT ON COLUMN product_variations.variation_type IS 'Type: model, dropdown, radio, select';
COMMENT ON COLUMN product_variations.is_required IS 'Whether customer must select an option';
COMMENT ON COLUMN variation_options.price_adjustment IS 'Price change when this option is selected';


