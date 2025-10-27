-- Create product description components table
-- Supports dynamic content creation with JSON storage

CREATE TABLE IF NOT EXISTS product_description_components (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  component_type VARCHAR(50) NOT NULL CHECK (component_type IN ('text', 'image', 'two_column', 'three_column', 'full_width_image')),
  content JSON NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_description_components_product_id ON product_description_components(product_id);
CREATE INDEX IF NOT EXISTS idx_product_description_components_sort_order ON product_description_components(product_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_product_description_components_type ON product_description_components(component_type);

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_description_components_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_description_components_updated_at
  BEFORE UPDATE ON product_description_components
  FOR EACH ROW
  EXECUTE FUNCTION update_product_description_components_updated_at();

-- Add table comment
COMMENT ON TABLE product_description_components IS 'Stores dynamic product description components with JSON content';
COMMENT ON COLUMN product_description_components.component_type IS 'Type of component: text, image, two_column, three_column, full_width_image';
COMMENT ON COLUMN product_description_components.content IS 'JSON content specific to component type';
COMMENT ON COLUMN product_description_components.sort_order IS 'Display order within product (lower numbers first)';
COMMENT ON COLUMN product_description_components.is_active IS 'Whether component is visible to customers';

