# 🚀 SimFab Server - Quick Start Guide

## Prerequisites

1. **PostgreSQL** installed and running
2. **Node.js** 18+ installed
3. **Database created**: `simfab_dev`

---

## Step 1: Create Database

```bash
# Using psql
psql -U postgres
CREATE DATABASE simfab_dev;
\q

# Or using createdb command
createdb simfab_dev
```

---

## Step 2: Configure Environment

Create a `.env` file in the `server/` directory:

```env
DATABASE_URL=postgresql://localhost:5432/simfab_dev
NODE_ENV=development
SESSION_SECRET=your-secret-key-change-in-production
PORT=3001
```

---

## Step 3: Install Dependencies

```bash
cd server
npm install
```

---

## Step 4: Run Migrations

```bash
# Check migration status
npm run migrate:status

# Run all migrations
npm run migrate:up
```

Expected output:
```
✅ Migrations table initialized
📦 Found 16 migration files

🔄 Executing migration: 001_create_users_enhancements.sql
✅ Migration completed: 001_create_users_enhancements.sql

🔄 Executing migration: 002_create_user_addresses.sql
✅ Migration completed: 002_create_user_addresses.sql

... (14 more)

✅ All migrations completed successfully!
```

---

## Step 5: Verify Database

```bash
# Test database connection
npm run db:test
```

Expected output:
```
✅ Database connection established successfully
```

Check tables in PostgreSQL:
```bash
psql -U postgres simfab_dev
\dt
```

You should see **35 tables**:
- products (enhanced)
- product_images
- product_colors
- product_variations
- variation_options
- product_addons
- addon_options
- product_faqs
- assembly_manuals
- product_additional_info
- users (enhanced)
- user_addresses
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
- admin_activity_logs
- system_settings
- migrations
- user_sessions
- newsletter_subscriptions
- newsletter_campaigns
- newsletter_tracking
- product_views
- product_relationships
- search_queries
- product_reviews
- review_votes
- review_images

---

## Step 6: Start Development Server

```bash
npm run dev
```

Server should start on `http://localhost:3001`

---

## Testing the Server

### Health Check
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-10-09T..."
}
```

### API Root
```bash
curl http://localhost:3001/
```

---

## Common Commands

```bash
# Development
npm run dev                  # Start dev server with hot reload

# Migrations
npm run migrate:status       # Check which migrations have run
npm run migrate:up           # Run all pending migrations
npm run migrate:down         # Rollback last migration
npm run migrate:down 3       # Rollback last 3 migrations

# Database
npm run db:test             # Test database connection

# Production
npm run build               # Compile TypeScript
npm start                   # Start production server
```

---

## Troubleshooting

### Database Connection Failed
```bash
# Check if PostgreSQL is running
pg_isready

# Check connection string
echo $DATABASE_URL

# Verify credentials
psql postgresql://localhost:5432/simfab_dev
```

### Migration Failed
Migrations use transactions, so failed migrations are automatically rolled back.

Fix the issue and run `npm run migrate:up` again.

### Port Already in Use
```bash
# Change port in .env
PORT=3002

# Or kill process using port 3001
# On Windows:
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# On Mac/Linux:
lsof -ti:3001 | xargs kill
```

---

## Project Structure

```
server/
├── src/
│   ├── config/              # Configuration files
│   │   └── database.ts      # Database connection
│   ├── controllers/         # Request handlers
│   ├── middleware/          # Express middleware
│   │   ├── auth.ts         # Authentication
│   │   ├── errorHandler.ts # Error handling
│   │   ├── rateLimiter.ts  # Rate limiting
│   │   └── validation.ts   # Input validation
│   ├── migrations/          # Database migrations
│   │   ├── migrate.ts      # Migration runner
│   │   └── sql/            # SQL migration files
│   ├── models/             # Data models
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   └── utils/              # Helper functions
│       ├── errors.ts       # Custom errors
│       └── response.ts     # Response helpers
├── dist/                   # Compiled JavaScript
├── .env                    # Environment variables
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript config
```

---

## Next Steps

1. ✅ Database is set up and migrated
2. ✅ Server infrastructure is ready
3. 🔄 **Next**: Implement Product API endpoints
4. 🔄 **Then**: Implement Cart API
5. 🔄 **Then**: Implement Order API

---

## Need Help?

- Check `PHASE_1_COMPLETE.md` for detailed documentation
- Check `IMPLEMENTATION_TODO.md` for full roadmap
- Check `server/src/migrations/README.md` for migration details
- Check individual files for inline documentation

---

## Quick Reference

### Environment Variables
```env
DATABASE_URL              # PostgreSQL connection string
NODE_ENV                  # development | production
SESSION_SECRET            # Session encryption key
PORT                      # Server port (default: 3001)
PAYPAL_CLIENT_ID         # PayPal credentials
PAYPAL_CLIENT_SECRET     # PayPal credentials
SHIPSTATION_API_KEY      # ShipStation credentials
SENDGRID_API_KEY         # Email service credentials
```

### npm Scripts
```bash
dev                      # Development server
build                    # Compile TypeScript
start                    # Production server
migrate:up               # Run migrations
migrate:down             # Rollback migrations
migrate:status           # Check migration status
db:test                  # Test database connection
```

---

**Ready to build!** 🚀


