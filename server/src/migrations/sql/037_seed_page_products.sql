-- ============================================================================
-- Page Products Seed Data Migration
-- Migration: 037_seed_page_products.sql
-- Description: Seeds initial page products based on current hardcoded data
-- Note: This assumes products already exist in the database
-- ============================================================================

-- Seed data for Sim Racing page (/sim-racing)
-- Note: These product IDs should be updated to match actual products in your database
-- For now, we'll use placeholders that should be updated after products are created

-- Sim Racing Base Models Section
-- You'll need to update these product IDs after checking your products table
-- Example: INSERT INTO page_products (page_route, page_section, product_id, display_order, is_active, display_type)
-- VALUES ('/sim-racing', 'base-models', [ACTUAL_PRODUCT_ID_1], 1, true, 'products');

-- Flight Sim page (/flight-sim)
-- Flight Sim Base Models Section
-- INSERT INTO page_products (page_route, page_section, product_id, display_order, is_active, display_type)
-- VALUES ('/flight-sim', 'base-models', [ACTUAL_PRODUCT_ID], 1, true, 'products');

-- Monitor Stands page (/monitor-stands)
-- Main Products Section
-- INSERT INTO page_products (page_route, page_section, product_id, display_order, is_active, display_type)
-- VALUES ('/monitor-stands', 'main-products', [ACTUAL_PRODUCT_ID], 1, true, 'products');

-- Add-Ons Section
-- INSERT INTO page_products (page_route, page_section, product_id, display_order, is_active, display_type)
-- VALUES ('/monitor-stands', 'add-ons', [ACTUAL_PRODUCT_ID], 1, true, 'products');

-- Homepage Sections
-- Sim Racing Section
-- INSERT INTO page_products (page_route, page_section, product_id, display_order, is_active, display_type)
-- VALUES ('homepage', 'sim-racing-section', [ACTUAL_PRODUCT_ID], 1, true, 'products');

-- Flight Sim Section
-- INSERT INTO page_products (page_route, page_section, product_id, display_order, is_active, display_type)
-- VALUES ('homepage', 'flight-sim-section', [ACTUAL_PRODUCT_ID], 1, true, 'products');

-- Monitor Stands Section
-- INSERT INTO page_products (page_route, page_section, product_id, display_order, is_active, display_type)
-- VALUES ('homepage', 'monitor-stands-section', [ACTUAL_PRODUCT_ID], 1, true, 'products');

-- Helper query to find products by name (run this to get actual IDs):
-- SELECT id, name, slug FROM products WHERE name ILIKE '%GEN3%' OR name ILIKE '%Modular Racing%';

-- Note: This migration creates the structure but doesn't insert actual data
-- because we don't know the product IDs. A better approach would be to:
-- 1. Create products first (if they don't exist)
-- 2. Run a script to map products by name/slug
-- 3. Insert the mappings into page_products

-- For now, we'll insert dummy/placeholder records that can be updated via admin:
-- This allows the system to work immediately, and admins can update via the UI

COMMENT ON TABLE page_products IS 'Seed data will be populated after products are identified. Use admin UI to configure page products.';


