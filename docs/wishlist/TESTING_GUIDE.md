# Wishlist System Testing Guide

Complete guide for testing all wishlist functionality.

---

## 🧪 Test Script

A comprehensive test script is available:

```bash
cd server
npm run test:wishlist
```

**Note**: Requires database connection. Make sure your `.env` file has proper `DATABASE_URL`.

---

## 📋 Manual Testing Checklist

### Phase 1: Database & Backend

#### 1.1 Database Migrations
```bash
cd server
npm run migrate:up
```

**Verify**:
- [ ] Migration `034_create_wishlist_tables.sql` executed
- [ ] Migration `035_add_wishlist_email_templates.sql` executed
- [ ] `wishlists` table exists
- [ ] `wishlist_notifications` table exists
- [ ] Email templates `wishlist_sale_notification` and `wishlist_stock_notification` exist

**SQL Check**:
```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('wishlists', 'wishlist_notifications');

-- Check email templates
SELECT type, name, is_active FROM email_templates 
WHERE type LIKE 'wishlist_%';
```

#### 1.2 Backend API Endpoints

**Test Authentication Required**:
```bash
# Should return 401
curl http://localhost:3001/api/wishlist
```

**Test with Authentication** (requires login cookie):
```bash
# Get wishlist
curl -X GET http://localhost:3001/api/wishlist \
  -H "Cookie: your-session-cookie"

# Add to wishlist
curl -X POST http://localhost:3001/api/wishlist \
  -H "Cookie: your-session-cookie" \
  -H "Content-Type: application/json" \
  -d '{"productId": 1}'

# Get count
curl -X GET http://localhost:3001/api/wishlist/count \
  -H "Cookie: your-session-cookie"

# Check specific product
curl -X GET http://localhost:3001/api/wishlist/1/check \
  -H "Cookie: your-session-cookie"

# Bulk check
curl -X GET "http://localhost:3001/api/wishlist/bulk-check?productIds=1,2,3" \
  -H "Cookie: your-session-cookie"

# Remove from wishlist
curl -X DELETE http://localhost:3001/api/wishlist/1 \
  -H "Cookie: your-session-cookie"

# Update preferences
curl -X PUT http://localhost:3001/api/wishlist/1/preferences \
  -H "Cookie: your-session-cookie" \
  -H "Content-Type: application/json" \
  -d '{"notify_on_sale": false, "notify_on_stock": true}'
```

**Expected**: All endpoints return proper JSON responses.

---

### Phase 2: Frontend Core

#### 2.1 Wishlist Button Component

**Test Locations**:
- [ ] Shop page (`/shop`) - heart icon on each product card
- [ ] Product detail page (`/product/:slug`) - wishlist button

**Test Actions**:
1. Go to `/shop`
2. Click heart icon on a product
3. Icon should fill with red color
4. Header wishlist icon should show badge with count

#### 2.2 Wishlist Page

**Navigate**: `http://localhost:5173/wishlist`

**Verify**:
- [ ] Page loads without errors
- [ ] Shows wishlist items if any
- [ ] Shows empty state if no items
- [ ] Product images display
- [ ] Product names and prices display
- [ ] "Add to Cart" buttons work
- [ ] "Remove from Wishlist" buttons work
- [ ] Links to product pages work

#### 2.3 Wishlist Context

**Test**:
- [ ] Wishlist items persist on page refresh
- [ ] Wishlist count updates when adding/removing
- [ ] Wishlist syncs after login
- [ ] Multiple tabs stay in sync (localStorage)

---

### Phase 3: Account Integration

#### 3.1 Header Icon

**Test**:
- [ ] Wishlist icon appears when logged in
- [ ] Wishlist icon hidden when logged out
- [ ] Badge shows correct count
- [ ] Clicking icon navigates to `/wishlist`
- [ ] Badge updates in real-time

#### 3.2 Account Dashboard

**Navigate**: `http://localhost:5173/profile` → Wishlist tab

**Verify**:
- [ ] "Wishlist" tab appears
- [ ] Shows up to 4 recent items
- [ ] Displays wishlist count
- [ ] "View All" button works
- [ ] Product images display
- [ ] Empty state shown if no items

---

### Phase 4: Email Templates

#### 4.1 Verify Templates

**Admin Panel**: `http://localhost:5173/admin` → Email Templates tab

**Verify**:
- [ ] `wishlist_sale_notification` template exists
- [ ] `wishlist_stock_notification` template exists
- [ ] Both templates are active (`is_active = true`)

#### 4.2 Test Template Rendering

**Via Admin Panel**:
1. Go to Admin → Email Templates
2. Select `wishlist_sale_notification`
3. Click "Send Test Email"
4. Enter test email
5. Check email received (or server logs in test mode)

**Verify Template Variables**:
- `{{customer_name}}`
- `{{product_name}}`
- `{{product_url}}`
- `{{product_image}}`
- `{{regular_price}}`
- `{{sale_price}}`
- `{{discount_amount}}`
- `{{discount_percent}}`
- `{{stock_quantity}}`
- `{{unsubscribe_url}}`

---

### Phase 5 & 6: Notification Service & Background Jobs

#### 5.1 Manual Trigger (Admin Endpoints)

**Test Sale Notification**:
```bash
curl -X POST http://localhost:3001/api/admin/wishlist-notifications/check-sales \
  -H "Cookie: admin-session-cookie"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Wishlist sale check completed",
  "data": {
    "checked": 5,
    "notified": 2,
    "errors": 0,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

**Test Stock Notification**:
```bash
curl -X POST http://localhost:3001/api/admin/wishlist-notifications/check-stock \
  -H "Cookie: admin-session-cookie"
```

#### 5.2 View Statistics

```bash
curl -X GET http://localhost:3001/api/admin/wishlist-notifications/stats \
  -H "Cookie: admin-session-cookie"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "notifications": {
      "byType": [
        {
          "notification_type": "sale",
          "total_notifications": 10,
          "sent_count": 8,
          "failed_count": 2
        }
      ],
      "recent": [...]
    },
    "wishlists": {
      "total_wishlists": 25,
      "sale_notifications_enabled": 20,
      "stock_notifications_enabled": 18
    }
  }
}
```

#### 5.3 Cron Jobs

**Check Server Logs**:
```bash
# Watch for cron job execution
docker-compose logs -f server | grep "wishlist"
```

**Expected Logs**:
```
🔄 Running wishlist sale check...
✅ Wishlist sale check complete: 2 notifications sent
🔄 Running wishlist stock check...
✅ Wishlist stock check complete: 1 notifications sent
```

**Verify Schedule**:
- Sale check: Every hour at :00
- Stock check: Every 30 minutes

---

## 🔍 Integration Testing Scenarios

### Scenario 1: Add to Wishlist → Product Goes on Sale

**Steps**:
1. User logs in
2. User adds Product A to wishlist
3. Admin updates Product A to be on sale
4. Wait for cron job OR trigger manually
5. User receives sale notification email

**Verify**:
- [ ] Email sent
- [ ] Email contains correct product info
- [ ] Email shows sale price and discount
- [ ] Notification recorded in `wishlist_notifications` table
- [ ] `last_sale_notified_at` updated in `wishlists` table

### Scenario 2: Out of Stock → Back in Stock

**Steps**:
1. User adds Product B to wishlist
2. Admin sets Product B to out of stock (`in_stock = '0'`)
3. Admin sets Product B back in stock (`in_stock = '1'`, `stock > 0`)
4. Wait for cron job OR trigger manually
5. User receives stock notification email

**Verify**:
- [ ] Email sent
- [ ] Email contains stock quantity
- [ ] Urgency message displayed
- [ ] Notification recorded in database

### Scenario 3: Multiple Users, Same Product

**Steps**:
1. User A adds Product C to wishlist
2. User B adds Product C to wishlist
3. Product C goes on sale
4. Trigger notification check

**Verify**:
- [ ] Both users receive notification
- [ ] Each notification recorded separately
- [ ] No duplicate emails to same user

---

## 🐛 Common Issues & Solutions

### Issue: Database Connection Error
**Error**: `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`

**Solution**:
1. Check `.env` file has `DATABASE_URL`
2. Verify database credentials
3. Ensure database server is running

### Issue: No Email Templates
**Error**: Template not found

**Solution**:
```bash
cd server
npm run migrate:up
# Verify templates created
```

### Issue: Cron Jobs Not Running
**Solution**:
1. Check `WISHLIST_SALE_CHECK_ENABLED=true` in `.env`
2. Check `WISHLIST_STOCK_CHECK_ENABLED=true` in `.env`
3. Restart server
4. Check server logs for cron initialization

### Issue: Notifications Not Sending
**Solution**:
1. Check email service is configured (`EMAIL_SMTP_HOST`, etc.)
2. Check email service is enabled (`EMAIL_ENABLED=true`)
3. Test email sending via admin panel
4. Check `email_logs` table for errors

---

## ✅ Test Completion Checklist

### Backend
- [ ] All migrations executed
- [ ] API endpoints respond correctly
- [ ] Authentication required on all endpoints
- [ ] Validation works (duplicate prevention, etc.)
- [ ] Error handling works

### Frontend
- [ ] Wishlist button works on all pages
- [ ] Wishlist page displays correctly
- [ ] Wishlist context manages state
- [ ] Header icon and badge work
- [ ] Account dashboard integration works

### Notifications
- [ ] Email templates exist and are active
- [ ] Sale notifications trigger correctly
- [ ] Stock notifications trigger correctly
- [ ] Cron jobs run on schedule
- [ ] Manual triggers work via admin endpoints
- [ ] Notifications are deduplicated
- [ ] Statistics endpoint works

### Database
- [ ] Tables created correctly
- [ ] Indexes exist for performance
- [ ] Foreign keys work correctly
- [ ] Notifications are logged

---

## 📊 Performance Testing

### Load Test Wishlist Endpoints

```bash
# Test bulk check with many products
curl "http://localhost:3001/api/wishlist/bulk-check?productIds=$(seq -s, 1 100)" \
  -H "Cookie: session-cookie"
```

### Database Query Performance

```sql
-- Check query performance for wishlist queries
EXPLAIN ANALYZE 
SELECT * FROM wishlists WHERE user_id = 1;

-- Check indexes are used
EXPLAIN ANALYZE
SELECT * FROM wishlists 
WHERE notify_on_sale = true 
  AND product_id IN (1, 2, 3);
```

---

## 🎯 Quick Test Commands

```bash
# Run full test suite
cd server && npm run test:wishlist

# Check migration status
cd server && npm run migrate:status

# Run migrations
cd server && npm run migrate:up

# Check server health
curl http://localhost:3001/health

# Check wishlist stats (admin)
curl http://localhost:3001/api/admin/wishlist-notifications/stats \
  -H "Cookie: admin-cookie"
```

---

## 📝 Test Results Template

After testing, document results:

```
Test Date: ___________
Tester: ___________

Backend Tests: ___/___ passed
Frontend Tests: ___/___ passed
Notification Tests: ___/___ passed
Integration Tests: ___/___ passed

Issues Found:
1. ___________
2. ___________

Notes:
___________
```

---

## 🚀 Ready for Production?

Before going live, verify:

- [ ] All tests pass
- [ ] Email service configured for production
- [ ] Cron jobs configured with correct timezone
- [ ] Rate limiting enabled on endpoints
- [ ] Error logging configured
- [ ] Database backups in place
- [ ] Monitoring alerts set up

---

**Happy Testing!** 🧪✨

