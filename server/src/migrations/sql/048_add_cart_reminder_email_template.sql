-- Add cart reminder email template (1 day)
INSERT INTO email_templates (
  type,
  name,
  description,
  subject,
  html_body,
  recipient_type,
  trigger_event,
  is_active,
  default_recipients
) VALUES (
  'cart_reminder_1day',
  'Cart Reminder (1 Day)',
  'Email sent to customers 1 day after cart abandonment',
  'Complete Your Purchase - Your Cart is Waiting!',
  '<div class="email-content"><h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px 0; font-weight: 700;">Don''t Forget Your Cart!</h1><p style="color: #cccccc; font-size: 16px; line-height: 1.6;">Hi {{customer_name}},</p><p style="color: #cccccc; font-size: 16px; line-height: 1.6;">We noticed you left some items in your cart. Complete your purchase now and don''t miss out!</p><div class="order-info"><h3 style="color: #c5303b; margin: 0 0 12px 0;">Your Cart Summary</h3><p style="color: #cccccc; font-size: 14px; margin: 4px 0;"><strong>Cart Total:</strong> <span class="highlight">{{cart_total}}</span></p><p style="color: #cccccc; font-size: 14px; margin: 4px 0;"><strong>Items:</strong> {{item_count}}</p></div><p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-top: 20px;"><a href="{{cart_url}}" style="color: #c5303b; text-decoration: none; font-weight: 600;">Complete Your Purchase →</a></p></div>',
  'customer',
  'cart.reminder_1day',
  true,
  ARRAY[]::VARCHAR[]
) ON CONFLICT (type) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  recipient_type = EXCLUDED.recipient_type,
  trigger_event = EXCLUDED.trigger_event,
  updated_at = NOW();

-- Add cart reminder email template (7 days) - using same content as 1 day template
INSERT INTO email_templates (
  type,
  name,
  description,
  subject,
  html_body,
  recipient_type,
  trigger_event,
  is_active,
  default_recipients
) VALUES (
  'cart_reminder_7days',
  'Cart Reminder (7 Days)',
  'Email sent to customers 7 days after cart abandonment',
  'Complete Your Purchase - Your Cart is Waiting!',
  '<div class="email-content"><h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px 0; font-weight: 700;">Don''t Forget Your Cart!</h1><p style="color: #cccccc; font-size: 16px; line-height: 1.6;">Hi {{customer_name}},</p><p style="color: #cccccc; font-size: 16px; line-height: 1.6;">We noticed you left some items in your cart. Complete your purchase now and don''t miss out!</p><div class="order-info"><h3 style="color: #c5303b; margin: 0 0 12px 0;">Your Cart Summary</h3><p style="color: #cccccc; font-size: 14px; margin: 4px 0;"><strong>Cart Total:</strong> <span class="highlight">{{cart_total}}</span></p><p style="color: #cccccc; font-size: 14px; margin: 4px 0;"><strong>Items:</strong> {{item_count}}</p></div><p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-top: 20px;"><a href="{{cart_url}}" style="color: #c5303b; text-decoration: none; font-weight: 600;">Complete Your Purchase →</a></p></div>',
  'customer',
  'cart.reminder_7days',
  true,
  ARRAY[]::VARCHAR[]
) ON CONFLICT (type) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  recipient_type = EXCLUDED.recipient_type,
  trigger_event = EXCLUDED.trigger_event,
  updated_at = NOW();

