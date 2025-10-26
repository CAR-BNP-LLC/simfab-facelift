-- Payment Security Enhancements
-- Add constraints and indexes to prevent race conditions and duplicate payments

-- Clean up duplicate pending payments before creating unique constraint
DELETE FROM payments 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM payments 
  WHERE status IN ('pending', 'processing')
  GROUP BY order_id
);

-- Add unique constraint on transaction_id to prevent duplicate PayPal payments
ALTER TABLE payments ADD CONSTRAINT payments_transaction_id_unique UNIQUE (transaction_id);

-- Add index for faster lookups on order_id and status
CREATE INDEX IF NOT EXISTS idx_payments_order_id_status ON payments(order_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Add constraint to prevent multiple pending payments for the same order
-- This will be enforced at the application level, but we can add a partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_order_pending_unique 
ON payments(order_id) 
WHERE status IN ('pending', 'processing');

-- Add updated_at column if it doesn't exist
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- Add metadata column for storing additional payment information
ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add failure_reason column if it doesn't exist
ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Add completed_at column if it doesn't exist
ALTER TABLE payments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Add comments for documentation
COMMENT ON TABLE payments IS 'Payment transactions with comprehensive security constraints';
COMMENT ON COLUMN payments.transaction_id IS 'Unique PayPal transaction ID - prevents duplicate payments';
COMMENT ON COLUMN payments.status IS 'Payment status: pending, processing, completed, failed, refunded, cancelled';
COMMENT ON COLUMN payments.metadata IS 'Additional payment data (PayPal response, etc.)';
COMMENT ON COLUMN payments.failure_reason IS 'Reason for payment failure if applicable';
COMMENT ON COLUMN payments.completed_at IS 'Timestamp when payment was completed';
COMMENT ON COLUMN payments.updated_at IS 'Timestamp when payment record was last updated';
