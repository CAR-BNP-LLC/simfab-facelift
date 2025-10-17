-- Migration 017: Refactor variations system
-- Drop product_colors table and update variation types

-- First, check if product_colors table has any data
DO $$
DECLARE
    color_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO color_count FROM product_colors;
    IF color_count > 0 THEN
        RAISE EXCEPTION 'product_colors table contains % rows. Please migrate data before dropping table.', color_count;
    END IF;
END $$;

-- Drop product_colors table and related indexes
DROP TABLE IF EXISTS product_colors CASCADE;

-- Update variation_type constraint to new types
ALTER TABLE product_variations DROP CONSTRAINT IF EXISTS product_variations_type_check;

ALTER TABLE product_variations
ADD CONSTRAINT product_variations_type_check 
CHECK (variation_type IN ('text', 'dropdown', 'image', 'boolean'));

-- Update any existing variations with old types to closest new type
UPDATE product_variations 
SET variation_type = CASE 
    WHEN variation_type = 'model' THEN 'image'
    WHEN variation_type = 'radio' THEN 'boolean'
    WHEN variation_type = 'select' THEN 'dropdown'
    WHEN variation_type = 'dropdown' THEN 'dropdown'
    ELSE 'dropdown' -- fallback for any other values
END
WHERE variation_type NOT IN ('text', 'dropdown', 'image', 'boolean');

-- Add comment for clarity
COMMENT ON COLUMN product_variations.variation_type IS 'Type: text, dropdown, image, boolean';

