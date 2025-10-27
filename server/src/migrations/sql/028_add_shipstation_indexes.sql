-- ShipStation Integration Database Optimization
-- Add indexes for efficient order queries used by ShipStation

-- Index for ShipStation order export queries
-- Optimizes queries filtering by payment_status and date range
CREATE INDEX IF NOT EXISTS idx_orders_shipstation_export 
ON orders (payment_status, created_at) 
WHERE payment_status = 'paid';

-- Index for order number lookups (used in shipment updates)
CREATE INDEX IF NOT EXISTS idx_orders_number_shipstation 
ON orders (order_number) 
WHERE payment_status = 'paid';

-- Index for order status history queries
CREATE INDEX IF NOT EXISTS idx_order_status_history_shipstation 
ON order_status_history (order_id, created_at DESC);

-- Add metadata column to orders if it doesn't exist (for ShipStation tracking data)
-- This is already handled in the main orders table creation, but ensuring it exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE orders ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Add comment to orders table for ShipStation integration
COMMENT ON TABLE orders IS 'Orders table with ShipStation integration support';
COMMENT ON COLUMN orders.metadata IS 'JSONB field for storing ShipStation tracking data and other metadata';
COMMENT ON COLUMN orders.tracking_number IS 'Tracking number from ShipStation or other carriers';
COMMENT ON COLUMN orders.carrier IS 'Carrier name from ShipStation or other shipping providers';
