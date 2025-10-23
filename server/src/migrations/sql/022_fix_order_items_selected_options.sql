-- Fix order_items table to include selected_options column
-- This migration adds the selected_options column that the OrderService expects

-- Add selected_options column to order_items table
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS selected_options JSONB DEFAULT '{}';

-- Update existing records to copy configuration to selected_options
UPDATE order_items 
SET selected_options = configuration 
WHERE selected_options IS NULL AND configuration IS NOT NULL;

-- Add comment to clarify the column purpose
COMMENT ON COLUMN order_items.selected_options IS 'Selected product options and configuration as JSONB';

-- Create index for performance if needed
CREATE INDEX IF NOT EXISTS idx_order_items_selected_options ON order_items USING GIN (selected_options);
