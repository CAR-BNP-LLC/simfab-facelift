-- Shopping cart system with support for guest and logged-in users
-- Stores complex product configurations

CREATE TABLE IF NOT EXISTS carts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
  CONSTRAINT carts_user_or_session_check CHECK (
    (user_id IS NOT NULL) OR (session_id IS NOT NULL)
  )
);

-- Cart items with product configuration
CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  configuration JSONB DEFAULT '{}',
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT cart_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT cart_items_price_check CHECK (unit_price >= 0 AND total_price >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_session_id ON carts(session_id);
CREATE INDEX IF NOT EXISTS idx_carts_expires_at ON carts(expires_at);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_configuration ON cart_items USING GIN (configuration);

-- Trigger for cart updated_at
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_carts_updated_at'
  ) THEN
    CREATE TRIGGER update_carts_updated_at
        BEFORE UPDATE ON carts
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Trigger for cart_items updated_at
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_cart_items_updated_at'
  ) THEN
    CREATE TRIGGER update_cart_items_updated_at
        BEFORE UPDATE ON cart_items
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Function to automatically update cart's updated_at when items change
CREATE OR REPLACE FUNCTION update_cart_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.cart_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update cart timestamp when items are added/updated
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_cart_on_item_change'
  ) THEN
    CREATE TRIGGER update_cart_on_item_change
      AFTER INSERT OR UPDATE ON cart_items
      FOR EACH ROW
      EXECUTE FUNCTION update_cart_timestamp();
  END IF;
END $$;

COMMENT ON TABLE carts IS 'Shopping carts for guest and logged-in users';
COMMENT ON TABLE cart_items IS 'Items in shopping cart with configuration';
COMMENT ON COLUMN carts.session_id IS 'Session ID for guest users';
COMMENT ON COLUMN carts.expires_at IS 'Cart expiration timestamp (7 days default)';
COMMENT ON COLUMN cart_items.configuration IS 'Selected colors, variations, and add-ons in JSON';


