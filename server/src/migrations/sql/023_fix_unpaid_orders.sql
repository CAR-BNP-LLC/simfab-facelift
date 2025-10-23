-- Stock reservations and webhook events tables
-- Fixes for unpaid order issues

-- Stock reservations table
CREATE TABLE IF NOT EXISTS stock_reservations (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT stock_reservations_quantity_check CHECK (quantity > 0),
  CONSTRAINT stock_reservations_status_check CHECK (
    status IN ('pending', 'confirmed', 'cancelled', 'expired')
  )
);

-- Webhook events logging table
CREATE TABLE IF NOT EXISTS webhook_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_reservations_order_id ON stock_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_product_id ON stock_reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_status ON stock_reservations(status);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_expires_at ON stock_reservations(expires_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at ON webhook_events(processed_at);

-- Add order status for better tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_reserved BOOLEAN DEFAULT FALSE;

-- Comments
COMMENT ON TABLE stock_reservations IS 'Temporary stock reservations for pending orders';
COMMENT ON TABLE webhook_events IS 'PayPal webhook events logging';
COMMENT ON COLUMN stock_reservations.status IS 'Reservation status: pending, confirmed, cancelled, expired';
COMMENT ON COLUMN stock_reservations.expires_at IS 'When the reservation expires (default 30 minutes)';
COMMENT ON COLUMN orders.payment_expires_at IS 'When payment must be completed by';
COMMENT ON COLUMN orders.stock_reserved IS 'Whether stock has been reserved for this order';
