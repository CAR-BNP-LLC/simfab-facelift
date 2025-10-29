# Phase 5: Email Templates

**Goal**: Create professional HTML email templates  
**Time**: 2-3 hours  
**Priority**: MEDIUM

---

## 📋 Tasks

- [ ] Create base HTML template with SimFab branding
- [ ] Design all 13 email templates
- [ ] Populate with actual content
- [ ] Add variable placeholders
- [ ] Test mobile responsiveness
- [ ] Update database with final templates

---

## 🎨 Base HTML Template

### Structure
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Base styles */
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

## 📧 Template Examples

### 1. New Order (Admin)

**Template Variables:**
- `{{order_number}}`
- `{{customer_name}}`
- `{{customer_email}}`
- `{{order_total}}`
- `{{order_date}}`
- `{{order_items}}`

**HTML:**
```html
<h2>🎉 New Order Received!</h2>
<p>Order Number: <strong>{{order_number}}</strong></p>
<p>Customer: {{customer_name}} ({{customer_email}})</p>
<p>Total: <strong>{{order_total}}</strong></p>
<p>Date: {{order_date}}</p>

<h3>Order Summary</h3>
{{order_items}}
```

---

### 2. Order Processing (Customer)

**HTML:**
```html
<h2>Your Order is Being Processed</h2>
<p>Hi {{customer_name}},</p>
<p>Great news! Your order <strong>#{{order_number}}</strong> is now being processed.</p>
<p>We'll notify you once your order ships.</p>
<p><strong>Order Total:</strong> {{order_total}}</p>
<p>Thank you for your order!</p>
```

---

### 3. Order Completed (Customer)

**HTML:**
```html
<h2>Your Order Has Been Delivered! 🎉</h2>
<p>Hi {{customer_name}},</p>
<p>Your order <strong>#{{order_number}}</strong> has been delivered successfully!</p>
<p>We hope you love your new product. If you have any questions, feel free to reach out.</p>

<p>Tracking: {{tracking_number}}</p>
```

---

### 4. Password Reset

**HTML:**
```html
<h2>Reset Your Password</h2>
<p>Hi {{customer_name}},</p>
<p>You requested to reset your password for your SimFab account.</p>
<p>Click the button below to reset your password:</p>
<a href="{{reset_url}}" class="button">Reset Password</a>
<p>This link will expire in {{expire_hours}} hours.</p>
<p>If you didn't request this, please ignore this email.</p>
```

---

### 5. New Account Welcome

**HTML:**
```html
<h2>Welcome to SimFab! 🎉</h2>
<p>Hi {{customer_name}},</p>
<p>Thank you for creating an account with SimFab!</p>
<p>You can now:</p>
<ul>
  <li>Track your orders</li>
  <li>Save your address for faster checkout</li>
  <li>View your order history</li>
</ul>
<a href="{{login_url}}" class="button">Get Started</a>
```

---

## 📊 Template Variables Reference

### All Emails
```
{{customer_name}} - Customer's full name
{{customer_email}} - Customer's email
```

### Order Emails
```
{{order_number}} - Order number (SF-20240101-00001)
{{order_date}} - Order date
{{order_total}} - Total amount
{{subtotal}} - Subtotal amount
{{tax_amount}} - Tax amount
{{shipping_amount}} - Shipping amount
{{discount_amount}} - Discount amount
{{order_items}} - HTML table of items
```

### Shipping Emails
```
{{tracking_number}} - Tracking number
{{tracking_url}} - Tracking URL
{{carrier}} - Shipping carrier
{{estimated_delivery}} - Estimated delivery date
```

### Account Emails
```
{{reset_url}} - Password reset URL
{{login_url}} - Login page URL
{{username}} - Username
```

---

## 🔄 Update Database Templates

Update templates in database with final HTML:

```sql
UPDATE email_templates SET html_body = '<h2>Final Template</h2>...' WHERE type = 'template_type';
```

Or use the admin UI to update templates directly.

---

## ✅ Success Criteria

- [x] Base template created with SimFab branding
- [x] All 13 templates designed
- [x] Templates are mobile-responsive
- [x] Variables working correctly
- [x] Professional and consistent design
- [x] Templates uploaded to database

---

**Next Phase**: [Phase 6: Testing & Documentation](./PHASE_6_TESTING_DOCUMENTATION.md)

