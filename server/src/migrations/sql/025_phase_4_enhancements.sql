-- Phase 4 enhancements: Advanced refunds, analytics, and performance optimization

-- Create refund_items table for item-specific refunds
CREATE TABLE IF NOT EXISTS refund_items (
  id SERIAL PRIMARY KEY,
  refund_id INTEGER NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
  order_item_id INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT refund_items_quantity_check CHECK (quantity > 0)
);

-- Create refund_logs table for detailed refund tracking
CREATE TABLE IF NOT EXISTS refund_logs (
  id SERIAL PRIMARY KEY,
  refund_id INTEGER NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create performance_metrics table for monitoring (if not exists)
CREATE TABLE IF NOT EXISTS performance_metrics (
  id SERIAL PRIMARY KEY,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(15,4) NOT NULL,
  metric_unit VARCHAR(20),
  category VARCHAR(50),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add category column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'performance_metrics' AND column_name = 'category') THEN
        ALTER TABLE performance_metrics ADD COLUMN category VARCHAR(50);
    END IF;
END $$;

-- Create optimization_recommendations table
CREATE TABLE IF NOT EXISTS optimization_recommendations (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  expected_improvement VARCHAR(200),
  implementation_effort VARCHAR(20),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  implemented_at TIMESTAMP
);

-- Add additional columns to refunds table for Phase 4
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS refund_type VARCHAR(20) DEFAULT 'full' CHECK (refund_type IN ('full', 'partial', 'item_specific'));
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS reason_code VARCHAR(50);
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS notify_customer BOOLEAN DEFAULT FALSE;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS estimated_processing_time VARCHAR(50);
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS customer_notification_sent BOOLEAN DEFAULT FALSE;

-- Add performance tracking columns to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS processing_start_time TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS processing_end_time TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS webhook_attempts INTEGER DEFAULT 0;

-- Add performance tracking columns to webhook_events table
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS processing_start_time TIMESTAMP;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS processing_end_time TIMESTAMP;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_refund_items_refund_id ON refund_items(refund_id);
CREATE INDEX IF NOT EXISTS idx_refund_items_order_item_id ON refund_items(order_item_id);
CREATE INDEX IF NOT EXISTS idx_refund_logs_refund_id ON refund_logs(refund_id);
CREATE INDEX IF NOT EXISTS idx_refund_logs_action ON refund_logs(action);
CREATE INDEX IF NOT EXISTS idx_refund_logs_created_at ON refund_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_category ON performance_metrics(category);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_recorded_at ON performance_metrics(recorded_at);

CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_category ON optimization_recommendations(category);
CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_priority ON optimization_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_status ON optimization_recommendations(status);

-- Add indexes for performance monitoring
CREATE INDEX IF NOT EXISTS idx_payments_processing_times ON payments(processing_start_time, processing_end_time);
CREATE INDEX IF NOT EXISTS idx_payments_retry_count ON payments(retry_count);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processing_times ON webhook_events(processing_start_time, processing_end_time);
CREATE INDEX IF NOT EXISTS idx_webhook_events_retry_count ON webhook_events(retry_count);

-- Add indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_refunds_reason_code ON refunds(reason_code);
CREATE INDEX IF NOT EXISTS idx_refunds_refund_type ON refunds(refund_type);
CREATE INDEX IF NOT EXISTS idx_refunds_notify_customer ON refunds(notify_customer);

-- Comments for documentation
COMMENT ON TABLE refund_items IS 'Item-specific refund details for partial refunds';
COMMENT ON TABLE refund_logs IS 'Detailed log of refund actions and changes';
COMMENT ON TABLE performance_metrics IS 'System performance metrics for monitoring';
COMMENT ON TABLE optimization_recommendations IS 'Performance optimization recommendations';

COMMENT ON COLUMN refunds.refund_type IS 'Type of refund: full, partial, or item_specific';
COMMENT ON COLUMN refunds.reason_code IS 'Standardized reason code for refund categorization';
COMMENT ON COLUMN refunds.notify_customer IS 'Whether customer was notified of refund';
COMMENT ON COLUMN refunds.estimated_processing_time IS 'Estimated time for refund processing';
COMMENT ON COLUMN refunds.customer_notification_sent IS 'Whether customer notification was sent';

COMMENT ON COLUMN payments.processing_start_time IS 'When payment processing started';
COMMENT ON COLUMN payments.processing_end_time IS 'When payment processing completed';
COMMENT ON COLUMN payments.retry_count IS 'Number of payment retry attempts';
COMMENT ON COLUMN payments.webhook_attempts IS 'Number of webhook delivery attempts';

COMMENT ON COLUMN webhook_events.processing_start_time IS 'When webhook processing started';
COMMENT ON COLUMN webhook_events.processing_end_time IS 'When webhook processing completed';
COMMENT ON COLUMN webhook_events.retry_count IS 'Number of webhook retry attempts';
COMMENT ON COLUMN webhook_events.error_message IS 'Error message if webhook processing failed';
