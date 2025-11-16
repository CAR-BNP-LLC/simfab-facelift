-- Fix hardcoded localhost URLs in email templates
-- Replace with {{frontend_url}} placeholder which is automatically replaced at runtime
-- This ensures email links work correctly in both development and production

-- 1. Fix order_failed_customer template - Replace to Checkout button
UPDATE email_templates 
SET html_body = REPLACE(
  html_body,
  'http://localhost:5173/checkout',
  '{{frontend_url}}/checkout'
)
WHERE type = 'order_failed_customer' 
  AND html_body LIKE '%http://localhost:5173/checkout%';

-- 2. Fix new_account template - Start Shopping button
UPDATE email_templates 
SET html_body = REPLACE(
  html_body,
  'http://localhost:5173/shop',
  '{{frontend_url}}/shop'
)
WHERE type = 'new_account' 
  AND html_body LIKE '%http://localhost:5173/shop%';

-- Also fix any other localhost URLs that might exist
UPDATE email_templates 
SET html_body = REGEXP_REPLACE(
  html_body,
  'http://localhost:\d+',
  '{{frontend_url}}',
  'g'
)
WHERE html_body LIKE '%http://localhost:%';

-- Fix 127.0.0.1 URLs as well
UPDATE email_templates 
SET html_body = REGEXP_REPLACE(
  html_body,
  'http://127\.0\.0\.1:\d+',
  '{{frontend_url}}',
  'g'
)
WHERE html_body LIKE '%http://127.0.0.1:%';

-- Note: The EmailTemplateEngine now automatically:
-- 1. Replaces {{frontend_url}} with the correct URL from environment variables
-- 2. Replaces any remaining hardcoded localhost URLs as a fallback
-- This ensures all email links work correctly regardless of environment

