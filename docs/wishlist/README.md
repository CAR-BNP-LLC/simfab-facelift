# Wishlist Implementation

**Status**: Planning  
**Date**: 2024  
**Priority**: High

---

## Overview

### Goals
- Allow users to save products to their wishlist
- Notify users when wishlist items go on sale
- Notify users when wishlist items come back in stock
- Display wishlist in user account dashboard
- Add heart button to product cards for quick wishlist management
- Persist wishlist across sessions (requires authentication)

### Key Features
1. **Wishlist Management**
   - Add/remove products from wishlist
   - View wishlist items with product details
   - Track when items were added
   - Support for product variations (track specific variations if needed)

2. **Notifications**
   - Sale notifications (when product goes on sale)
   - Back-in-stock notifications (when product becomes available)
   - Email templates for both notification types
   - Unsubscribe/preference management

3. **User Experience**
   - Heart icon on all product cards
   - Wishlist page/route
   - Account dashboard integration
   - Visual indicators for wishlisted items
   - Quick actions (add to cart from wishlist)

---

## Implementation Phases

### [Phase 1: Database & Backend Core](./PHASE_1_DATABASE_BACKEND.md) ⏳
**Duration**: Week 1  
**Status**: Pending

Set up database schema, models, services, controllers, and API routes.

### [Phase 2: Frontend Core](./PHASE_2_FRONTEND.md) ⏳
**Duration**: Week 1-2  
**Status**: Pending

Build wishlist context, components, pages, and integrate with product listings.

### [Phase 3: Account Integration](./PHASE_3_ACCOUNT_INTEGRATION.md) ⏳
**Duration**: Week 2  
**Status**: Pending

Integrate wishlist into account dashboard, header navigation, and routing.

### [Phase 4: Email Templates](./PHASE_4_EMAIL_TEMPLATES.md) ⏳
**Duration**: Week 2  
**Status**: Pending

Create and configure email templates for sale and stock notifications.

### [Phase 5: Notification Service](./PHASE_5_NOTIFICATION_SERVICE.md) ⏳
**Duration**: Week 3  
**Status**: Pending

Implement notification detection logic and email sending service.

### [Phase 6: Background Jobs](./PHASE_6_BACKGROUND_JOBS.md) ⏳
**Duration**: Week 3  
**Status**: Pending

Set up cron jobs for automated sale and stock checking.

### [Phase 7: Testing & Polish](./PHASE_7_TESTING_POLISH.md) ⏳
**Duration**: Week 4  
**Status**: Pending

Comprehensive testing, bug fixes, and final polish.

---

## Architecture Overview

### Database Schema

**Tables**:
- `wishlists` - Main wishlist storage with notification preferences
- `wishlist_notifications` - Log of sent notifications

See [Phase 1](./PHASE_1_DATABASE_BACKEND.md) for complete schema.

### Backend Structure

- **Model**: `server/src/models/wishlist.ts`
- **Service**: `server/src/services/WishlistService.ts`
- **Controller**: `server/src/controllers/wishlistController.ts`
- **Routes**: `server/src/routes/wishlist.ts`
- **Notification Service**: `server/src/services/WishlistNotificationService.ts`

### Frontend Structure

- **Context**: `src/contexts/WishlistContext.tsx`
- **Component**: `src/components/WishlistButton.tsx`
- **Page**: `src/pages/Wishlist.tsx`
- **API**: Updates to `src/services/api.ts`

---

## API Endpoints

### Core Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/wishlist` | Get user's wishlist | ✅ |
| POST | `/api/wishlist` | Add product to wishlist | ✅ |
| DELETE | `/api/wishlist/:productId` | Remove from wishlist | ✅ |
| PUT | `/api/wishlist/:productId/preferences` | Update preferences | ✅ |
| GET | `/api/wishlist/count` | Get wishlist count | ✅ |
| GET | `/api/wishlist/:productId/check` | Check if wishlisted | ✅ |
| GET | `/api/wishlist/bulk-check` | Bulk check status | ✅ |

See [Phase 1](./PHASE_1_DATABASE_BACKEND.md) for detailed API documentation.

---

## Email Templates

### Required Templates

1. **`wishlist_sale_notification`** - When product goes on sale
2. **`wishlist_stock_notification`** - When product comes back in stock

See [Phase 4](./PHASE_4_EMAIL_TEMPLATES.md) for template specifications.

---

## Background Jobs

### Cron Jobs

1. **Wishlist Sale Checker**
   - Schedule: Every hour (`0 * * * *`)
   - Function: Check for products that went on sale

2. **Wishlist Stock Checker**
   - Schedule: Every 30 minutes (`*/30 * * * *`)
   - Function: Check for products back in stock

See [Phase 6](./PHASE_6_BACKGROUND_JOBS.md) for implementation details.

---

## Success Criteria

The implementation is considered complete when:

1. ✅ Users can add/remove products from wishlist
2. ✅ Wishlist persists in user account
3. ✅ Heart button appears on all product cards
4. ✅ Wishlist page displays all saved items
5. ✅ Users receive email when wishlist item goes on sale
6. ✅ Users receive email when wishlist item comes back in stock
7. ✅ Notifications are not duplicated
8. ✅ All API endpoints work correctly
9. ✅ Frontend integrates seamlessly with existing design
10. ✅ Tests pass
11. ✅ Documentation is complete

---

## Additional Considerations

### Performance
- Proper database indexes
- Context-based caching
- Bulk operations for listings
- Optimized queries with joins

### Security
- Authentication required for all operations
- User can only access their own wishlist
- Input validation and SQL injection prevention
- Rate limiting consideration

### User Experience
- Loading states
- Clear error messages
- Toast notifications
- Optimistic updates
- Empty states
- Mobile responsive

See individual phase documents for detailed considerations.

---

## Quick Start

1. Start with [Phase 1: Database & Backend Core](./PHASE_1_DATABASE_BACKEND.md)
2. Follow phases sequentially
3. Test each phase before moving to the next
4. Refer to testing guide in [Phase 7](./PHASE_7_TESTING_POLISH.md)

---

**Next Step**: Begin [Phase 1: Database & Backend Core](./PHASE_1_DATABASE_BACKEND.md)

