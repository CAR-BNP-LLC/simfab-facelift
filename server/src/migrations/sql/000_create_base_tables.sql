-- Create base tables that must exist before enhancements
-- This includes the initial users, products, and password_resets tables

-- Create users table (base structure from auth system)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create password_resets table
CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on token for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);

-- Create base products table (structure from database.ts)
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  type TEXT,
  sku TEXT UNIQUE NOT NULL,
  gtin_upc_ean_isbn TEXT,
  name TEXT NOT NULL,
  published TEXT,
  is_featured TEXT,
  visibility_in_catalog TEXT,
  short_description TEXT,
  description TEXT,
  date_sale_price_starts TEXT,
  date_sale_price_ends TEXT,
  tax_status TEXT,
  tax_class TEXT,
  in_stock TEXT,
  stock INTEGER DEFAULT 0,
  low_stock_amount INTEGER,
  backorders_allowed TEXT,
  sold_individually TEXT,
  weight_lbs REAL,
  length_in REAL,
  width_in REAL,
  height_in REAL,
  allow_customer_reviews TEXT,
  purchase_note TEXT,
  sale_price REAL,
  regular_price REAL,
  categories TEXT,
  tags TEXT,
  shipping_class TEXT,
  images TEXT,
  brands TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on SKU for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- Create user_sessions table for connect-pg-simple (session storage)
CREATE TABLE IF NOT EXISTS user_sessions (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

-- Create index on expire for session cleanup
CREATE INDEX IF NOT EXISTS idx_user_sessions_expire ON user_sessions(expire);

COMMENT ON TABLE users IS 'User accounts for authentication';
COMMENT ON TABLE password_resets IS 'Password reset tokens';
COMMENT ON TABLE products IS 'Product catalog base table';
COMMENT ON TABLE user_sessions IS 'Express session storage';

