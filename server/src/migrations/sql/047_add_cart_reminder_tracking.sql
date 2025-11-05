-- Add columns to track cart reminder emails sent
ALTER TABLE carts 
  ADD COLUMN IF NOT EXISTS reminder_1day_sent_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS reminder_7days_sent_at TIMESTAMP;

-- Add indexes for efficient querying
-- Note: Cannot use NOW() in index predicate (must be IMMUTABLE)
-- We'll filter expires_at > NOW() in the actual queries instead
CREATE INDEX IF NOT EXISTS idx_carts_reminder_1day_check 
  ON carts(updated_at) 
  WHERE reminder_1day_sent_at IS NULL 
    AND status != 'converted';

CREATE INDEX IF NOT EXISTS idx_carts_reminder_7days_check 
  ON carts(updated_at) 
  WHERE reminder_7days_sent_at IS NULL 
    AND status != 'converted';

COMMENT ON COLUMN carts.reminder_1day_sent_at IS 'Timestamp when 1-day cart reminder email was sent';
COMMENT ON COLUMN carts.reminder_7days_sent_at IS 'Timestamp when 7-day cart reminder email was sent';

