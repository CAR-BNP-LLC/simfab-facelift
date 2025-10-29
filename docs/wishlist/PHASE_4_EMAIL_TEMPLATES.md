# Phase 4: Email Templates

**Status**: ⏳ Pending  
**Duration**: Week 2  
**Dependencies**: Email service system (existing)  
**Priority**: Medium

---

## Overview

This phase creates and configures email templates for wishlist sale and stock notifications.

---

## Objectives

- [ ] Create sale notification email template
- [ ] Create stock notification email template
- [ ] Add templates to database via migration
- [ ] Test template rendering
- [ ] Verify template variables

---

## Email Templates

### 1. Sale Notification Template

**Template Type**: `wishlist_sale_notification`

**Subject**: `Great news! {{product_name}} is now on sale!`

**HTML Body**:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Hi {{customer_name}},</h2>
  
  <p>Good news! <strong>{{product_name}}</strong> from your wishlist is now on sale.</p>
  
  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
      <span style="color: #666;">Regular Price:</span>
      <span style="text-decoration: line-through; color: #999;">${{regular_price}}</span>
    </div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
      <span style="color: #666;">Sale Price:</span>
      <span style="color: #dc2626; font-weight: bold; font-size: 24px;">${{sale_price}}</span>
    </div>
    <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid #ddd;">
      <span style="color: #666;">You Save:</span>
      <span style="color: #059669; font-weight: bold;">${{discount_amount}} ({{discount_percent}}% off)</span>
    </div>
  </div>

  <div style="margin: 30px 0;">
    <a href="{{product_url}}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
      View Product
    </a>
    <a href="{{product_url}}" style="background-color: #333; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Add to Cart
    </a>
  </div>

  {{#if product_image}}
  <div style="margin: 20px 0;">
    <img src="{{product_image}}" alt="{{product_name}}" style="max-width: 100%; border-radius: 8px;" />
  </div>
  {{/if}}

  <p style="color: #666; font-size: 12px; margin-top: 30px;">
    You can manage your wishlist notification preferences 
    <a href="{{unsubscribe_url}}" style="color: #dc2626;">here</a>.
  </p>
</div>
```

**Text Body**:

```
Hi {{customer_name}},

Good news! {{product_name}} from your wishlist is now on sale.

Regular Price: ${{regular_price}}
Sale Price: ${{sale_price}}
You Save: ${{discount_amount}} ({{discount_percent}}% off)

View Product: {{product_url}}

You can manage your wishlist notification preferences here: {{unsubscribe_url}}
```

### 2. Stock Notification Template

**Template Type**: `wishlist_stock_notification`

**Subject**: `{{product_name}} is back in stock!`

**HTML Body**:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Hi {{customer_name}},</h2>
  
  <p>Great news! <strong>{{product_name}}</strong> from your wishlist is now back in stock.</p>

  {{#if stock_quantity}}
  <p style="color: #666; font-size: 14px;">
    <strong>Stock Available:</strong> {{stock_quantity}} {{#if stock_quantity}}items{{else}}item{{/if}}
  </p>
  {{/if}}

  <div style="background-color: #fff7ed; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 0; color: #92400e;">
      <strong>⚠️ Stock is limited, so don't wait!</strong>
    </p>
  </div>

  <div style="margin: 30px 0;">
    <a href="{{product_url}}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
      Hurry! Get yours now
    </a>
    <a href="{{product_url}}" style="background-color: #333; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      View Product
    </a>
  </div>

  {{#if product_image}}
  <div style="margin: 20px 0;">
    <img src="{{product_image}}" alt="{{product_name}}" style="max-width: 100%; border-radius: 8px;" />
  </div>
  {{/if}}

  <p style="color: #666; font-size: 12px; margin-top: 30px;">
    You can manage your wishlist notification preferences 
    <a href="{{unsubscribe_url}}" style="color: #dc2626;">here</a>.
  </p>
</div>
```

**Text Body**:

```
Hi {{customer_name}},

Great news! {{product_name}} from your wishlist is now back in stock.

{{#if stock_quantity}}
Stock Available: {{stock_quantity}} items
{{/if}}

⚠️ Stock is limited, so don't wait!

View Product: {{product_url}}

You can manage your wishlist notification preferences here: {{unsubscribe_url}}
```

---

## Database Migration

**File**: `server/src/migrations/sql/035_add_wishlist_email_templates.sql`

```sql
-- ============================================================================
-- Wishlist Email Templates Migration
-- Migration: 035_add_wishlist_email_templates.sql
-- Description: Adds email templates for wishlist sale and stock notifications
-- ============================================================================

-- Insert sale notification template
INSERT INTO email_templates (
  type,
  name,
  subject,
  html_body,
  text_body,
  is_active,
  created_at,
  updated_at
) VALUES (
  'wishlist_sale_notification',
  'Wishlist Sale Notification',
  'Great news! {{product_name}} is now on sale!',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">Hi {{customer_name}},</h2>
    
    <p>Good news! <strong>{{product_name}}</strong> from your wishlist is now on sale.</p>
    
    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span style="color: #666;">Regular Price:</span>
        <span style="text-decoration: line-through; color: #999;">${{regular_price}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span style="color: #666;">Sale Price:</span>
        <span style="color: #dc2626; font-weight: bold; font-size: 24px;">${{sale_price}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid #ddd;">
        <span style="color: #666;">You Save:</span>
        <span style="color: #059669; font-weight: bold;">${{discount_amount}} ({{discount_percent}}% off)</span>
      </div>
    </div>

    <div style="margin: 30px 0;">
      <a href="{{product_url}}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
        View Product
      </a>
      <a href="{{product_url}}" style="background-color: #333; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Add to Cart
      </a>
    </div>

    {{#if product_image}}
    <div style="margin: 20px 0;">
      <img src="{{product_image}}" alt="{{product_name}}" style="max-width: 100%; border-radius: 8px;" />
    </div>
    {{/if}}

    <p style="color: #666; font-size: 12px; margin-top: 30px;">
      You can manage your wishlist notification preferences 
      <a href="{{unsubscribe_url}}" style="color: #dc2626;">here</a>.
    </p>
  </div>',
  'Hi {{customer_name}},

Good news! {{product_name}} from your wishlist is now on sale.

Regular Price: ${{regular_price}}
Sale Price: ${{sale_price}}
You Save: ${{discount_amount}} ({{discount_percent}}% off)

View Product: {{product_url}}

You can manage your wishlist notification preferences here: {{unsubscribe_url}}',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (type) DO NOTHING;

-- Insert stock notification template
INSERT INTO email_templates (
  type,
  name,
  subject,
  html_body,
  text_body,
  is_active,
  created_at,
  updated_at
) VALUES (
  'wishlist_stock_notification',
  'Wishlist Stock Notification',
  '{{product_name}} is back in stock!',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">Hi {{customer_name}},</h2>
    
    <p>Great news! <strong>{{product_name}}</strong> from your wishlist is now back in stock.</p>

    {{#if stock_quantity}}
    <p style="color: #666; font-size: 14px;">
      <strong>Stock Available:</strong> {{stock_quantity}} items
    </p>
    {{/if}}

    <div style="background-color: #fff7ed; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #92400e;">
        <strong>⚠️ Stock is limited, so don''t wait!</strong>
      </p>
    </div>

    <div style="margin: 30px 0;">
      <a href="{{product_url}}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
        Hurry! Get yours now
      </a>
      <a href="{{product_url}}" style="background-color: #333; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        View Product
      </a>
    </div>

    {{#if product_image}}
    <div style="margin: 20px 0;">
      <img src="{{product_image}}" alt="{{product_name}}" style="max-width: 100%; border-radius: 8px;" />
    </div>
    {{/if}}

    <p style="color: #666; font-size: 12px; margin-top: 30px;">
      You can manage your wishlist notification preferences 
      <a href="{{unsubscribe_url}}" style="color: #dc2626;">here</a>.
    </p>
  </div>',
  'Hi {{customer_name}},

Great news! {{product_name}} from your wishlist is now back in stock.

{{#if stock_quantity}}
Stock Available: {{stock_quantity}} items
{{/if}}

⚠️ Stock is limited, so don''t wait!

View Product: {{product_url}}

You can manage your wishlist notification preferences here: {{unsubscribe_url}}',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (type) DO NOTHING;
```

---

## Template Variables

### Sale Notification Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `customer_name` | User's first name | "John" |
| `product_name` | Product name | "Sim Racing Cockpit" |
| `product_url` | Link to product page | "https://example.com/product/sim-racing-cockpit" |
| `product_image` | Product primary image URL | "https://example.com/images/product.jpg" |
| `regular_price` | Original price | "299.99" |
| `sale_price` | Sale price | "249.99" |
| `discount_amount` | Amount saved | "50.00" |
| `discount_percent` | Discount percentage | "17" |
| `unsubscribe_url` | Link to manage preferences | "https://example.com/account/wishlist" |

### Stock Notification Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `customer_name` | User's first name | "John" |
| `product_name` | Product name | "Sim Racing Cockpit" |
| `product_url` | Link to product page | "https://example.com/product/sim-racing-cockpit" |
| `product_image` | Product primary image URL | "https://example.com/images/product.jpg" |
| `stock_quantity` | Available stock (optional) | "5" |
| `unsubscribe_url` | Link to manage preferences | "https://example.com/account/wishlist" |

---

## Template Testing

### 1. Test Template Retrieval

**File**: `server/src/scripts/test-wishlist-templates.ts` (create)

```typescript
import { Pool } from 'pg';
import { EmailService } from '../services/EmailService';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/simfab_dev',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function testTemplates() {
  const emailService = new EmailService(pool);
  await emailService.initialize();

  // Test sale template
  console.log('Testing sale notification template...');
  const saleTemplate = await emailService.getTemplate('wishlist_sale_notification');
  console.log('Sale template:', saleTemplate ? 'Found' : 'Not found');

  // Test stock template
  console.log('Testing stock notification template...');
  const stockTemplate = await emailService.getTemplate('wishlist_stock_notification');
  console.log('Stock template:', stockTemplate ? 'Found' : 'Not found');

  // Test variable replacement
  if (saleTemplate) {
    const testVariables = {
      customer_name: 'John Doe',
      product_name: 'Test Product',
      product_url: 'https://example.com/product/test',
      product_image: 'https://example.com/image.jpg',
      regular_price: '299.99',
      sale_price: '249.99',
      discount_amount: '50.00',
      discount_percent: '17',
      unsubscribe_url: 'https://example.com/account/wishlist',
    };

    console.log('\nTesting variable replacement...');
    // Test would go here
  }

  await pool.end();
}

testTemplates().catch(console.error);
```

### 2. Manual Testing

1. Run migration: `035_add_wishlist_email_templates.sql`
2. Verify templates exist in database:
   ```sql
   SELECT type, name, is_active FROM email_templates 
   WHERE type IN ('wishlist_sale_notification', 'wishlist_stock_notification');
   ```
3. Use admin email template editor to preview templates
4. Test variable replacement manually

---

## Checklist

- [ ] Create sale notification template HTML
- [ ] Create sale notification template text version
- [ ] Create stock notification template HTML
- [ ] Create stock notification template text version
- [ ] Create migration file
- [ ] Run migration
- [ ] Verify templates in database
- [ ] Test template retrieval
- [ ] Test variable replacement
- [ ] Preview templates in admin UI (if available)
- [ ] Verify templates use existing email wrapper/styling

---

## Notes

- Templates will use the existing `EmailTemplateWrapper` for consistent styling
- Templates support Handlebars-style variable syntax (check your template engine)
- Ensure templates match existing email design system
- Unsubscribe URL should link to account/wishlist preferences page

---

## Next Steps

Once Phase 4 is complete, proceed to [Phase 5: Notification Service](./PHASE_5_NOTIFICATION_SERVICE.md).

---

**Status**: Ready to implement  
**Estimated Time**: 1 day

