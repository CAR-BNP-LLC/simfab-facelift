# Fix: Wishlist Tables Missing Error

## Problem
```
Error: relation "wishlists" does not exist
```

The `wishlists` and `wishlist_notifications` tables haven't been created yet. The migrations exist but need to be executed.

## Solution: Run Migrations

### Option 1: Run Migration in Docker Container (Recommended)

If your server is running in Docker:

```bash
# Run migration inside the Docker container
docker-compose exec simfab-server npm run migrate:up

# Or if using docker exec directly
docker exec -it <container-name> npm run migrate:up
```

### Option 2: Run Migration Directly Against Database

If you have direct database access:

```bash
# Connect to your PostgreSQL database
psql -h localhost -U your_user -d your_database

# Then run the SQL files directly:
\i server/src/migrations/sql/034_create_wishlist_tables.sql
\i server/src/migrations/sql/035_add_wishlist_email_templates.sql
```

### Option 3: Run Migration Locally (if database config is set)

```bash
cd server
npm run migrate:up
```

## Verify Migration Success

After running migrations, verify tables exist:

```sql
-- Connect to database
psql -h localhost -U your_user -d your_database

-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('wishlists', 'wishlist_notifications');

-- Should return:
-- wishlists
-- wishlist_notifications

-- Check email templates exist
SELECT type, name, is_active 
FROM email_templates 
WHERE type LIKE 'wishlist_%';

-- Should return:
-- wishlist_sale_notification | Wishlist Sale Notification | true
-- wishlist_stock_notification | Wishlist Stock Notification | true
```

## Quick SQL to Run Manually

If you can't use the migration script, run these SQL commands directly:

### 1. Create Wishlist Tables (034_create_wishlist_tables.sql)

```sql
-- Main wishlist table
CREATE TABLE IF NOT EXISTS wishlists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  notify_on_sale BOOLEAN DEFAULT true,
  notify_on_stock BOOLEAN DEFAULT true,
  last_sale_notified_at TIMESTAMP,
  last_stock_notified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_product UNIQUE (user_id, product_id)
);

-- Wishlist notification log
CREATE TABLE IF NOT EXISTS wishlist_notifications (
  id SERIAL PRIMARY KEY,
  wishlist_id INTEGER NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  notification_type VARCHAR(20) NOT NULL,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP,
  email_log_id INTEGER REFERENCES email_logs(id),
  product_price DECIMAL(10,2),
  product_sale_price DECIMAL(10,2),
  product_stock INTEGER,
  product_in_stock VARCHAR(1),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT wishlist_notifications_type_check CHECK (
    notification_type IN ('sale', 'stock')
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON wishlists(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_notify_sale ON wishlists(notify_on_sale, product_id) WHERE notify_on_sale = true;
CREATE INDEX IF NOT EXISTS idx_wishlists_notify_stock ON wishlists(notify_on_stock, product_id) WHERE notify_on_stock = true;

-- Trigger for updated_at (if function exists)
CREATE TRIGGER update_wishlists_updated_at
  BEFORE UPDATE ON wishlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2. Add Email Templates (035_add_wishlist_email_templates.sql)

See the full file: `server/src/migrations/sql/035_add_wishlist_email_templates.sql`

Or run the INSERT statements from that file.

## After Migration

1. Restart your server:
   ```bash
   docker-compose restart simfab-server
   ```

2. Test the endpoint:
   ```bash
   curl http://localhost:3001/api/wishlist \
     -H "Cookie: your-session-cookie"
   ```

3. Test adding to wishlist in the frontend

## Troubleshooting

### Still seeing "relation does not exist"?

1. **Check database connection**: Make sure the server is connecting to the same database where you ran the migrations
2. **Check schema**: If using a specific schema, migrations should target that schema
3. **Check permissions**: Ensure the database user has CREATE TABLE permissions

### Migration script fails?

1. Check `.env` file has correct `DATABASE_URL`
2. Verify database is accessible
3. Check database user has proper permissions
4. Run SQL files directly if needed

## Need Help?

If migrations still fail:
1. Check server logs: `docker-compose logs simfab-server`
2. Verify database connection settings
3. Run SQL files manually using psql or pgAdmin

