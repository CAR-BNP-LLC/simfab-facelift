# Email Templates Reference

This document describes all email templates available in the SimFab email service system.

---

## Base Template Structure

All emails use a common base template with:
- **Header**: SimFab branding with red (#dc2626)
- **Content**: Dynamic email content
- **Footer**: Contact info and copyright

### Base HTML Structure
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9f9f9; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .button { display: inline-block; padding: 12px 24px; background: #dc2626; color: white; 
              text-decoration: none; border-radius: 4px; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f5f5f5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SimFab</h1>
    </div>
    <div class="content">
      {{CONTENT}}
    </div>
    <div class="footer">
      <p>&copy; 2024 SimFab. All rights reserved.</p>
      <p>Questions? Contact us at info@simfab.com</p>
      <p><a href="https://www.simfab.com">www.simfab.com</a></p>
    </div>
  </div>
</body>
</html>
```

---

## Template Reference

### 1. New Order (Admin)
**Type**: `new_order_admin`  
**Recipient**: `info@simfab.com`  
**Trigger**: When a new order is placed

**Available Variables**:
- `{{order_number}}` - Order number (e.g., SF-20240101-00001)
- `{{customer_name}}` - Customer email
- `{{customer_email}}` - Customer email
- `{{order_total}}` - Total amount
- `{{order_date}}` - Order date
- `{{subtotal}}` - Subtotal amount
- `{{tax_amount}}` - Tax amount
- `{{shipping_amount}}` - Shipping amount
- `{{discount_amount}}` - Discount amount

---

### 2. Order Processing (Customer)
**Type**: `order_processing`  
**Recipient**: Customer  
**Trigger**: When order status changes to "processing"

**Available Variables**:
- `{{order_number}}` - Order number
- `{{customer_name}}` - Customer name
- `{{order_total}}` - Total amount
- `{{order_date}}` - Order date

---

### 3. Order Completed (Customer)
**Type**: `order_completed`  
**Recipient**: Customer  
**Trigger**: When order status changes to "completed" or "delivered"

**Available Variables**:
- `{{order_number}}` - Order number
- `{{customer_name}}` - Customer name
- `{{order_total}}` - Total amount
- `{{tracking_number}}` - Tracking number (if provided)
- `{{carrier}}` - Shipping carrier (if provided)

---

### 4. Order Cancelled (Customer)
**Type**: `order_cancelled_customer`  
**Recipient**: Customer  
**Trigger**: When order is cancelled

**Available Variables**:
- `{{order_number}}` - Order number
- `{{customer_name}}` - Customer name
- `{{order_total}}` - Total amount
- `{{order_date}}` - Order date

---

### 5. Order Cancelled (Admin)
**Type**: `order_cancelled_admin`  
**Recipient**: `info@simfab.com`  
**Trigger**: When order is cancelled

**Available Variables**:
- `{{order_number}}` - Order number
- `{{customer_name}}` - Customer name
- `{{customer_email}}` - Customer email
- `{{cancellation_reason}}` - Reason for cancellation

---

### 6. Order Failed (Admin)
**Type**: `order_failed_admin`  
**Recipient**: `info@simfab.com`  
**Trigger**: When payment fails

**Available Variables**:
- `{{order_number}}` - Order number
- `{{customer_email}}` - Customer email
- `{{error_message}}` - Error message

---

### 7. Order Failed (Customer)
**Type**: `order_failed_customer`  
**Recipient**: Customer  
**Trigger**: When payment fails

**Available Variables**:
- `{{order_number}}` - Order number
- `{{customer_name}}` - Customer name
- `{{order_total}}` - Total amount

---

### 8. Order On Hold
**Type**: `order_on_hold`  
**Recipient**: Customer  
**Trigger**: When order is placed on hold

**Available Variables**:
- `{{order_number}}` - Order number
- `{{customer_name}}` - Customer name

---

### 9. Order Refunded
**Type**: `order_refunded`  
**Recipient**: Customer  
**Trigger**: When order is refunded

**Available Variables**:
- `{{order_number}}` - Order number
- `{{customer_name}}` - Customer name
- `{{refund_amount}}` - Refund amount

---

### 10. Order Details
**Type**: `order_details`  
**Recipient**: Customer  
**Trigger**: Manual or on-demand

**Available Variables**:
- `{{order_number}}` - Order number
- `{{customer_name}}` - Customer name
- `{{order_total}}` - Total amount
- `{{order_date}}` - Order date

---

### 11. Customer Note
**Type**: `customer_note`  
**Recipient**: Customer  
**Trigger**: When admin adds a note

**Available Variables**:
- `{{order_number}}` - Order number
- `{{customer_name}}` - Customer name
- `{{note}}` - Admin's note

---

### 12. Reset Password
**Type**: `reset_password`  
**Recipient**: User  
**Trigger**: When password reset is requested

**Available Variables**:
- `{{reset_url}}` - Password reset link
- `{{expire_hours}}` - Expiration time (e.g., "15 minutes")
- `{{customer_name}}` - User's name

**Security Note**: Link expires in 15 minutes

---

### 13. New Account
**Type**: `new_account`  
**Recipient**: User  
**Trigger**: When new account is created

**Available Variables**:
- `{{customer_name}}` - User's name
- `{{login_url}}` - Login page URL

---

## Variables Reference

### All Order Emails
```
{{order_number}} - Order number (SF-YYYYMMDD-00001)
{{order_date}} - Order date (formatted)
{{order_total}} - Total amount ($XXX.XX)
{{customer_name}} - Customer's name or email
{{customer_email}} - Customer's email
```

### Financial Variables
```
{{subtotal}} - Subtotal amount
{{tax_amount}} - Tax amount
{{shipping_amount}} - Shipping amount
{{discount_amount}} - Discount amount
```

### Shipping Variables
```
{{tracking_number}} - Tracking number
{{tracking_url}} - Tracking URL
{{carrier}} - Shipping carrier
{{estimated_delivery}} - Estimated delivery date
```

### Account Variables
```
{{reset_url}} - Password reset URL
{{login_url}} - Login page URL
{{username}} - Username
```

---

## Template Customization

Admins can customize all email templates via the admin dashboard:

1. Go to Admin Dashboard → Email Templates tab
2. Select a template from the list
3. Edit the subject line and HTML body
4. Use `{{variable}}` syntax for dynamic content
5. Click "Save Template"
6. Click "Send Test" to preview

---

## Design Guidelines

### Email Best Practices

1. **Mobile-Friendly**: Use responsive design
2. **Clear Headers**: Use descriptive subject lines
3. **Action Buttons**: Use prominent buttons for CTAs
4. **Consistent Branding**: SimFab red (#dc2626)
5. **Readable Font**: Arial, 14px or larger
6. **Short & Focused**: Keep emails concise

### HTML Guidelines

- Use inline styles (email clients don't support `<style>` tags well)
- Use tables for layout (reliable across email clients)
- Avoid JavaScript (not supported in emails)
- Test in multiple email clients
- Keep HTML simple and clean

---

## Testing Templates

### Test Mode
In test mode (default), emails are logged to the console instead of being sent.

### Production Mode
In production mode, emails are sent via SMTP to actual recipients.

### How to Test
1. Go to Admin Dashboard → Email Templates
2. Select a template
3. Enter your email address in "Test Email"
4. Click "Send Test"
5. Check console logs or your inbox

---

## Template Examples

All templates start simple and can be customized by admins. Example default templates are already in the database migration.

---

**Last Updated**: 2024  
**Total Templates**: 13

