-- Add shipping quotes and FedEx integration tables
-- Supports international shipping quotes with FedEx API integration

BEGIN;

-- Shipping quotes table for international orders requiring manual quote confirmation
CREATE TABLE IF NOT EXISTS shipping_quotes (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  country VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  city VARCHAR(100),
  postal_code VARCHAR(20),
  package_size VARCHAR(10) NOT NULL CHECK (package_size IN ('S', 'M', 'L')),
  estimated_weight DECIMAL(8,2),
  estimated_dimensions JSONB, -- {length, width, height}
  
  -- FedEx rate information
  fedex_list_rate DECIMAL(10,2), -- Standard FedEx rate
  fedex_negotiated_rate DECIMAL(10,2), -- Negotiated account rate (if available)
  fedex_applied_rate DECIMAL(10,2), -- Rate actually charged to customer (40% of list or negotiated)
  fedex_rate_discount_percent DECIMAL(5,2), -- Discount percentage applied (e.g., 60 for 40% off)
  fedex_service_type VARCHAR(100), -- FedEx service type used
  fedex_rate_data JSONB, -- Full FedEx API response for reference
  
  -- Quote management
  status VARCHAR(50) DEFAULT 'pending' CHECK (
    status IN ('pending', 'quoted', 'confirmed', 'cancelled')
  ),
  quoted_amount DECIMAL(10,2),
  quoted_by INTEGER REFERENCES users(id),
  quoted_at TIMESTAMP,
  quote_confirmation_number VARCHAR(255), -- FedEx quote confirmation or reference number
  expires_at TIMESTAMP,
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FedEx rate cache table to avoid excessive API calls
CREATE TABLE IF NOT EXISTS fedex_rate_cache (
  id SERIAL PRIMARY KEY,
  cache_key VARCHAR(255) UNIQUE NOT NULL, -- Hash of destination + package details
  destination_country VARCHAR(100) NOT NULL,
  destination_state VARCHAR(100),
  destination_postal_code VARCHAR(20),
  package_size VARCHAR(10) NOT NULL,
  package_weight DECIMAL(8,2),
  
  -- Cached rate data
  fedex_list_rate DECIMAL(10,2),
  fedex_negotiated_rate DECIMAL(10,2),
  fedex_rate_data JSONB, -- Full API response
  
  -- Cache management
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add shipping-related columns to orders table
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS shipping_quote_id INTEGER REFERENCES shipping_quotes(id),
  ADD COLUMN IF NOT EXISTS package_size VARCHAR(10) CHECK (package_size IN ('S', 'M', 'L')) DEFAULT 'M',
  ADD COLUMN IF NOT EXISTS fedex_rate_data JSONB,
  ADD COLUMN IF NOT EXISTS is_international_shipping BOOLEAN DEFAULT false;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shipping_quotes_order_id ON shipping_quotes(order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_quotes_status ON shipping_quotes(status);
CREATE INDEX IF NOT EXISTS idx_shipping_quotes_customer_email ON shipping_quotes(customer_email);
CREATE INDEX IF NOT EXISTS idx_shipping_quotes_country ON shipping_quotes(country);
CREATE INDEX IF NOT EXISTS idx_shipping_quotes_created_at ON shipping_quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fedex_rate_cache_key ON fedex_rate_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_fedex_rate_cache_expires_at ON fedex_rate_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_shipping_quote_id ON orders(shipping_quote_id);
CREATE INDEX IF NOT EXISTS idx_orders_package_size ON orders(package_size);
CREATE INDEX IF NOT EXISTS idx_orders_is_international_shipping ON orders(is_international_shipping);

-- Trigger for shipping_quotes updated_at
CREATE TRIGGER update_shipping_quotes_updated_at
    BEFORE UPDATE ON shipping_quotes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Cleanup function for expired rate cache (optional, can be called by cron)
CREATE OR REPLACE FUNCTION cleanup_expired_fedex_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM fedex_rate_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE shipping_quotes IS 'Stores shipping quotes for international orders, especially when FedEx negotiated rates are not available';
COMMENT ON TABLE fedex_rate_cache IS 'Caches FedEx API rate responses to reduce API calls for same destination/package combinations';
COMMENT ON COLUMN orders.package_size IS 'Package size (S/M/L) used for shipping calculation';
COMMENT ON COLUMN orders.fedex_rate_data IS 'Stores FedEx API rate response data for the order';
COMMENT ON COLUMN orders.is_international_shipping IS 'Indicates if order uses international shipping (FedEx)';

COMMIT;

