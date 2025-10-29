-- Update email templates with styled HTML content matching SimFab theme
-- The EmailTemplateWrapper will add the outer structure, logo, and footer
-- So templates should only contain the inner content

-- Add header_image and header_title columns if they don't exist
ALTER TABLE email_templates 
  ADD COLUMN IF NOT EXISTS header_image VARCHAR(255),
  ADD COLUMN IF NOT EXISTS header_title VARCHAR(255);

-- Update header_image and header_title defaults first
UPDATE email_templates SET 
  header_image = COALESCE(header_image, '/SimFab-logo-red-black-min-crop.svg'),
  header_title = COALESCE(header_title, 'SimFab')
WHERE header_image IS NULL OR header_title IS NULL;
UPDATE email_templates SET html_body = '
<div class="email-content">
  <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px;">New Order Received</h1>
  <p style="color: #888888; font-size: 14px; margin: 0 0 32px 0; text-transform: uppercase; letter-spacing: 1px;">Order Notification</p>
  
  <div style="background-color: #1a1a1a; border: 1px solid #1a1a1a; border-left: 3px solid #c5303b; padding: 24px; margin: 24px 0; border-radius: 8px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="font-size: 15px; line-height: 1.8;">
      <tr>
        <td style="padding: 8px 0; color: #cccccc; width: 140px;"><strong style="color: #ffffff;">Order Number</strong></td>
        <td style="padding: 8px 0; color: #c5303b; font-weight: 600; font-size: 16px;">{{order_number}}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #cccccc; border-top: 1px solid #1a1a1a;"><strong style="color: #ffffff;">Customer</strong></td>
        <td style="padding: 8px 0; color: #cccccc; border-top: 1px solid #1a1a1a;">{{customer_name}}<br><span style="color: #888888; font-size: 13px;">{{customer_email}}</span></td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #cccccc; border-top: 1px solid #1a1a1a;"><strong style="color: #ffffff;">Order Total</strong></td>
        <td style="padding: 8px 0; color: #c5303b; font-weight: 600; font-size: 18px; border-top: 1px solid #1a1a1a;">{{order_total}}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #cccccc; border-top: 1px solid #1a1a1a;"><strong style="color: #ffffff;">Order Date</strong></td>
        <td style="padding: 8px 0; color: #cccccc; border-top: 1px solid #1a1a1a;">{{order_date}}</td>
      </tr>
    </table>
  </div>
</div>
' WHERE type = 'new_order_admin';

UPDATE email_templates SET html_body = '
<div class="email-content">
  <h2 style="color: #c5303b; font-size: 24px; margin-bottom: 20px; font-weight: 700;">Order Cancelled</h2>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">Order #{{order_number}} has been cancelled.</p>
  <div style="background-color: #2b2b2b; border-left: 4px solid #c5303b; padding: 16px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 8px 0; color: #e5e5e5;"><strong style="color: #ffffff;">Customer:</strong> {{customer_name}} ({{customer_email}})</p>
    <p style="margin: 8px 0; color: #e5e5e5;"><strong style="color: #ffffff;">Reason:</strong> {{cancellation_reason}}</p>
  </div>
</div>
' WHERE type = 'order_cancelled_admin';

UPDATE email_templates SET html_body = '
<div class="email-content">
  <h2 style="color: #c5303b; font-size: 24px; margin-bottom: 20px; font-weight: 700;">Order Cancellation</h2>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">Hi {{customer_name}},</p>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">Your order <strong style="color: #c5303b;">#{{order_number}}</strong> has been cancelled.</p>
  <div style="background-color: #2b2b2b; border-left: 4px solid #c5303b; padding: 16px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 8px 0; color: #e5e5e5;"><strong style="color: #ffffff;">Order Total:</strong> <span style="color: #c5303b; font-weight: 600;">{{order_total}}</span></p>
  </div>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-top: 20px;">If you have any questions, please don''t hesitate to contact us.</p>
</div>
' WHERE type = 'order_cancelled_customer';

UPDATE email_templates SET html_body = '
<div class="email-content">
  <h2 style="color: #c5303b; font-size: 24px; margin-bottom: 20px; font-weight: 700;">Payment Failed</h2>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">Order #{{order_number}}</p>
  <div style="background-color: #2b2b2b; border-left: 4px solid #c5303b; padding: 16px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 8px 0; color: #e5e5e5;"><strong style="color: #ffffff;">Customer:</strong> {{customer_email}}</p>
    <p style="margin: 8px 0; color: #e5e5e5;"><strong style="color: #ffffff;">Error:</strong> <span style="color: #c5303b;">{{error_message}}</span></p>
  </div>
</div>
' WHERE type = 'order_failed_admin';

UPDATE email_templates SET html_body = '
<div class="email-content">
  <h2 style="color: #c5303b; font-size: 24px; margin-bottom: 20px; font-weight: 700;">Payment Failed</h2>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">Hi {{customer_name}},</p>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">Your payment for order <strong style="color: #c5303b;">#{{order_number}}</strong> could not be processed.</p>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-top: 20px;">Please try again or use a different payment method.</p>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
    <tr>
      <td align="center">
        <a href="' || COALESCE(CAST(current_setting('app.frontend_url', true) AS text), 'http://localhost:5173') || '/checkout" style="display: inline-block; padding: 14px 28px; background-color: #c5303b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Return to Checkout</a>
      </td>
    </tr>
  </table>
</div>
' WHERE type = 'order_failed_customer';

UPDATE email_templates SET html_body = '
<div class="email-content">
  <h2 style="color: #c5303b; font-size: 24px; margin-bottom: 20px; font-weight: 700;">Order On Hold</h2>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">Hi {{customer_name}},</p>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">Your order <strong style="color: #c5303b;">#{{order_number}}</strong> is currently on hold.</p>
  <div style="background-color: #2b2b2b; border-left: 4px solid #c5303b; padding: 16px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 0; color: #e5e5e5;">We will contact you soon with more information.</p>
  </div>
</div>
' WHERE type = 'order_on_hold';

UPDATE email_templates SET html_body = '
<div class="email-content">
  <h2 style="color: #c5303b; font-size: 24px; margin-bottom: 20px; font-weight: 700;">Order Processing</h2>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">Hi {{customer_name}},</p>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">Great news! Your order <strong style="color: #c5303b;">#{{order_number}}</strong> is now being processed.</p>
  <div style="background-color: #2b2b2b; border-left: 4px solid #c5303b; padding: 16px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 8px 0; color: #e5e5e5;"><strong style="color: #ffffff;">Order Total:</strong> <span style="color: #c5303b; font-weight: 600;">{{order_total}}</span></p>
  </div>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-top: 20px;">We will notify you once it ships with tracking information.</p>
</div>
' WHERE type = 'order_processing';

UPDATE email_templates SET html_body = '
<div class="email-content">
  <h2 style="color: #c5303b; font-size: 24px; margin-bottom: 20px; font-weight: 700;">Order Complete! 🎉</h2>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">Hi {{customer_name}},</p>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">Your order <strong style="color: #c5303b;">#{{order_number}}</strong> has been delivered successfully!</p>
  <div style="background-color: #2b2b2b; border-left: 4px solid #c5303b; padding: 16px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 0; color: #e5e5e5; font-size: 18px; text-align: center;">Thank you for shopping with SimFab!</p>
  </div>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-top: 20px;">We hope you enjoy your new equipment. If you need any support, we''re here to help!</p>
</div>
' WHERE type = 'order_completed';

UPDATE email_templates SET html_body = '
<div class="email-content">
  <h2 style="color: #c5303b; font-size: 24px; margin-bottom: 20px; font-weight: 700;">Order Refunded</h2>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">Hi {{customer_name}},</p>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">Your order <strong style="color: #c5303b;">#{{order_number}}</strong> has been refunded.</p>
  <div style="background-color: #2b2b2b; border-left: 4px solid #c5303b; padding: 16px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 8px 0; color: #e5e5e5;"><strong style="color: #ffffff;">Refund Amount:</strong> <span style="color: #c5303b; font-weight: 600;">{{refund_amount}}</span></p>
  </div>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-top: 20px;">Please allow 5-7 business days for the refund to appear in your account.</p>
</div>
' WHERE type = 'order_refunded';

UPDATE email_templates SET html_body = '
<div class="email-content">
  <h2 style="color: #c5303b; font-size: 24px; margin-bottom: 20px; font-weight: 700;">Order Details</h2>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">Hi {{customer_name}},</p>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">Here are the details for your order:</p>
  <div style="background-color: #2b2b2b; border-left: 4px solid #c5303b; padding: 16px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 8px 0; color: #e5e5e5;"><strong style="color: #ffffff;">Order Number:</strong> <span style="color: #c5303b; font-weight: 600;">{{order_number}}</span></p>
    <p style="margin: 8px 0; color: #e5e5e5;"><strong style="color: #ffffff;">Total:</strong> <span style="color: #c5303b; font-weight: 600;">{{order_total}}</span></p>
    <p style="margin: 8px 0; color: #e5e5e5;"><strong style="color: #ffffff;">Date:</strong> {{order_date}}</p>
  </div>
</div>
' WHERE type = 'order_details';

UPDATE email_templates SET html_body = '
<div class="email-content">
  <h2 style="color: #c5303b; font-size: 24px; margin-bottom: 20px; font-weight: 700;">Order Update</h2>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">Hi {{customer_name}},</p>
  <div style="background-color: #2b2b2b; border-left: 4px solid #c5303b; padding: 16px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 0; color: #e5e5e5; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">{{note}}</p>
  </div>
</div>
' WHERE type = 'customer_note';

UPDATE email_templates SET html_body = '
<div class="email-content">
  <h2 style="color: #c5303b; font-size: 24px; margin-bottom: 20px; font-weight: 700;">Reset Your Password</h2>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">Hi {{customer_name}},</p>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">You requested to reset your password. Click the button below to create a new password:</p>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
    <tr>
      <td align="center">
        <a href="{{reset_url}}" style="display: inline-block; padding: 14px 28px; background-color: #c5303b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Reset Password</a>
      </td>
    </tr>
  </table>
  <p style="color: #999999; font-size: 14px; line-height: 1.6; margin-top: 20px;">This link expires in 24 hours. If you didn''t request this, please ignore this email.</p>
</div>
' WHERE type = 'reset_password';

UPDATE email_templates SET html_body = '
<div class="email-content">
  <h2 style="color: #c5303b; font-size: 24px; margin-bottom: 20px; font-weight: 700;">Welcome to SimFab! 🎮</h2>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">Hi {{customer_name}},</p>
  <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">Thank you for creating an account with SimFab!</p>
  <div style="background-color: #2b2b2b; border-left: 4px solid #c5303b; padding: 16px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 8px 0; color: #e5e5e5;">Now you can:</p>
    <ul style="margin: 8px 0; padding-left: 20px; color: #e5e5e5;">
      <li style="margin: 4px 0;">Track your orders</li>
      <li style="margin: 4px 0;">Save your shipping address</li>
      <li style="margin: 4px 0;">Manage your account settings</li>
    </ul>
  </div>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
    <tr>
      <td align="center">
        <a href="' || COALESCE(CAST(current_setting('app.frontend_url', true) AS text), 'http://localhost:5173') || '/shop" style="display: inline-block; padding: 14px 28px; background-color: #c5303b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Start Shopping</a>
      </td>
    </tr>
  </table>
</div>
' WHERE type = 'new_account';


