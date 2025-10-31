-- Add status column to carts table
-- This allows us to track cart state during checkout process

ALTER TABLE carts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Add index for status lookups
CREATE INDEX IF NOT EXISTS idx_carts_status ON carts(status);

-- Add comment for documentation
COMMENT ON COLUMN carts.status IS 'Cart status: active, checkout, converted, expired';

-- Update existing carts to have 'active' status
UPDATE carts SET status = 'active' WHERE status IS NULL;
