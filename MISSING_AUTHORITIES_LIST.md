# Missing Authorities - Quick Reference

## Authorities to Add to seed-rbac.ts

Add these 8 authorities to the `authorities` array in `server/src/scripts/seed-rbac.ts`:

```typescript
// Coupon authorities
{ resource: 'coupons', action: 'view', description: 'View coupons' },
{ resource: 'coupons', action: 'create', description: 'Create new coupons' },
{ resource: 'coupons', action: 'edit', description: 'Edit existing coupons' },
{ resource: 'coupons', action: 'delete', description: 'Delete coupons' },

// Marketing campaign authorities
{ resource: 'marketing', action: 'view', description: 'View marketing campaigns' },
{ resource: 'marketing', action: 'create', description: 'Create new marketing campaigns' },
{ resource: 'marketing', action: 'edit', description: 'Edit existing marketing campaigns' },
{ resource: 'marketing', action: 'send', description: 'Send marketing campaigns' },
```

## Where These Are Used

### Backend Routes
- `server/src/routes/admin/coupons.ts` - All coupon CRUD operations
- `server/src/routes/admin/marketing-campaigns.ts` - All marketing campaign operations

### Frontend Components
- `src/pages/Admin.tsx` - Admin dashboard sections
- `src/components/admin/CouponList.tsx` - Coupon management UI

## Current Status

✅ **Defined in seed-rbac.ts:** 12 authorities  
❌ **Missing from seed-rbac.ts:** 8 authorities  
⚠️ **Total needed:** 20 authorities


