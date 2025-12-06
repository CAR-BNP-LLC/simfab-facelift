-- ============================================================================
-- Wishlist System Migration
-- Migration: 034_create_wishlist_tables.sql
-- Description: Creates tables for wishlist functionality with notifications
-- ============================================================================

-- Main wishlist table
CREATE TABLE IF NOT EXISTS wishlists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Notification preferences for this item
  notify_on_sale BOOLEAN DEFAULT true,
  notify_on_stock BOOLEAN DEFAULT true,
  
  -- Track notification history
  last_sale_notified_at TIMESTAMP,
  last_stock_notified_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one wishlist entry per user-product combination
  CONSTRAINT unique_user_product UNIQUE (user_id, product_id)
);

-- Wishlist notification log
CREATE TABLE IF NOT EXISTS wishlist_notifications (
  id SERIAL PRIMARY KEY,
  wishlist_id INTEGER NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  notification_type VARCHAR(20) NOT NULL,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP,
  email_log_id INTEGER REFERENCES email_logs(id),
  
  -- Product state at notification time
  product_price DECIMAL(10,2),
  product_sale_price DECIMAL(10,2),
  product_stock INTEGER,
  product_in_stock VARCHAR(1),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT wishlist_notifications_type_check CHECK (
    notification_type IN ('sale', 'stock')
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON wishlists(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_notify_sale ON wishlists(notify_on_sale, product_id) WHERE notify_on_sale = true;
CREATE INDEX IF NOT EXISTS idx_wishlists_notify_stock ON wishlists(notify_on_stock, product_id) WHERE notify_on_stock = true;
CREATE INDEX IF NOT EXISTS idx_wishlists_sale_check ON wishlists(notify_on_sale, product_id, last_sale_notified_at) WHERE notify_on_sale = true;
CREATE INDEX IF NOT EXISTS idx_wishlists_stock_check ON wishlists(notify_on_stock, product_id, last_stock_notified_at) WHERE notify_on_stock = true;

CREATE INDEX IF NOT EXISTS idx_wishlist_notifications_wishlist ON wishlist_notifications(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_notifications_type ON wishlist_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_wishlist_notifications_sent ON wishlist_notifications(email_sent, created_at);

-- Trigger for updated_at (assumes update_updated_at_column function exists)
-- Create function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_wishlists_updated_at'
  ) THEN
    CREATE TRIGGER update_wishlists_updated_at
      BEFORE UPDATE ON wishlists
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Comments
COMMENT ON TABLE wishlists IS 'User wishlist with notification preferences';
COMMENT ON TABLE wishlist_notifications IS 'Log of sent wishlist notifications';

