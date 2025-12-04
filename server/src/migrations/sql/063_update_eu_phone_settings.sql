-- Migration: 063_update_eu_phone_settings.sql
-- Purpose: Update EU phone number settings
-- Date: 2025

-- Update EU phone number
UPDATE region_settings
SET setting_value = '+359 88 930 6855'
WHERE region = 'eu' AND setting_key = 'phone_number';

-- Update EU phone display text
UPDATE region_settings
SET setting_value = 'EU Support: +359 88 930 6855'
WHERE region = 'eu' AND setting_key = 'phone_display';

