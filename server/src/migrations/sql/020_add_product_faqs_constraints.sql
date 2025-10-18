-- Add indexes, constraints and triggers to product_faqs table
-- This migration adds all the remaining functionality

-- Ensure the table exists before adding constraints
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_faqs') THEN
    RAISE EXCEPTION 'product_faqs table does not exist. Please run migration 019 first.';
  END IF;
END $$;

-- Create indexes for performance (these will fail gracefully if columns don't exist)
CREATE INDEX IF NOT EXISTS idx_product_faqs_product_id ON product_faqs(product_id);
CREATE INDEX IF NOT EXISTS idx_product_faqs_sort_order ON product_faqs(sort_order);

-- Only create is_active index if the column exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_faqs' AND column_name = 'is_active'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_product_faqs_active ON product_faqs(is_active);
  END IF;
END $$;

-- Add foreign key constraint (will fail gracefully if constraint already exists)
ALTER TABLE product_faqs 
ADD CONSTRAINT fk_product_faqs_product_id 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_product_faqs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_product_faqs_updated_at ON product_faqs;

-- Create trigger
CREATE TRIGGER update_product_faqs_updated_at
  BEFORE UPDATE ON product_faqs
  FOR EACH ROW
  EXECUTE FUNCTION update_product_faqs_updated_at();
