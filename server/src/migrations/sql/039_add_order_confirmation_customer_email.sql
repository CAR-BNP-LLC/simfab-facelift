-- Add customer order confirmation email template
-- This template is automatically sent to customers when their order is created

INSERT INTO email_templates (
  type, 
  name, 
  description, 
  subject, 
  html_body, 
  recipient_type, 
  default_recipients,
  trigger_event,
  is_active
) VALUES (
  'order_confirmation_customer',
  'Order Confirmation (Customer)',
  'Sent to customer immediately after order is placed',
  'Order Confirmation #{{order_number}}',
  '<div class="email-content">
    <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px;">Thank You For Your Order!</h1>
    <p style="color: #888888; font-size: 14px; margin: 0 0 32px 0; text-transform: uppercase; letter-spacing: 1px;">Order Confirmation</p>
    
    <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi {{customer_name}},</p>
    <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">We have received your order and will process it shortly. You will receive an email update when your order ships with tracking information.</p>
    
    <div style="background-color: #1a1a1a; border: 1px solid #1a1a1a; border-left: 3px solid #c5303b; padding: 24px; margin: 24px 0; border-radius: 8px;">
      <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 16px 0; font-weight: 600;">Order Details</h2>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="font-size: 15px; line-height: 1.8;">
        <tr>
          <td style="padding: 8px 0; color: #cccccc; width: 140px;"><strong style="color: #ffffff;">Order Number</strong></td>
          <td style="padding: 8px 0; color: #c5303b; font-weight: 600; font-size: 16px;">{{order_number}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #cccccc; border-top: 1px solid #1a1a1a;"><strong style="color: #ffffff;">Order Date</strong></td>
          <td style="padding: 8px 0; color: #cccccc; border-top: 1px solid #1a1a1a;">{{order_date}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #cccccc; border-top: 1px solid #1a1a1a;"><strong style="color: #ffffff;">Subtotal</strong></td>
          <td style="padding: 8px 0; color: #cccccc; border-top: 1px solid #1a1a1a;">{{subtotal}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #cccccc; border-top: 1px solid #1a1a1a;"><strong style="color: #ffffff;">Shipping</strong></td>
          <td style="padding: 8px 0; color: #cccccc; border-top: 1px solid #1a1a1a;">{{shipping_amount}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #cccccc; border-top: 1px solid #1a1a1a;"><strong style="color: #ffffff;">Tax</strong></td>
          <td style="padding: 8px 0; color: #cccccc; border-top: 1px solid #1a1a1a;">{{tax_amount}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #cccccc; border-top: 1px solid #1a1a1a;"><strong style="color: #ffffff;">Discount</strong></td>
          <td style="padding: 8px 0; color: #c5303b; border-top: 1px solid #1a1a1a;">{{discount_amount}}</td>
        </tr>
        <tr style="border-top: 2px solid #333333;">
          <td style="padding: 12px 0; color: #ffffff;"><strong style="font-size: 16px;">Total</strong></td>
          <td style="padding: 12px 0; color: #c5303b; font-weight: 600; font-size: 20px; text-align: right;"><strong>{{order_total}}</strong></td>
        </tr>
      </table>
    </div>
    
    <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-top: 32px; margin-bottom: 8px;">If you have any questions about your order, please contact us at <a href="mailto:info@simfab.com" style="color: #c5303b; text-decoration: none;">info@simfab.com</a> or reply to this email.</p>
    
    <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-top: 24px;">Thank you for choosing SimFab!</p>
  </div>',
  'customer',
  ARRAY[]::text[],
  'order.created',
  true
)
ON CONFLICT (type) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  recipient_type = EXCLUDED.recipient_type,
  trigger_event = EXCLUDED.trigger_event,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

