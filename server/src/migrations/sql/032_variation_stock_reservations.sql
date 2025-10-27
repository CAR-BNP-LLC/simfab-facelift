-- Migration 032: Variation stock reservations
-- Track reservations per variation option for pending orders

-- Track reservations per variation option
CREATE TABLE IF NOT EXISTS variation_stock_reservations (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variation_option_id INTEGER NOT NULL REFERENCES variation_options(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired')),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT variation_stock_reservations_quantity_check CHECK (quantity > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_variation_reservations_order ON variation_stock_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_variation_reservations_option ON variation_stock_reservations(variation_option_id);
CREATE INDEX IF NOT EXISTS idx_variation_reservations_status ON variation_stock_reservations(status, expires_at);

COMMENT ON TABLE variation_stock_reservations IS 'Temporary stock holds for variation options in pending orders';
