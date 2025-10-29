-- Complete redesign of all email templates
-- Pure black background, logo only (no red header), improved design for each email type

-- 1. New Order Admin - Detailed order information
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

-- 2. Order Cancelled Admin
UPDATE email_templates SET html_body = '
<div class="email-content">
  <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px;">Order Cancelled</h1>
  <p style="color: #888888; font-size: 14px; margin: 0 0 32px 0; text-transform: uppercase; letter-spacing: 1px;">Admin Notification</p>
  
  <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Order <strong style="color: #c5303b;">#{{order_number}}</strong> has been cancelled.</p>
  
  <div style="background-color: #1a1a1a; border: 1px solid #1a1a1a; border-left: 3px solid #c5303b; padding: 24px; margin: 24px 0; border-radius: 8px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="font-size: 15px; line-height: 1.8;">
      <tr>
        <td style="padding: 8px 0; color: #cccccc; width: 140px;"><strong style="color: #ffffff;">Customer</strong></td>
        <td style="padding: 8px 0; color: #cccccc;">{{customer_name}}<br><span style="color: #888888; font-size: 13px;">{{customer_email}}</span></td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #cccccc; border-top: 1px solid #1a1a1a;"><strong style="color: #ffffff;">Reason</strong></td>
        <td style="padding: 8px 0; color: #cccccc; border-top: 1px solid #1a1a1a;">{{cancellation_reason}}</td>
      </tr>
    </table>
  </div>
</div>
' WHERE type = 'order_cancelled_admin';

-- 3. Order Cancelled Customer - Friendly and clear
UPDATE email_templates SET html_body = '
<div class="email-content">
  <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px;">Order Cancelled</h1>
  <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi {{customer_name}},</p>
  <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Your order <strong style="color: #c5303b;">#{{order_number}}</strong> has been cancelled.</p>
  
  <div style="background-color: #1a1a1a; border: 1px solid #1a1a1a; border-left: 3px solid #c5303b; padding: 24px; margin: 24px 0; border-radius: 8px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="font-size: 15px; line-height: 1.8;">
      <tr>
        <td style="padding: 8px 0; color: #cccccc;"><strong style="color: #ffffff;">Order Total</strong></td>
        <td style="padding: 8px 0; color: #c5303b; font-weight: 600; font-size: 18px; text-align: right;">{{order_total}}</td>
      </tr>
    </table>
  </div>
  
  <p style="color: #888888; font-size: 15px; line-height: 1.6; margin-top: 32px;">If you have any questions about this cancellation, please don''t hesitate to contact us.</p>
</div>
' WHERE type = 'order_cancelled_customer';

-- 4. Order Failed Admin
UPDATE email_templates SET html_body = '
<div class="email-content">
  <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px;">Payment Failed</h1>
  <p style="color: #888888; font-size: 14px; margin: 0 0 32px 0; text-transform: uppercase; letter-spacing: 1px;">Payment Error Notification</p>
  
  <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Payment processing failed for order <strong style="color: #c5303b;">#{{order_number}}</strong></p>
  
  <div style="background-color: #1a1a1a; border: 1px solid #c5303b; padding: 24px; margin: 24px 0; border-radius: 8px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="font-size: 15px; line-height: 1.8;">
      <tr>
        <td style="padding: 8px 0; color: #cccccc; width: 140px;"><strong style="color: #ffffff;">Customer</strong></td>
        <td style="padding: 8px 0; color: #cccccc;">{{customer_email}}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #cccccc; border-top: 1px solid #1a1a1a;"><strong style="color: #ffffff;">Error</strong></td>
        <td style="padding: 8px 0; color: #c5303b; border-top: 1px solid #1a1a1a; font-weight: 500;">{{error_message}}</td>
      </tr>
    </table>
  </div>
</div>
' WHERE type = 'order_failed_admin';

-- 5. Order Failed Customer - Helpful and actionable
UPDATE email_templates SET html_body = '
<div class="email-content">
  <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px;">Payment Issue</h1>
  <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi {{customer_name}},</p>
  <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">We couldn''t process your payment for order <strong style="color: #c5303b;">#{{order_number}}</strong>.</p>
  
  <div style="background-color: #1a1a1a; border: 1px solid #c5303b; padding: 24px; margin: 24px 0; border-radius: 8px;">
    <p style="margin: 0; color: #cccccc; font-size: 15px; line-height: 1.6;">Please try again with a different payment method or contact your bank.</p>
  </div>
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0;">
    <tr>
      <td align="center">
        <a href="http://localhost:5173/checkout" style="display: inline-block; padding: 16px 32px; background-color: #c5303b; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Return to Checkout</a>
      </td>
    </tr>
  </table>
</div>
' WHERE type = 'order_failed_customer';

-- 6. Order On Hold - Reassuring
UPDATE email_templates SET html_body = '
<div class="email-content">
  <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px;">Order On Hold</h1>
  <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi {{customer_name}},</p>
  <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Your order <strong style="color: #c5303b;">#{{order_number}}</strong> is currently on hold.</p>
  
  <div style="background-color: #1a1a1a; border: 1px solid #1a1a1a; border-left: 3px solid #c5303b; padding: 24px; margin: 24px 0; border-radius: 8px;">
    <p style="margin: 0; color: #cccccc; font-size: 15px; line-height: 1.6;">We''re reviewing your order and will contact you soon with an update.</p>
  </div>
  
  <p style="color: #888888; font-size: 15px; line-height: 1.6; margin-top: 32px;">Thank you for your patience.</p>
</div>
' WHERE type = 'order_on_hold';

-- 7. Order Processing - Positive and informative
UPDATE email_templates SET html_body = '
<div class="email-content">
  <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px;">Order Processing</h1>
  <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi {{customer_name}},</p>
  <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Great news! Your order <strong style="color: #c5303b;">#{{order_number}}</strong> is now being processed.</p>
  
  <div style="background-color: #1a1a1a; border: 1px solid #1a1a1a; border-left: 3px solid #c5303b; padding: 24px; margin: 24px 0; border-radius: 8px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="font-size: 15px; line-height: 1.8;">
      <tr>
        <td style="padding: 8px 0; color: #cccccc;"><strong style="color: #ffffff;">Order Total</strong></td>
        <td style="padding: 8px 0; color: #c5303b; font-weight: 600; font-size: 18px; text-align: right;">{{order_total}}</td>
      </tr>
    </table>
  </div>
  
  <p style="color: #888888; font-size: 15px; line-height: 1.6; margin-top: 32px;">We''ll notify you as soon as your order ships with tracking information.</p>
</div>
' WHERE type = 'order_processing';

-- 8. Order Completed - Celebratory
UPDATE email_templates SET html_body = '
<div class="email-content">
  <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px;">Order Complete! 🎉</h1>
  <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi {{customer_name}},</p>
  <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Your order <strong style="color: #c5303b;">#{{order_number}}</strong> has been delivered successfully!</p>
  
  <div style="background-color: #1a1a1a; border: 1px solid #c5303b; padding: 32px; margin: 32px 0; border-radius: 8px; text-align: center;">
    <p style="margin: 0; color: #ffffff; font-size: 18px; line-height: 1.6; font-weight: 500;">Thank you for shopping with SimFab!</p>
  </div>
  
  <p style="color: #888888; font-size: 15px; line-height: 1.6; margin-top: 32px;">We hope you enjoy your new equipment. If you need any support, we''re here to help!</p>
</div>
' WHERE type = 'order_completed';

-- 9. Order Refunded - Clear and informative
UPDATE email_templates SET html_body = '
<div class="email-content">
  <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px;">Refund Processed</h1>
  <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi {{customer_name}},</p>
  <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Your refund for order <strong style="color: #c5303b;">#{{order_number}}</strong> has been processed.</p>
  
  <div style="background-color: #1a1a1a; border: 1px solid #1a1a1a; border-left: 3px solid #c5303b; padding: 24px; margin: 24px 0; border-radius: 8px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="font-size: 15px; line-height: 1.8;">
      <tr>
        <td style="padding: 8px 0; color: #cccccc;"><strong style="color: #ffffff;">Refund Amount</strong></td>
        <td style="padding: 8px 0; color: #c5303b; font-weight: 600; font-size: 18px; text-align: right;">{{refund_amount}}</td>
      </tr>
    </table>
  </div>
  
  <p style="color: #888888; font-size: 15px; line-height: 1.6; margin-top: 32px;">Please allow 5-7 business days for the refund to appear in your account.</p>
</div>
' WHERE type = 'order_refunded';

-- 10. Order Details - Comprehensive
UPDATE email_templates SET html_body = '
<div class="email-content">
  <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px;">Order Details</h1>
  <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi {{customer_name}},</p>
  <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Here are the details for your order:</p>
  
  <div style="background-color: #1a1a1a; border: 1px solid #1a1a1a; border-left: 3px solid #c5303b; padding: 24px; margin: 24px 0; border-radius: 8px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="font-size: 15px; line-height: 1.8;">
      <tr>
        <td style="padding: 8px 0; color: #cccccc; width: 140px;"><strong style="color: #ffffff;">Order Number</strong></td>
        <td style="padding: 8px 0; color: #c5303b; font-weight: 600; font-size: 16px;">{{order_number}}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #cccccc; border-top: 1px solid #1a1a1a;"><strong style="color: #ffffff;">Total</strong></td>
        <td style="padding: 8px 0; color: #cccccc; border-top: 1px solid #1a1a1a;">{{order_total}}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #cccccc; border-top: 1px solid #1a1a1a;"><strong style="color: #ffffff;">Date</strong></td>
        <td style="padding: 8px 0; color: #cccccc; border-top: 1px solid #1a1a1a;">{{order_date}}</td>
      </tr>
    </table>
  </div>
</div>
' WHERE type = 'order_details';

-- 11. Customer Note - Personalized
UPDATE email_templates SET html_body = '
<div class="email-content">
  <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px;">Order Update</h1>
  <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi {{customer_name}},</p>
  
  <div style="background-color: #1a1a1a; border: 1px solid #1a1a1a; border-left: 3px solid #c5303b; padding: 24px; margin: 24px 0; border-radius: 8px;">
    <p style="margin: 0; color: #cccccc; font-size: 16px; line-height: 1.8; white-space: pre-wrap;">{{note}}</p>
  </div>
</div>
' WHERE type = 'customer_note';

-- 12. Reset Password - Secure and clear
UPDATE email_templates SET html_body = '
<div class="email-content">
  <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px;">Reset Your Password</h1>
  <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi {{customer_name}},</p>
  <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">You requested to reset your password. Click the button below to create a new password:</p>
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0;">
    <tr>
      <td align="center">
        <a href="{{reset_url}}" style="display: inline-block; padding: 16px 32px; background-color: #c5303b; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Reset Password</a>
      </td>
    </tr>
  </table>
  
  <div style="background-color: #1a1a1a; border: 1px solid #1a1a1a; padding: 20px; margin: 32px 0; border-radius: 8px;">
    <p style="margin: 0; color: #888888; font-size: 13px; line-height: 1.6;">This link expires in 24 hours. If you didn''t request this, please ignore this email.</p>
  </div>
</div>
' WHERE type = 'reset_password';

-- 13. New Account - Welcoming
UPDATE email_templates SET html_body = '
<div class="email-content">
  <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px;">Welcome to SimFab! 🎮</h1>
  <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi {{customer_name}},</p>
  <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">Thank you for creating an account with SimFab!</p>
  
  <div style="background-color: #1a1a1a; border: 1px solid #1a1a1a; border-left: 3px solid #c5303b; padding: 24px; margin: 24px 0; border-radius: 8px;">
    <p style="margin: 0 0 12px 0; color: #ffffff; font-size: 15px; font-weight: 600;">Now you can:</p>
    <ul style="margin: 12px 0; padding-left: 24px; color: #cccccc; font-size: 15px; line-height: 2;">
      <li>Track your orders</li>
      <li>Save your shipping address</li>
      <li>Manage your account settings</li>
    </ul>
  </div>
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0;">
    <tr>
      <td align="center">
        <a href="http://localhost:5173/shop" style="display: inline-block; padding: 16px 32px; background-color: #c5303b; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Start Shopping</a>
      </td>
    </tr>
  </table>
</div>
' WHERE type = 'new_account';

