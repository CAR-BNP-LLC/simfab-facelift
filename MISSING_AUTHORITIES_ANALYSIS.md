# Missing Authorities Analysis

## Overview
This document lists all authorities that are used in the application (both frontend and backend) but are **NOT** currently defined in the `seed-rbac.ts` script.

## Currently Defined Authorities in seed-rbac.ts

The following authorities are already defined in the seed script:

### Product Authorities
- `products:view` - View products
- `products:create` - Create new products
- `products:edit` - Edit existing products
- `products:delete` - Delete products

### Order Authorities
- `orders:view` - View orders
- `orders:manage` - Manage order status and details

### Dashboard Authorities
- `dashboard:view` - View admin dashboard

### RBAC Management Authorities
- `rbac:manage` - Manage roles and authorities

### User Management Authorities
- `users:view` - View users
- `users:manage` - Manage user accounts

### Email Management Authorities
- `emails:view` - View email templates and logs
- `emails:manage` - Create, edit, and manage email templates

---

## Missing Authorities (Used in Codebase but NOT in seed-rbac.ts)

### 1. Coupon Management Authorities

These authorities are used in `server/src/routes/admin/coupons.ts`:

- **`coupons:view`** - View coupons
  - Used in: GET `/api/admin/coupons`, GET `/api/admin/coupons/:id`, GET `/api/admin/coupons/:id/stats`
  - Frontend: Used in `src/pages/Admin.tsx` and `src/components/admin/CouponList.tsx`

- **`coupons:create`** - Create new coupons
  - Used in: POST `/api/admin/coupons`
  - Frontend: Used in `src/components/admin/CouponList.tsx`

- **`coupons:edit`** - Edit existing coupons
  - Used in: PUT `/api/admin/coupons/:id`
  - Frontend: Used in `src/components/admin/CouponList.tsx`

- **`coupons:delete`** - Delete coupons
  - Used in: DELETE `/api/admin/coupons/:id`
  - Frontend: Used in `src/components/admin/CouponList.tsx`

### 2. Marketing Campaign Authorities

These authorities are used in `server/src/routes/admin/marketing-campaigns.ts`:

- **`marketing:view`** - View marketing campaigns
  - Used in: GET `/api/admin/marketing-campaigns`, GET `/api/admin/marketing-campaigns/:id`, GET `/api/admin/marketing-campaigns/:id/stats`, GET `/api/admin/marketing-campaigns/eligible-count`
  - Frontend: Used in `src/pages/Admin.tsx`

- **`marketing:create`** - Create new marketing campaigns
  - Used in: POST `/api/admin/marketing-campaigns`
  - Frontend: Used in `src/pages/Admin.tsx`

- **`marketing:edit`** - Edit existing marketing campaigns
  - Used in: PUT `/api/admin/marketing-campaigns/:id`
  - Frontend: Used in `src/pages/Admin.tsx`

- **`marketing:send`** - Send marketing campaigns
  - Used in: POST `/api/admin/marketing-campaigns/:id/send`
  - Frontend: Used in `src/pages/Admin.tsx`

---

## Authorities Referenced but Not Used in Routes

These authorities are referenced in the frontend code but are not actually used in any backend routes:

- **`products:manage`** - Referenced in `src/components/Header.tsx` (line 41) but not used in any route
- **`users:manage`** - Referenced in `src/components/Header.tsx` (line 41) but not used in any route

**Note:** These may be intended as aggregate authorities or may be legacy references. Consider whether they should be added or if the references should be updated to use specific authorities like `products:edit` and `users:manage` (which already exists).

---

## Summary

### Total Missing Authorities: 8

1. `coupons:view`
2. `coupons:create`
3. `coupons:edit`
4. `coupons:delete`
5. `marketing:view`
6. `marketing:create`
7. `marketing:edit`
8. `marketing:send`

### Recommended Action

Add these 8 authorities to the `seed-rbac.ts` script in the `authorities` array. They should be added with appropriate descriptions following the existing pattern.

---

## Additional Notes

### Routes Without Authority Checks

The following routes do not use authority checks (potential security gap):

- `server/src/routes/admin/site-notices.ts` - All routes (GET, POST, PUT, DELETE) lack authority checks
- Several routes use `requireAdmin` instead of `requireAuthority`:
  - `assemblyManuals.ts`
  - `wishlist-notifications.ts`
  - `logs.ts`
  - `webhookTest.ts`
  - `testing.ts`
  - `phase4.ts`
  - `cleanup.ts`
  - `production.ts`
  - `cron.ts`

**Recommendation:** Consider migrating these routes to use specific authority checks for better granular access control.

---

## Authority Usage Statistics

- **Backend Routes Using Authorities:** 12 route files
- **Frontend Components Using Authorities:** 6 component files
- **Total Authority Checks in Backend:** ~70 instances
- **Total Authority Checks in Frontend:** ~40 instances


