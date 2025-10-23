-- Create refunds table for Phase 3 implementation
CREATE TABLE IF NOT EXISTS refunds (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
  refund_transaction_id VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  initiated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  CONSTRAINT refunds_amount_check CHECK (amount > 0)
);

-- Add initiated_by column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'refunds' AND column_name = 'initiated_by') THEN
        ALTER TABLE refunds ADD COLUMN initiated_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON refunds(created_at);
CREATE INDEX IF NOT EXISTS idx_refunds_initiated_by ON refunds(initiated_by);

-- Add refund tracking to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) DEFAULT 'none' CHECK (refund_status IN ('none', 'partial', 'full'));

-- Add refund tracking to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) DEFAULT 'none' CHECK (refund_status IN ('none', 'partial', 'full'));

-- Comments
COMMENT ON TABLE refunds IS 'Refund records for orders and payments';
COMMENT ON COLUMN refunds.order_id IS 'Order being refunded';
COMMENT ON COLUMN refunds.payment_id IS 'Payment being refunded';
COMMENT ON COLUMN refunds.refund_transaction_id IS 'External refund transaction ID (e.g., PayPal refund ID)';
COMMENT ON COLUMN refunds.amount IS 'Refund amount';
COMMENT ON COLUMN refunds.reason IS 'Reason for refund';
COMMENT ON COLUMN refunds.status IS 'Refund processing status';
COMMENT ON COLUMN refunds.initiated_by IS 'Admin user who initiated the refund';
COMMENT ON COLUMN payments.refunded_amount IS 'Total amount refunded for this payment';
COMMENT ON COLUMN payments.refund_status IS 'Refund status of the payment';
COMMENT ON COLUMN orders.refund_status IS 'Refund status of the order';
