-- Remove all emojis from email templates
-- Updates all email templates to remove emoji characters from their HTML body

-- 1. Order Completed - Remove 🎉
UPDATE email_templates 
SET html_body = REPLACE(html_body, 'Order Complete! 🎉', 'Order Complete!')
WHERE html_body LIKE '%Order Complete! 🎉%';

UPDATE email_templates 
SET html_body = REPLACE(html_body, 'Order Complete! 🎉', 'Order Complete!')
WHERE html_body LIKE '%Order Complete! 🎉%';

-- 2. New Account Welcome - Remove 🎮
UPDATE email_templates 
SET html_body = REPLACE(html_body, 'Welcome to SimFab! 🎮', 'Welcome to SimFab!')
WHERE html_body LIKE '%Welcome to SimFab! 🎮%';

-- 3. Wishlist Sale Notification - Remove 🎉
UPDATE email_templates 
SET html_body = REPLACE(html_body, 'Great News! 🎉', 'Great News!')
WHERE html_body LIKE '%Great News! 🎉%';

-- 4. Wishlist Back in Stock - Remove 🎉
UPDATE email_templates 
SET html_body = REPLACE(html_body, 'Back in Stock! 🎉', 'Back in Stock!')
WHERE html_body LIKE '%Back in Stock! 🎉%';

-- General cleanup: Remove any remaining emojis (common ones)
UPDATE email_templates 
SET html_body = REPLACE(html_body, '🎉', '')
WHERE html_body LIKE '%🎉%';

UPDATE email_templates 
SET html_body = REPLACE(html_body, '🎮', '')
WHERE html_body LIKE '%🎮%';

UPDATE email_templates 
SET html_body = REPLACE(html_body, '📦', '')
WHERE html_body LIKE '%📦%';

UPDATE email_templates 
SET html_body = REPLACE(html_body, '🚚', '')
WHERE html_body LIKE '%🚚%';

-- Update updated_at timestamp
UPDATE email_templates 
SET updated_at = CURRENT_TIMESTAMP
WHERE html_body LIKE '%🎉%' 
   OR html_body LIKE '%🎮%' 
   OR html_body LIKE '%📦%' 
   OR html_body LIKE '%🚚%';

