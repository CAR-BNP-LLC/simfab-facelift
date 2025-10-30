-- Add indexes for analytics performance
-- Migration: 038_add_analytics_indexes.sql

-- Index for time-series queries on orders (most important for analytics)
CREATE INDEX IF NOT EXISTS idx_orders_created_at_payment_status
ON orders(created_at, payment_status);

-- Index for time-series queries on order items (for product analytics)
CREATE INDEX IF NOT EXISTS idx_order_items_created_at
ON order_items(created_at);

-- Composite index for order analytics queries
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at
ON orders(status, created_at);

-- Index for user analytics queries
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at
ON orders(user_id, created_at);

-- Index for payment analytics
CREATE INDEX IF NOT EXISTS idx_orders_payment_status_created_at
ON orders(payment_status, created_at);

-- Index for product analytics (join between order_items and orders)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id_product_name
ON order_items(order_id, product_name);

-- Index for filtering by product status in analytics
CREATE INDEX IF NOT EXISTS idx_products_status_created_at
ON products(status, created_at);

-- Index for stock analytics
CREATE INDEX IF NOT EXISTS idx_products_stock_status
ON products(stock, status) WHERE status = 'active';

-- Comments for documentation
COMMENT ON INDEX idx_orders_created_at_payment_status IS 'Optimizes revenue time-series queries';
COMMENT ON INDEX idx_order_items_created_at IS 'Optimizes product analytics time-series queries';
COMMENT ON INDEX idx_orders_status_created_at IS 'Optimizes order status distribution queries';
COMMENT ON INDEX idx_orders_user_id_created_at IS 'Optimizes customer analytics queries';
COMMENT ON INDEX idx_orders_payment_status_created_at IS 'Optimizes payment analytics queries';
COMMENT ON INDEX idx_order_items_order_id_product_name IS 'Optimizes top products queries';
COMMENT ON INDEX idx_products_status_created_at IS 'Optimizes product inventory analytics';
COMMENT ON INDEX idx_products_stock_status IS 'Optimizes low stock alerts';
