-- Migration 050: Add new product categories
-- Adds support for: conversion-kits, services, individual-parts, racing-flight-seats, refurbished
-- These categories are now valid in CSV imports and available in admin UI

-- This migration is informational/documentation only
-- The actual category validation happens in:
-- 1. CSVImportService.VALID_CATEGORIES (backend validation)
-- 2. ProductQueryBuilder.buildCategoriesQuery() (category queries)
-- 3. Admin UI dropdowns (frontend)

-- Categories are stored as JSON strings in products.categories column
-- No database schema changes needed - categories are validated at application level

-- New categories added:
-- - conversion-kits: Conversion kits for upgrading/modifying products
-- - services: Service offerings
-- - individual-parts: Individual replacement parts
-- - racing-flight-seats: Racing and flight simulator seats
-- - refurbished: Refurbished products

COMMENT ON COLUMN products.categories IS 'Product categories stored as JSON array. Valid categories: flight-sim, sim-racing, cockpits, monitor-stands, accessories, conversion-kits, services, individual-parts, racing-flight-seats, refurbished';

