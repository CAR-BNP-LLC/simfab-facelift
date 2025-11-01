-- Migration 999: Drop product addons tables
-- This migration removes the product addons system in favor of the bundle items system
-- Bundle items provide more flexibility and better integration with the product catalog

-- Drop addon_options table first (due to foreign key dependency)
DROP TABLE IF EXISTS addon_options CASCADE;

-- Drop product_addons table
DROP TABLE IF EXISTS product_addons CASCADE;

-- Note: The bundle items system (migration 031) has replaced addons functionality
-- Optional bundle items can serve the same purpose with better product integration

