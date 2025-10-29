-- ============================================================================
-- Wishlist Email Templates Migration
-- Migration: 035_add_wishlist_email_templates.sql
-- Description: Adds email templates for wishlist sale and stock notifications
-- ============================================================================

-- Insert sale notification template
INSERT INTO email_templates (
  type,
  name,
  description,
  subject,
  html_body,
  text_body,
  recipient_type,
  is_active,
  header_image,
  header_title,
  created_at,
  updated_at
) VALUES (
  'wishlist_sale_notification',
  'Wishlist Sale Notification',
  'Email sent to users when a product in their wishlist goes on sale',
  'Great news! {{product_name}} is now on sale!',
  '<div class="email-content">
    <h2 style="color: #c5303b; font-size: 24px; margin-bottom: 20px; font-weight: 700;">Great News! 🎉</h2>
    <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">Hi {{customer_name}},</p>
    <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">Good news! <strong style="color: #c5303b;">{{product_name}}</strong> from your wishlist is now on sale.</p>
    
    <div style="background-color: #2b2b2b; border-left: 4px solid #c5303b; padding: 20px; margin: 20px 0; border-radius: 4px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="font-size: 15px; line-height: 1.8;">
        <tr>
          <td style="padding: 8px 0; color: #cccccc; width: 140px;"><strong style="color: #ffffff;">Regular Price:</strong></td>
          <td style="padding: 8px 0; color: #888888; text-decoration: line-through;">${{regular_price}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #cccccc; border-top: 1px solid #1a1a1a;"><strong style="color: #ffffff;">Sale Price:</strong></td>
          <td style="padding: 8px 0; color: #c5303b; font-weight: 600; font-size: 18px; border-top: 1px solid #1a1a1a;">${{sale_price}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #cccccc; border-top: 1px solid #1a1a1a;"><strong style="color: #ffffff;">You Save:</strong></td>
          <td style="padding: 8px 0; color: #059669; font-weight: 600; border-top: 1px solid #1a1a1a;">${{discount_amount}} ({{discount_percent}}% off)</td>
        </tr>
      </table>
    </div>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
      <tr>
        <td align="center" style="padding: 8px;">
          <a href="{{product_url}}" style="display: inline-block; padding: 14px 28px; background-color: #c5303b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin-right: 12px;">View Product</a>
        </td>
        <td align="center" style="padding: 8px;">
          <a href="{{product_url}}" style="display: inline-block; padding: 14px 28px; background-color: #333333; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Add to Cart</a>
        </td>
      </tr>
    </table>

    <div style="margin: 24px 0; text-align: center;">
      <img src="{{product_image}}" alt="{{product_name}}" style="max-width: 100%; border-radius: 8px; border: 1px solid #1a1a1a;" />
    </div>

    <p style="color: #888888; font-size: 12px; line-height: 1.6; margin-top: 30px; border-top: 1px solid #1a1a1a; padding-top: 20px;">
      You can manage your wishlist notification preferences 
      <a href="{{unsubscribe_url}}" style="color: #c5303b; text-decoration: none;">here</a>.
    </p>
  </div>',
  'Hi {{customer_name}},

Good news! {{product_name}} from your wishlist is now on sale.

Regular Price: ${{regular_price}}
Sale Price: ${{sale_price}}
You Save: ${{discount_amount}} ({{discount_percent}}% off)

View Product: {{product_url}}

You can manage your wishlist notification preferences here: {{unsubscribe_url}}',
  'customer',
  true,
  '/SimFab-logo-red-black-min-crop.svg',
  'SimFab',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (type) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  updated_at = CURRENT_TIMESTAMP;

-- Insert stock notification template
INSERT INTO email_templates (
  type,
  name,
  description,
  subject,
  html_body,
  text_body,
  recipient_type,
  is_active,
  header_image,
  header_title,
  created_at,
  updated_at
) VALUES (
  'wishlist_stock_notification',
  'Wishlist Stock Notification',
  'Email sent to users when a product in their wishlist comes back in stock',
  '{{product_name}} is back in stock!',
  '<div class="email-content">
    <h2 style="color: #c5303b; font-size: 24px; margin-bottom: 20px; font-weight: 700;">Back in Stock! 🎉</h2>
    <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">Hi {{customer_name}},</p>
    <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">Great news! <strong style="color: #c5303b;">{{product_name}}</strong> from your wishlist is now back in stock.</p>

    <div style="background-color: #2b2b2b; border-left: 4px solid #059669; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #e5e5e5;"><strong style="color: #ffffff;">Stock Available:</strong> <span style="color: #059669; font-weight: 600;">{{stock_quantity}} items</span></p>
    </div>

    <div style="background-color: #fff7ed; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #92400e; font-weight: 600;">⚠️ Stock is limited, so don''t wait!</p>
    </div>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
      <tr>
        <td align="center" style="padding: 8px;">
          <a href="{{product_url}}" style="display: inline-block; padding: 14px 28px; background-color: #c5303b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin-right: 12px;">Hurry! Get yours now</a>
        </td>
        <td align="center" style="padding: 8px;">
          <a href="{{product_url}}" style="display: inline-block; padding: 14px 28px; background-color: #333333; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View Product</a>
        </td>
      </tr>
    </table>

    <div style="margin: 24px 0; text-align: center;">
      <img src="{{product_image}}" alt="{{product_name}}" style="max-width: 100%; border-radius: 8px; border: 1px solid #1a1a1a;" />
    </div>

    <p style="color: #888888; font-size: 12px; line-height: 1.6; margin-top: 30px; border-top: 1px solid #1a1a1a; padding-top: 20px;">
      You can manage your wishlist notification preferences 
      <a href="{{unsubscribe_url}}" style="color: #c5303b; text-decoration: none;">here</a>.
    </p>
  </div>',
  'Hi {{customer_name}},

Great news! {{product_name}} from your wishlist is now back in stock.

Stock Available: {{stock_quantity}} items

⚠️ Stock is limited, so don''t wait!

View Product: {{product_url}}

You can manage your wishlist notification preferences here: {{unsubscribe_url}}',
  'customer',
  true,
  '/SimFab-logo-red-black-min-crop.svg',
  'SimFab',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (type) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  updated_at = CURRENT_TIMESTAMP;

-- Comments
COMMENT ON COLUMN email_templates.type IS 'Template type identifier - wishlist_sale_notification and wishlist_stock_notification added for wishlist feature';

