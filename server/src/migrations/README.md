# Database Migrations

This directory contains SQL migration files for the SimFab database schema.

## Migration System

The migration system is built with TypeScript and uses PostgreSQL transactions to ensure data integrity. Each migration can be run independently, and the system tracks which migrations have been executed.

## Running Migrations

```bash
# Run all pending migrations
npm run migrate:up

# Check migration status
npm run migrate:status

# Rollback last migration
npm run migrate:down

# Rollback multiple migrations
npm run migrate:down 3
```

## Migration Files

Migrations are executed in numerical order:

1. **001_create_users_enhancements.sql** - Adds role, phone, company, email verification fields to users table
2. **002_create_user_addresses.sql** - Creates user_addresses table for shipping/billing addresses
3. **003_enhance_products_table.sql** - Adds slug, status, featured, JSONB fields, SEO to products table
4. **004_create_product_images.sql** - Creates product_images table with gallery support
5. **005_create_product_colors.sql** - Creates product_colors table for color variations
6. **006_create_product_variations.sql** - Creates product_variations and variation_options tables
7. **007_create_product_addons.sql** - Creates product_addons and addon_options tables
8. **008_create_product_additional_content.sql** - Creates product_faqs, assembly_manuals, product_additional_info tables
9. **009_create_carts.sql** - Creates carts and cart_items tables with configuration support
10. **010_create_orders.sql** - Creates orders, order_items, order_status_history tables
11. **011_create_payments_shipments.sql** - Creates payments, refunds, shipments, shipment_tracking_events tables
12. **012_create_coupons.sql** - Creates coupons and coupon_usage tables
13. **013_create_admin_tables.sql** - Creates admin_activity_logs and system_settings tables
14. **014_create_recommendations_tables.sql** - Creates product_views, product_relationships, search_queries tables
15. **015_create_newsletter_enhancements.sql** - Enhances newsletter_subscriptions, creates newsletter_campaigns, newsletter_tracking tables
16. **016_create_reviews_ratings.sql** - Creates product_reviews, review_votes, review_images tables

## Total Database Schema

After running all migrations, the database will have **35 tables**:

### Core Tables
- users
- user_addresses
- products
- product_images
- product_colors
- product_variations
- variation_options
- product_addons
- addon_options
- product_faqs
- assembly_manuals
- product_additional_info

### E-commerce Tables
- carts
- cart_items
- orders
- order_items
- order_status_history
- payments
- refunds
- shipments
- shipment_tracking_events
- coupons
- coupon_usage

### Admin & System Tables
- admin_activity_logs
- system_settings
- user_sessions (created by connect-pg-simple)
- migrations (tracks migration execution)

### Marketing & Analytics Tables
- newsletter_subscriptions
- newsletter_campaigns
- newsletter_tracking
- product_views
- product_relationships
- search_queries
- product_reviews
- review_votes
- review_images

## Features

### Automatic Triggers
- **updated_at timestamps**: Automatically updated on record modification
- **Order number generation**: Auto-generates unique order numbers (SF-YYYYMMDD-00001)
- **Order status tracking**: Logs all status changes automatically
- **Single primary image/option**: Ensures only one primary image or default option per product
- **Coupon usage counting**: Automatically increments usage counts
- **Cart timestamp updates**: Updates cart when items are modified

### Database Functions
- `update_updated_at_column()` - Updates timestamp on row modification
- `generate_order_number()` - Generates unique order numbers
- `log_order_status_change()` - Logs order status changes
- `ensure_one_primary_image()` - Ensures only one primary image
- `ensure_one_default_option()` - Ensures only one default variation option
- `update_cart_timestamp()` - Updates cart modification time
- `increment_coupon_usage()` - Increments coupon usage count
- `update_review_vote_count()` - Updates review helpful counts
- `update_product_view()` - Updates product view counts

### Performance Indexes

All major tables have proper indexes:
- User lookup by email and role
- Product search by slug, SKU, status, featured
- Full-text search on product name/description
- Order lookup by number, user, status
- Cart lookup by session and user
- All foreign key relationships

### Data Integrity

- Foreign key constraints with appropriate ON DELETE actions
- Check constraints for enum-like fields (status, role, etc.)
- Unique constraints for important fields
- NOT NULL constraints for required fields
- Price validation (must be >= 0)
- Quantity validation (must be > 0)
- Rating validation (must be 1-5)

## Creating New Migrations

1. Create a new SQL file with incremental numbering: `017_your_migration_name.sql`
2. Write your SQL DDL statements
3. Add appropriate indexes and comments
4. Test the migration locally
5. Run `npm run migrate:up` to apply

## Best Practices

1. **Always use transactions**: The migration system wraps each migration in a transaction
2. **Add comments**: Use SQL COMMENT statements to document tables and columns
3. **Create indexes**: Add indexes for frequently queried columns
4. **Use constraints**: Add CHECK, UNIQUE, and FOREIGN KEY constraints
5. **Handle existing data**: Use ALTER TABLE ... IF NOT EXISTS for safety
6. **Test rollbacks**: Create rollback files (*.rollback.sql) for reversible migrations

## Environment Variables

Required in `.env`:
```
DATABASE_URL=postgresql://localhost:5432/simfab_dev
NODE_ENV=development
```

## Troubleshooting

### Migration fails midway
All migrations use transactions, so failed migrations will be rolled back automatically. Fix the SQL error and run `npm run migrate:up` again.

### Migration already executed
The system tracks executed migrations. Use `npm run migrate:status` to see which migrations have run.

### Need to rollback
Create a `.rollback.sql` file with the same name as the migration to enable rollback:
```bash
# Example: 001_create_users_enhancements.rollback.sql
ALTER TABLE users DROP COLUMN IF EXISTS phone;
ALTER TABLE users DROP COLUMN IF EXISTS company;
-- etc.
```

Then run: `npm run migrate:down`

## Database Connection Test

Test your database connection:
```bash
npm run db:test
```

## Initial Setup

1. Create PostgreSQL database:
   ```bash
   createdb simfab_dev
   ```

2. Set environment variables in `.env`

3. Run migrations:
   ```bash
   npm run migrate:up
   ```

4. Check status:
   ```bash
   npm run migrate:status
   ```

5. Start the server:
   ```bash
   npm run dev
   ```

## Schema Overview

The database schema supports:
- ✅ Complex product configurations (colors, variations, add-ons)
- ✅ Guest and logged-in shopping carts
- ✅ Complete order lifecycle management
- ✅ PayPal payment tracking
- ✅ Shipping and tracking integration
- ✅ Discount coupons and promotions
- ✅ Product recommendations
- ✅ Product reviews and ratings
- ✅ Newsletter campaigns
- ✅ Admin activity logging
- ✅ System configuration
- ✅ Performance optimized with indexes


