-- ============================================================================
-- SimFab Sample Products Seed Script
-- Run this to quickly populate your database with test data
-- ============================================================================

-- Usage:
-- psql simfab_dev < seed-sample-products.sql

BEGIN;

-- ============================================================================
-- PRODUCT 1: Flight Sim Trainer Station (Full Configuration)
-- ============================================================================

INSERT INTO products (
  sku, name, slug, description, short_description, type, status, featured,
  regular_price, weight_lbs, length_in, width_in, height_in,
  stock_quantity, low_stock_threshold, manage_stock, allow_backorders,
  requires_shipping, categories, tags,
  seo_title, seo_description
) VALUES (
  'FS-TRAINER-001',
  'SimFab Flight Sim Trainer Station',
  'flight-sim-trainer-station',
  'SimFab''s Trainer Station is focused on providing precise and exact replication of popular aircrafts with true to life controls placement in an ergonomically correct framework. The Trainer Station is designed for use with Microsoft Flight Simulator, X-Plane, Prepar3D, and other flight simulation software. Features include modular design, adjustable seating, and compatibility with all major flight controllers.',
  'Your Gateway to Precision Aviation Training',
  'configurable',
  'active',
  true,
  999.00,
  73.6, 37, 23, 16,
  15, 5, true, false,
  true,
  '["flight-sim", "cockpits", "trainer-stations"]'::jsonb,
  '["best-seller", "modular", "customizable", "professional"]'::jsonb,
  'SimFab Flight Sim Trainer Station - Professional Aviation Simulator',
  'Experience precision aviation training with SimFab''s modular Flight Sim Trainer Station. Customizable, ergonomic design for serious flight simulation enthusiasts.'
) RETURNING id;

-- Store product ID for use in subsequent inserts
-- (Replace '1' with actual ID if needed)

-- Colors for Flight Sim Trainer
INSERT INTO product_colors (product_id, color_name, color_code, is_available, sort_order) VALUES
(1, 'Black', '#000000', true, 0),
(1, 'Blue', '#0066CC', true, 1),
(1, 'Gray', '#808080', true, 2),
(1, 'Olive Green', '#556B2F', true, 3);

-- Model Variation (Required)
INSERT INTO product_variations (product_id, variation_type, name, description, is_required, sort_order)
VALUES (1, 'model', 'Base Configuration', 'Choose your base cockpit configuration', true, 0)
RETURNING id;

-- Model Options
INSERT INTO variation_options (variation_id, option_name, option_value, price_adjustment, is_default, sort_order)
VALUES 
(1, 'Base Cockpit Configuration', 'base', 0, true, 0),
(1, 'Pro Cockpit Configuration', 'pro', 200, false, 1);

-- Rudder Pedals Variation (Required Dropdown)
INSERT INTO product_variations (product_id, variation_type, name, description, is_required, sort_order)
VALUES (1, 'dropdown', 'What rudder pedals are you using?', 'Select your rudder pedal type', true, 1)
RETURNING id;

-- Rudder Options
INSERT INTO variation_options (variation_id, option_name, option_value, price_adjustment, is_default, sort_order)
VALUES 
(2, 'Standard Rudder Pedals', 'standard', 0, true, 0),
(2, 'Premium Rudder Pedals', 'premium', 150, false, 1),
(2, 'Custom Rudder Pedals', 'custom', 300, false, 2);

-- Yoke Variation (Optional Dropdown)
INSERT INTO product_variations (product_id, variation_type, name, description, is_required, sort_order)
VALUES (1, 'dropdown', 'What yoke are you using?', 'Select your yoke type', false, 2)
RETURNING id;

-- Yoke Options
INSERT INTO variation_options (variation_id, option_name, option_value, price_adjustment, is_default, sort_order)
VALUES 
(3, 'No Yoke', 'none', 0, true, 0),
(3, 'Basic Yoke', 'basic', 100, false, 1),
(3, 'Advanced Yoke', 'advanced', 250, false, 2),
(3, 'Professional Yoke', 'professional', 500, false, 3);

-- Throttle Quadrant Variation (Optional Dropdown)
INSERT INTO product_variations (product_id, variation_type, name, description, is_required, sort_order)
VALUES (1, 'dropdown', 'What throttle quadrant are you using?', 'Select your throttle setup', false, 3)
RETURNING id;

-- Throttle Options
INSERT INTO variation_options (variation_id, option_name, option_value, price_adjustment, is_default, sort_order)
VALUES 
(4, 'No Throttle', 'none', 0, true, 0),
(4, 'Single Throttle', 'single', 80, false, 1),
(4, 'Dual Throttle', 'dual', 180, false, 2),
(4, 'Quad Throttle', 'quad', 350, false, 3);

-- Add-on: Articulating Arm (Optional with options)
INSERT INTO product_addons (product_id, name, description, is_required, has_options, sort_order)
VALUES (1, 'Active Articulating Arm with Keyboard & Mouse or Laptop Tray kit', 'Adjustable arm for keyboard and mouse positioning', false, true, 0)
RETURNING id;

-- Articulating Arm Options
INSERT INTO addon_options (addon_id, name, description, price, is_available, sort_order)
VALUES 
(1, 'Keyboard & Mouse Tray', 'Standard keyboard and mouse tray', 199.00, true, 0),
(1, 'Laptop Tray', 'Laptop mounting tray', 229.00, true, 1);

-- Add-on: Monitor Stand (Optional without options)
INSERT INTO product_addons (product_id, name, description, base_price, is_required, has_options, sort_order)
VALUES (1, 'Triple Monitor Stand', 'Heavy-duty triple monitor mounting system', 399.00, false, false, 1);

-- FAQs
INSERT INTO product_faqs (product_id, question, answer, sort_order) VALUES
(1, 'Can you use the Triple Monitor Stand for bigger monitors?', 'The Triple Monitor Stand can support monitors up to 55 inches with a maximum weight of 35 lbs per monitor. For larger setups, we recommend our heavy-duty mounting brackets.', 0),
(1, 'What is the weight capacity of the seat?', 'The seat is rated for users up to 300 lbs. The heavy-duty construction ensures long-lasting durability.', 1),
(1, 'Is assembly required?', 'Yes, some assembly is required. We provide detailed assembly manuals and video guides. Most customers complete assembly in 2-3 hours.', 2);

-- ============================================================================
-- PRODUCT 2: Gen3 Racing Modular Cockpit
-- ============================================================================

INSERT INTO products (
  sku, name, slug, description, short_description, type, status, featured,
  regular_price, weight_lbs, stock_quantity, categories, tags,
  seo_title, seo_description
) VALUES (
  'SR-RACING-001',
  'Gen3 Racing Modular Cockpit',
  'gen3-racing-cockpit',
  'Professional sim racing cockpit with adjustable seating position and modular design. Compatible with all major racing wheels including Logitech, Thrustmaster, and Fanatec. Features include quick-release wheel mount, adjustable pedal plate, and reinforced steel construction.',
  'The Ultimate Racing Experience',
  'configurable',
  'active',
  true,
  799.00,
  65.0,
  10,
  '["sim-racing", "cockpits"]'::jsonb,
  '["racing", "modular", "featured", "professional"]'::jsonb,
  'Gen3 Racing Modular Cockpit - Professional Sim Racing Setup',
  'Experience the ultimate in sim racing with our Gen3 Modular Cockpit. Professional-grade construction for serious racers.'
);

-- Colors for Racing Cockpit
INSERT INTO product_colors (product_id, color_name, color_code, is_available, sort_order) VALUES
(2, 'Black', '#000000', true, 0),
(2, 'Red', '#CC0000', true, 1),
(2, 'White', '#FFFFFF', true, 2);

-- Racing Seat Options
INSERT INTO product_variations (product_id, variation_type, name, description, is_required, sort_order)
VALUES (2, 'dropdown', 'Racing Seat Type', 'Choose your preferred racing seat', true, 0)
RETURNING id;

INSERT INTO variation_options (variation_id, option_name, option_value, price_adjustment, is_default, sort_order)
VALUES 
(5, 'Standard Racing Seat', 'standard', 0, true, 0),
(5, 'Premium Bucket Seat', 'premium', 200, false, 1),
(5, 'Pro Carbon Fiber Seat', 'carbon', 500, false, 2);

-- Wheel Mount Options
INSERT INTO product_variations (product_id, variation_type, name, description, is_required, sort_order)
VALUES (2, 'dropdown', 'Wheel Mount System', 'Select wheel mounting system', true, 1)
RETURNING id;

INSERT INTO variation_options (variation_id, option_name, option_value, price_adjustment, is_default, sort_order)
VALUES 
(6, 'Standard Mount', 'standard', 0, true, 0),
(6, 'Quick Release Mount', 'quick-release', 150, false, 1);

-- ============================================================================
-- PRODUCT 3: Single Monitor Stand (Simple Product)
-- ============================================================================

INSERT INTO products (
  sku, name, slug, description, short_description, type, status, featured,
  regular_price, sale_price, stock_quantity, categories, tags,
  seo_title
) VALUES (
  'ACC-MONITOR-001',
  'SimFab Single Monitor Mount Stand',
  'single-monitor-stand',
  'Adjustable monitor mount for single display setups. Compatible with most VESA monitor mounts (75x75mm and 100x100mm). Heavy-duty construction supports monitors up to 32 inches and 25 lbs. Features height, tilt, and swivel adjustments.',
  'Professional Monitor Mounting Solution',
  'simple',
  'active',
  false,
  219.00,
  199.00,
  25,
  '["monitor-stands", "accessories"]'::jsonb,
  '["monitor", "mount", "sale", "vesa"]'::jsonb,
  'SimFab Single Monitor Mount Stand - VESA Compatible'
);

-- ============================================================================
-- PRODUCT 4: Articulating Keyboard Arm (Standalone Accessory)
-- ============================================================================

INSERT INTO products (
  sku, name, slug, description, short_description, type, status, featured,
  regular_price, stock_quantity, categories, tags
) VALUES (
  'ACC-ARM-001',
  'Active Articulating Arm with Keyboard Tray',
  'articulating-keyboard-arm',
  'Professional-grade articulating arm for keyboard and mouse positioning. Features gas-spring assisted adjustment, 360-degree rotation, and smooth gliding motion. Compatible with all SimFab cockpits.',
  'Ergonomic Keyboard Positioning',
  'variable',
  'active',
  false,
  199.00,
  20,
  '["accessories", "keyboard-arms"]'::jsonb,
  '["ergonomic", "adjustable", "accessory"]'::jsonb
);

-- Keyboard Arm Options
INSERT INTO product_variations (product_id, variation_type, name, description, is_required, sort_order)
VALUES (4, 'dropdown', 'Tray Type', 'Select tray configuration', true, 0)
RETURNING id;

INSERT INTO variation_options (variation_id, option_name, option_value, price_adjustment, is_default, sort_order)
VALUES 
(7, 'Keyboard & Mouse Tray', 'keyboard-mouse', 0, true, 0),
(7, 'Laptop Tray', 'laptop', 30, false, 1);

-- ============================================================================
-- PRODUCT 5: Racing Seat Cushion (Simple Product)
-- ============================================================================

INSERT INTO products (
  sku, name, slug, description, short_description, type, status,
  regular_price, stock_quantity, categories, tags
) VALUES (
  'ACC-CUSHION-001',
  'Racing Seat Cushion Set',
  'racing-seat-cushion',
  'Premium memory foam cushion set designed for extended racing sessions. Includes lumbar support and seat cushion. Breathable mesh fabric keeps you cool during intense races.',
  'Comfort for Extended Sessions',
  'simple',
  'active',
  79.99,
  50,
  '["accessories", "comfort"]'::jsonb,
  '["comfort", "cushion", "racing"]'::jsonb
);

-- ============================================================================
-- PRODUCT 6: Flight Sim Rudder Pedals (Out of Stock Example)
-- ============================================================================

INSERT INTO products (
  sku, name, slug, description, short_description, type, status,
  regular_price, stock_quantity, categories, tags
) VALUES (
  'FS-RUDDER-001',
  'Professional Flight Sim Rudder Pedals',
  'pro-rudder-pedals',
  'High-precision rudder pedals with adjustable tension and self-centering mechanism. Metal construction with realistic resistance.',
  'Precision Rudder Control',
  'simple',
  'active',
  299.00,
  0,
  '["flight-sim", "accessories"]'::jsonb,
  '["rudder", "pedals", "out-of-stock"]'::jsonb
);

-- ============================================================================
-- Update price ranges for configurable products
-- ============================================================================

-- Update Flight Sim Trainer price range
UPDATE products 
SET price_min = 999.00, price_max = 2747.00 
WHERE id = 1;
-- Calculation: 999 (base) + 500 (max variation) + 350 (max throttle) + 500 (addon arm) + 399 (monitor) = 2747

-- Update Racing Cockpit price range
UPDATE products 
SET price_min = 799.00, price_max = 1649.00 
WHERE id = 2;
-- Calculation: 799 (base) + 500 (carbon seat) + 150 (quick release) = 1449

COMMIT;

-- ============================================================================
-- Verify Data
-- ============================================================================

-- Count products
SELECT COUNT(*) as total_products FROM products;

-- Count colors
SELECT COUNT(*) as total_colors FROM product_colors;

-- Count variations
SELECT COUNT(*) as total_variations FROM product_variations;

-- Count variation options
SELECT COUNT(*) as total_options FROM variation_options;

-- Count addons
SELECT COUNT(*) as total_addons FROM product_addons;

-- Show products summary
SELECT 
  id,
  sku,
  name,
  regular_price,
  stock_quantity,
  status,
  featured,
  array_length(categories::text[]::text[], 1) as category_count
FROM products
ORDER BY id;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT '✅ Sample products created successfully!' as status;
SELECT '📦 You now have 6 sample products with full configurations' as info;
SELECT '🚀 Test at: http://localhost:5173/shop' as next_step;

