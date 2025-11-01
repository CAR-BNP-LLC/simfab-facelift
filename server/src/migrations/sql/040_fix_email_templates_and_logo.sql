-- Fix email templates: disable old order confirmation template and fix logo URL
-- This migration:
-- 1. Disables any customer email template with shipping_address/billing_address variables for order.created
-- 2. Ensures only the correct order_confirmation_customer template is active
-- 3. Fixes logo URL configuration

-- First, find and disable any templates that have the old format with shipping_address/billing_address
-- These templates would have those variables in their html_body
UPDATE email_templates 
SET is_active = false,
    updated_at = CURRENT_TIMESTAMP
WHERE trigger_event = 'order.created' 
  AND recipient_type = 'customer'
  AND (
    html_body LIKE '%{{shipping_address}}%' 
    OR html_body LIKE '%{{billing_address}}%'
    OR html_body LIKE '%Order Confirmed%'
    OR subject LIKE '%Order Confirmed%'
  )
  AND type != 'order_confirmation_customer';

-- Ensure the correct template is active
UPDATE email_templates
SET is_active = true,
    updated_at = CURRENT_TIMESTAMP
WHERE type = 'order_confirmation_customer'
  AND trigger_event = 'order.created'
  AND recipient_type = 'customer';

-- Fix logo URL - use absolute URL from environment or default to public path
-- The logo should be accessible via the frontend URL
UPDATE email_templates
SET header_image = '/SimFab-logo-red-black-min-crop.svg',
    header_title = 'SimFab',
    updated_at = CURRENT_TIMESTAMP
WHERE header_image IS NULL 
   OR header_image != '/SimFab-logo-red-black-min-crop.svg';

-- Ensure header_image and header_title columns exist (if they don't already from previous migrations)
ALTER TABLE email_templates 
  ADD COLUMN IF NOT EXISTS header_image VARCHAR(255),
  ADD COLUMN IF NOT EXISTS header_title VARCHAR(255);

-- Update EmailTemplateWrapper will use FRONTEND_URL or API_URL to construct absolute logo URL
-- Logo file is at: public/SimFab-logo-red-black-min-crop.svg
-- So the path should be: {FRONTEND_URL}/SimFab-logo-red-black-min-crop.svg

