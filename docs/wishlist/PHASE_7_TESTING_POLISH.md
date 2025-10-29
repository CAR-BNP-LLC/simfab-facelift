# Phase 7: Testing & Polish

**Status**: ⏳ Pending  
**Duration**: Week 4  
**Dependencies**: All previous phases complete  
**Priority**: High

---

## Overview

This phase focuses on comprehensive testing, bug fixes, performance optimization, and final polish before the wishlist feature goes live.

---

## Objectives

- [ ] Write integration tests
- [ ] Write E2E tests
- [ ] Complete manual testing checklist
- [ ] Fix bugs and edge cases
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] Code review

---

## Testing

### 1. Integration Tests

#### Backend Integration Tests

**File**: `server/src/routes/__tests__/wishlist.integration.test.ts`

```typescript
import request from 'supertest';
import express from 'express';
import { Pool } from 'pg';
import wishlistRoutes from '../../routes/wishlist';
import { requireAuth } from '../../middleware/auth';

// Setup test app
const app = express();
app.use(express.json());
app.use('/api/wishlist', requireAuth, wishlistRoutes);

describe('Wishlist API Integration Tests', () => {
  let testUserId: number;
  let testProductId: number;
  let authCookie: string;

  beforeAll(async () => {
    // Setup test data
    // Create test user and product
  });

  afterAll(async () => {
    // Cleanup test data
  });

  describe('GET /api/wishlist', () => {
    it('should return user wishlist', async () => {
      const response = await request(app)
        .get('/api/wishlist')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/wishlist')
        .expect(401);
    });
  });

  describe('POST /api/wishlist', () => {
    it('should add product to wishlist', async () => {
      const response = await request(app)
        .post('/api/wishlist')
        .set('Cookie', authCookie)
        .send({ productId: testProductId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.wishlist).toBeDefined();
    });

    it('should prevent duplicate entries', async () => {
      // Add first time
      await request(app)
        .post('/api/wishlist')
        .set('Cookie', authCookie)
        .send({ productId: testProductId });

      // Try to add again
      const response = await request(app)
        .post('/api/wishlist')
        .set('Cookie', authCookie)
        .send({ productId: testProductId })
        .expect(200);

      // Should update, not duplicate
      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/wishlist/:productId', () => {
    it('should remove product from wishlist', async () => {
      // First add
      await request(app)
        .post('/api/wishlist')
        .set('Cookie', authCookie)
        .send({ productId: testProductId });

      // Then remove
      const response = await request(app)
        .delete(`/api/wishlist/${testProductId}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/wishlist/bulk-check', () => {
    it('should return wishlist status for multiple products', async () => {
      // Add product to wishlist first
      await request(app)
        .post('/api/wishlist')
        .set('Cookie', authCookie)
        .send({ productId: testProductId });

      const response = await request(app)
        .get(`/api/wishlist/bulk-check?productIds=${testProductId},999`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.data[testProductId]).toBe(true);
      expect(response.body.data[999]).toBe(false);
    });
  });
});
```

#### Frontend Integration Tests

**File**: `src/components/__tests__/WishlistButton.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WishlistButton } from '../WishlistButton';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { AuthProvider } from '@/contexts/AuthContext';

describe('WishlistButton', () => {
  it('should toggle wishlist status', async () => {
    render(
      <AuthProvider>
        <WishlistProvider>
          <WishlistButton productId={1} />
        </WishlistProvider>
      </AuthProvider>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toHaveAttribute('aria-label', 'Remove from wishlist');
    });
  });

  it('should redirect to login if not authenticated', () => {
    // Test redirect logic
  });
});
```

### 2. E2E Tests

**File**: `tests/e2e/wishlist.spec.ts` (if using Playwright/Cypress)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Wishlist E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login user
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should add product to wishlist from product card', async ({ page }) => {
    await page.goto('/shop');
    
    // Click wishlist button on first product
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    const wishlistButton = firstProduct.locator('[aria-label*="wishlist"]');
    
    await wishlistButton.click();
    
    // Verify wishlist count updated
    const wishlistCount = page.locator('[data-testid="wishlist-count"]');
    await expect(wishlistCount).toHaveText('1');
  });

  test('should display wishlist page', async ({ page }) => {
    // Add item to wishlist first
    // ... (setup)
    
    await page.goto('/wishlist');
    
    await expect(page.locator('h1')).toContainText('My Wishlist');
    await expect(page.locator('[data-testid="wishlist-item"]')).toHaveCount(1);
  });

  test('should send sale notification when product goes on sale', async ({ page }) => {
    // This might require backend setup to trigger notification
    // Test notification logic
  });
});
```

### 3. Manual Testing Checklist

#### Backend Testing

- [ ] **Database**
  - [ ] Migration runs successfully
  - [ ] Tables created with correct structure
  - [ ] Indexes created
  - [ ] Triggers work
  - [ ] Foreign key constraints work

- [ ] **API Endpoints**
  - [ ] GET `/api/wishlist` returns correct data
  - [ ] POST `/api/wishlist` adds item
  - [ ] DELETE `/api/wishlist/:id` removes item
  - [ ] PUT `/api/wishlist/:id/preferences` updates preferences
  - [ ] GET `/api/wishlist/count` returns correct count
  - [ ] GET `/api/wishlist/:id/check` returns correct status
  - [ ] GET `/api/wishlist/bulk-check` works correctly
  - [ ] All endpoints require authentication
  - [ ] All endpoints validate input
  - [ ] Error handling works correctly

- [ ] **Notifications**
  - [ ] Sale notification sent when product goes on sale
  - [ ] Stock notification sent when product comes back in stock
  - [ ] Notifications not duplicated
  - [ ] Email templates render correctly
  - [ ] Variables replaced correctly
  - [ ] Unsubscribe links work

- [ ] **Cron Jobs**
  - [ ] Jobs register correctly on server start
  - [ ] Sale checker runs hourly
  - [ ] Stock checker runs every 30 minutes
  - [ ] Jobs handle errors gracefully
  - [ ] Jobs log correctly

#### Frontend Testing

- [ ] **Components**
  - [ ] `WishlistButton` toggles correctly
  - [ ] Heart icon fills when wishlisted
  - [ ] Button shows loading state
  - [ ] Redirects to login if not authenticated
  - [ ] Wishlist page displays items
  - [ ] Empty state shows correctly
  - [ ] Product cards show wishlist button

- [ ] **User Flows**
  - [ ] Add to wishlist from product card
  - [ ] Add to wishlist from product detail page
  - [ ] Remove from wishlist
  - [ ] View wishlist page
  - [ ] Add to cart from wishlist
  - [ ] Navigate to product from wishlist
  - [ ] Update notification preferences

- [ ] **Integration**
  - [ ] Wishlist persists across page refreshes
  - [ ] Wishlist syncs across browser tabs
  - [ ] Count badge updates in real-time
  - [ ] Header icon shows/hides based on auth
  - [ ] Account dashboard shows wishlist section

- [ ] **Responsive Design**
  - [ ] Works on mobile devices
  - [ ] Works on tablets
  - [ ] Works on desktop
  - [ ] Touch targets are appropriate size

#### Cross-Browser Testing

- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

---

## Bug Fixes & Edge Cases

### Common Issues to Check

1. **Authentication Edge Cases**
   - [ ] Session expiry handling
   - [ ] Invalid session tokens
   - [ ] Concurrent requests from same user

2. **Product Edge Cases**
   - [ ] Deleted products (cascade delete works)
   - [ ] Inactive products
   - [ ] Products with no images
   - [ ] Products with no price
   - [ ] Products with variations

3. **Notification Edge Cases**
   - [ ] Multiple products on sale at once
   - [ ] Rapid stock changes
   - [ ] Email service downtime
   - [ ] Invalid email addresses
   - [ ] Very large wishlists

4. **Performance Edge Cases**
   - [ ] User with 1000+ wishlist items
   - [ ] Bulk operations with many products
   - [ ] Concurrent add/remove operations

---

## Performance Optimization

### 1. Database Optimization

- [ ] Verify all indexes are used in queries
- [ ] Analyze query execution plans
- [ ] Optimize slow queries
- [ ] Consider materialized views if needed

### 2. Frontend Optimization

- [ ] Implement lazy loading for wishlist items
- [ ] Use React.memo for expensive components
- [ ] Debounce search/filter operations
- [ ] Optimize image loading

### 3. API Optimization

- [ ] Implement pagination for large wishlists
- [ ] Cache frequently accessed data
- [ ] Batch database operations
- [ ] Use connection pooling efficiently

### 4. Notification Optimization

- [ ] Batch email sends if possible
- [ ] Rate limit notifications per user
- [ ] Queue notifications if high volume

---

## Documentation

### 1. Code Documentation

- [ ] Add JSDoc comments to all functions
- [ ] Document complex logic
- [ ] Add README for wishlist system

### 2. API Documentation

- [ ] Document all endpoints
- [ ] Include request/response examples
- [ ] Document error codes
- [ ] Add to API reference

### 3. User Documentation

- [ ] Update user guide
- [ ] Add FAQ section
- [ ] Document notification preferences

---

## Code Review Checklist

### Backend

- [ ] Code follows project style guide
- [ ] No security vulnerabilities
- [ ] Proper error handling
- [ ] Input validation
- [ ] SQL injection prevention
- [ ] Proper logging
- [ ] No hardcoded values
- [ ] Proper TypeScript types

### Frontend

- [ ] Code follows project style guide
- [ ] Proper TypeScript types
- [ ] Accessible components
- [ ] Proper error handling
- [ ] Loading states
- [ ] No console.logs in production
- [ ] Proper component structure
- [ ] Reusable components

---

## Final Checklist

- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Manual testing complete
- [ ] All bugs fixed
- [ ] Performance acceptable
- [ ] Documentation complete
- [ ] Code review complete
- [ ] Security review complete
- [ ] Ready for production

---

## Deployment Checklist

- [ ] Run database migrations in staging
- [ ] Test in staging environment
- [ ] Verify email templates in staging
- [ ] Test cron jobs in staging
- [ ] Create deployment plan
- [ ] Backup database before migration
- [ ] Run migrations in production
- [ ] Verify cron jobs started
- [ ] Monitor error logs
- [ ] Verify emails are sending
- [ ] Monitor performance metrics

---

## Success Criteria

The implementation is complete when:

1. ✅ All tests pass
2. ✅ No critical bugs
3. ✅ Performance meets requirements
4. ✅ Documentation is complete
5. ✅ Code is reviewed
6. ✅ Security reviewed
7. ✅ Deployed to staging
8. ✅ Tested in staging
9. ✅ Ready for production deployment

---

## Post-Launch Monitoring

### Metrics to Track

- Wishlist adds per day
- Wishlist removes per day
- Active wishlists
- Notifications sent
- Notification open rates
- Notification click-through rates
- Errors per day

### Alerts to Set Up

- High error rate in cron jobs
- Email sending failures
- Database connection issues
- High response times

---

**Status**: Ready to implement  
**Estimated Time**: 3-5 days

