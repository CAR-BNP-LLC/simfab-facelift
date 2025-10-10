-- Payment and shipment tracking tables

-- Payments table for transaction tracking
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_method VARCHAR(50) NOT NULL,
  payment_provider VARCHAR(50) DEFAULT 'paypal',
  transaction_id VARCHAR(255) UNIQUE,
  payment_token VARCHAR(255),
  payer_id VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'pending',
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  CONSTRAINT payments_status_check CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')
  ),
  CONSTRAINT payments_method_check CHECK (
    payment_method IN ('paypal', 'credit_card', 'debit_card', 'bank_transfer')
  )
);

-- Refunds table
CREATE TABLE IF NOT EXISTS refunds (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  refund_transaction_id VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  reason VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  CONSTRAINT refunds_status_check CHECK (
    status IN ('pending', 'processing', 'completed', 'failed')
  )
);

-- Shipments table for tracking
CREATE TABLE IF NOT EXISTS shipments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  carrier VARCHAR(100) NOT NULL,
  service_code VARCHAR(100),
  tracking_number VARCHAR(255) UNIQUE NOT NULL,
  tracking_url VARCHAR(500),
  label_url VARCHAR(500),
  shipping_cost DECIMAL(10,2),
  estimated_delivery TIMESTAMP,
  actual_delivery TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  shipped_at TIMESTAMP,
  CONSTRAINT shipments_status_check CHECK (
    status IN ('pending', 'label_created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned')
  )
);

-- Shipment tracking events
CREATE TABLE IF NOT EXISTS shipment_tracking_events (
  id SERIAL PRIMARY KEY,
  shipment_id INTEGER NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipment_tracking_events_shipment_id ON shipment_tracking_events(shipment_id);

COMMENT ON TABLE payments IS 'Payment transaction records';
COMMENT ON TABLE refunds IS 'Refund requests and processing';
COMMENT ON TABLE shipments IS 'Shipping information and tracking';
COMMENT ON TABLE shipment_tracking_events IS 'Detailed shipment tracking history';


