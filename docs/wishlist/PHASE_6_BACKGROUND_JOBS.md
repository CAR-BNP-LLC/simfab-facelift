# Phase 6: Background Jobs

**Status**: ⏳ Pending  
**Duration**: Week 3  
**Dependencies**: Phase 5 complete  
**Priority**: High

---

## Overview

This phase sets up cron jobs to automatically check wishlist items for sales and stock availability on a scheduled basis.

---

## Objectives

- [ ] Add cron jobs to CronService
- [ ] Configure sale checker (hourly)
- [ ] Configure stock checker (every 30 minutes)
- [ ] Test cron job execution
- [ ] Add error handling and logging
- [ ] Monitor job performance

---

## Implementation

### 1. Update CronService Registration

**File**: `server/src/index.ts` (update existing)

Add wishlist notification cron jobs:

```typescript
import { CronService } from './services/CronService';
import { WishlistNotificationService } from './services/WishlistNotificationService';
import { Pool } from 'pg';

// Initialize pool (use existing pool if available)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/simfab_dev',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Initialize services
const cronService = new CronService();
const wishlistNotificationService = new WishlistNotificationService(pool);

// Initialize cron jobs (after cronService.initialize() if needed)
// CronService should already be initialized, but check existing code

// Wishlist sale checker - runs every hour
cronService.addJob(
  'wishlist-sale-check',
  {
    schedule: '0 * * * *', // Every hour at minute 0
    enabled: process.env.WISHLIST_SALE_CHECK_ENABLED !== 'false', // Enable by default, can disable via env
    description: 'Check wishlist items for sales and send notifications',
    timezone: 'America/New_York', // Adjust to your timezone
  },
  async () => {
    try {
      console.log('🔄 Running wishlist sale check...');
      const result = await wishlistNotificationService.checkSales();
      console.log(`✅ Wishlist sale check complete: ${result.notified} notifications sent`);
      
      // Log metrics (optional)
      if (result.errors > 0) {
        console.warn(`⚠️ ${result.errors} errors during wishlist sale check`);
      }
    } catch (error) {
      console.error('❌ Error in wishlist sale check job:', error);
    }
  }
);

// Wishlist stock checker - runs every 30 minutes
cronService.addJob(
  'wishlist-stock-check',
  {
    schedule: '*/30 * * * *', // Every 30 minutes
    enabled: process.env.WISHLIST_STOCK_CHECK_ENABLED !== 'false', // Enable by default
    description: 'Check wishlist items for stock availability and send notifications',
    timezone: 'America/New_York', // Adjust to your timezone
  },
  async () => {
    try {
      console.log('🔄 Running wishlist stock check...');
      const result = await wishlistNotificationService.checkStock();
      console.log(`✅ Wishlist stock check complete: ${result.notified} notifications sent`);
      
      // Log metrics (optional)
      if (result.errors > 0) {
        console.warn(`⚠️ ${result.errors} errors during wishlist stock check`);
      }
    } catch (error) {
      console.error('❌ Error in wishlist stock check job:', error);
    }
  }
);

console.log('✅ Wishlist notification cron jobs registered');
```

### 2. Environment Variables

**File**: `.env` (add)

```env
# Wishlist Notification Jobs
WISHLIST_SALE_CHECK_ENABLED=true
WISHLIST_STOCK_CHECK_ENABLED=true
```

**File**: `env.example` (update)

Add the same variables with defaults.

### 3. Enhanced Logging

**File**: `server/src/services/WishlistNotificationService.ts` (update existing)

Add better logging for cron jobs:

```typescript
// Update checkSales() method
async checkSales(): Promise<NotificationResult> {
  const startTime = Date.now();
  const result: NotificationResult = {
    checked: 0,
    notified: 0,
    errors: 0,
  };

  try {
    const wishlists = await this.wishlistModel.getProductsNeedingSaleNotification();
    result.checked = wishlists.length;

    console.log(`🔍 [Wishlist Sale Check] Checking ${wishlists.length} items...`);

    for (const wishlist of wishlists) {
      try {
        const product = wishlist.product as any;
        const hasGoneOnSale = await this.hasProductGoneOnSale(
          product,
          wishlist.last_sale_notified_at
        );

        if (hasGoneOnSale) {
          await this.sendNotification(wishlist, 'sale');
          result.notified++;
          console.log(`📧 [Wishlist Sale] Notified user ${wishlist.user_id} about ${product.name}`);
        }
      } catch (error) {
        console.error(`❌ [Wishlist Sale] Error for wishlist ${wishlist.id}:`, error);
        result.errors++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `✅ [Wishlist Sale Check] Complete in ${duration}ms: ` +
      `${result.notified} notified, ${result.errors} errors, ${result.checked} checked`
    );
  } catch (error) {
    console.error('❌ [Wishlist Sale Check] Fatal error:', error);
    result.errors++;
  }

  return result;
}

// Similar update for checkStock()
```

### 4. Job Monitoring (Optional)

**File**: `server/src/routes/admin/wishlist-jobs.ts` (optional - create if needed)

Create admin endpoint to view job status:

```typescript
import { Router, Request, Response } from 'express';
import { CronService } from '../../services/CronService';

const router = Router();
const cronService = new CronService();

// GET /api/admin/wishlist-jobs/status
router.get('/status', (req: Request, res: Response) => {
  const saleJob = cronService.getJob('wishlist-sale-check');
  const stockJob = cronService.getJob('wishlist-stock-check');

  res.json({
    success: true,
    data: {
      saleCheck: {
        name: 'wishlist-sale-check',
        enabled: saleJob?.config.enabled || false,
        schedule: saleJob?.config.schedule || '0 * * * *',
        lastRun: saleJob?.lastRun?.toISOString(),
        nextRun: saleJob?.nextRun?.toISOString(),
      },
      stockCheck: {
        name: 'wishlist-stock-check',
        enabled: stockJob?.config.enabled || false,
        schedule: stockJob?.config.schedule || '*/30 * * * *',
        lastRun: stockJob?.lastRun?.toISOString(),
        nextRun: stockJob?.nextRun?.toISOString(),
      },
    },
  });
});

export default router;
```

### 5. Manual Job Trigger (Optional)

**File**: `server/src/routes/admin/wishlist-jobs.ts` (add)

Allow manual triggering for testing:

```typescript
import { WishlistNotificationService } from '../../services/WishlistNotificationService';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/simfab_dev',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const notificationService = new WishlistNotificationService(pool);

// POST /api/admin/wishlist-jobs/trigger-sale-check
router.post('/trigger-sale-check', async (req: Request, res: Response) => {
  try {
    const result = await notificationService.checkSales();
    res.json({
      success: true,
      data: result,
      message: 'Sale check completed',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/admin/wishlist-jobs/trigger-stock-check
router.post('/trigger-stock-check', async (req: Request, res: Response) => {
  try {
    const result = await notificationService.checkStock();
    res.json({
      success: true,
      data: result,
      message: 'Stock check completed',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
```

---

## Cron Schedule Details

### Sale Check: `0 * * * *`

- Runs at minute 0 of every hour
- Examples: 12:00, 1:00, 2:00, etc.
- Reason: Sales typically don't change frequently, hourly is sufficient

### Stock Check: `*/30 * * * *`

- Runs every 30 minutes
- Examples: 12:00, 12:30, 1:00, 1:30, etc.
- Reason: Stock availability changes more frequently, check more often

### Timezone Considerations

Adjust `timezone` in job config to your server's timezone or user's primary timezone:
- `'America/New_York'` (Eastern Time)
- `'America/Chicago'` (Central Time)
- `'America/Los_Angeles'` (Pacific Time)
- `'UTC'` (Coordinated Universal Time)

---

## Testing

### 1. Verify Jobs Are Registered

After server starts, check logs:
```
✅ Cron job 'wishlist-sale-check' scheduled: 0 * * * * (Check wishlist items for sales)
✅ Cron job 'wishlist-stock-check' scheduled: */30 * * * * (Check wishlist items for stock availability)
✅ Wishlist notification cron jobs registered
```

### 2. Test Job Execution (Manual)

Create a test script to run jobs immediately:

**File**: `server/src/scripts/test-wishlist-jobs.ts`

```typescript
import { Pool } from 'pg';
import { WishlistNotificationService } from '../services/WishlistNotificationService';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/simfab_dev',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function testJobs() {
  const service = new WishlistNotificationService(pool);

  console.log('Testing sale check...');
  const saleResult = await service.checkSales();
  console.log('Sale result:', saleResult);

  console.log('\nTesting stock check...');
  const stockResult = await service.checkStock();
  console.log('Stock result:', stockResult);

  await pool.end();
}

testJobs().catch(console.error);
```

Run: `npx ts-node server/src/scripts/test-wishlist-jobs.ts`

### 3. Monitor Job Execution

Watch server logs during scheduled run times. You should see:
```
🔄 Running wishlist sale check...
🔍 [Wishlist Sale Check] Checking 5 items...
📧 [Wishlist Sale] Notified user 123 about Product Name
✅ [Wishlist Sale Check] Complete in 1234ms: 1 notified, 0 errors, 5 checked
✅ Wishlist sale check complete: 1 notifications sent
```

### 4. Test Disabling Jobs

Set environment variables:
```env
WISHLIST_SALE_CHECK_ENABLED=false
WISHLIST_STOCK_CHECK_ENABLED=false
```

Restart server and verify jobs are not scheduled.

---

## Production Considerations

### 1. Resource Management

- Jobs run asynchronously, won't block main server
- Consider limiting batch size if you have many wishlist items
- Monitor database connection pool usage

### 2. Error Recovery

- Jobs continue processing even if individual items fail
- Failed items can be retried on next run
- Consider adding retry logic for transient errors

### 3. Monitoring

- Log job execution times
- Track notification success rates
- Alert on high error rates
- Monitor email sending success

### 4. Scaling

- If you have very large wishlists, consider:
  - Processing in batches
  - Using job queue (Bull, BullMQ) instead of cron
  - Distributing across multiple workers

---

## Checklist

- [ ] Add cron job registration to `server/src/index.ts`
- [ ] Configure sale checker (hourly)
- [ ] Configure stock checker (every 30 minutes)
- [ ] Add environment variables
- [ ] Test job registration (check logs)
- [ ] Test manual job execution
- [ ] Verify jobs run on schedule
- [ ] Test error handling
- [ ] Add logging
- [ ] (Optional) Create admin endpoints for monitoring
- [ ] (Optional) Create admin endpoints for manual triggers
- [ ] Document cron schedules
- [ ] Set timezone appropriately

---

## Troubleshooting

### Jobs Not Running

1. Check `enabled` flag in job config
2. Verify environment variables
3. Check cron syntax is valid
4. Verify CronService is initialized
5. Check server logs for errors

### Jobs Running but Not Sending Emails

1. Verify email service is configured
2. Check email templates exist
3. Verify products meet notification criteria
4. Check email logs for failures
5. Verify user emails are valid

---

## Next Steps

Once Phase 6 is complete, proceed to [Phase 7: Testing & Polish](./PHASE_7_TESTING_POLISH.md).

---

**Status**: Ready to implement  
**Estimated Time**: 1-2 days

