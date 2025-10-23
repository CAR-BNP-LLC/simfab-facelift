# SimFab API Quick Reference Guide

A developer-friendly checklist and reference for all API endpoints.

---

## 🔐 Authentication & User Management

### Public Endpoints

| Method | Endpoint | Purpose | Status Codes |
|--------|----------|---------|--------------|
| POST | `/api/auth/register` | Create new user account | 201, 400, 409 |
| POST | `/api/auth/login` | Login user | 200, 401, 403, 423 |
| POST | `/api/auth/logout` | Logout current user | 200 |
| POST | `/api/auth/password-reset/request` | Request password reset | 200, 404 |
| POST | `/api/auth/password-reset/reset` | Reset password with token | 200, 400 |
| POST | `/api/auth/verify-email` | Verify email address | 200, 400 |
| POST | `/api/auth/resend-verification` | Resend verification email | 200, 429 |

### Protected Endpoints (Requires Authentication)

| Method | Endpoint | Purpose | Status Codes |
|--------|----------|---------|--------------|
| GET | `/api/auth/profile` | Get user profile | 200, 401 |
| PUT | `/api/auth/profile` | Update user profile | 200, 400, 401 |
| PUT | `/api/auth/password` | Change password | 200, 400, 401 |
| GET | `/api/auth/addresses` | Get user addresses | 200, 401 |
| POST | `/api/auth/addresses` | Add new address | 201, 400, 401 |
| PUT | `/api/auth/addresses/:id` | Update address | 200, 400, 401, 404 |
| DELETE | `/api/auth/addresses/:id` | Delete address | 204, 401, 404 |

---

## 📦 Product Management

### Public Product Endpoints

| Method | Endpoint | Purpose | Query Params | Status Codes |
|--------|----------|---------|--------------|--------------|
| GET | `/api/products` | List products | page, limit, category, search, sortBy, minPrice, maxPrice, inStock, featured | 200 |
| GET | `/api/products/:id` | Get product details | - | 200, 404 |
| GET | `/api/products/slug/:slug` | Get product by slug | - | 200, 404 |
| GET | `/api/products/search` | Search products | q, category, page, limit | 200 |
| POST | `/api/products/:id/calculate-price` | Calculate configured price | - | 200, 400, 404 |
| GET | `/api/products/:id/reviews` | Get product reviews | page, limit | 200 |
| GET | `/api/products/featured` | Get featured products | limit | 200 |
| GET | `/api/products/categories` | Get all categories | - | 200 |
| GET | `/api/products/categories/:slug` | Get products by category | page, limit | 200 |

### Protected Product Endpoints

| Method | Endpoint | Purpose | Status Codes |
|--------|----------|---------|--------------|
| POST | `/api/products/:id/reviews` | Add product review | 201, 400, 401, 409 |
| PUT | `/api/products/:id/reviews/:reviewId` | Update review | 200, 401, 403, 404 |
| DELETE | `/api/products/:id/reviews/:reviewId` | Delete review | 204, 401, 403, 404 |

---

## 🛒 Shopping Cart

### Cart Endpoints (Session-based)

| Method | Endpoint | Purpose | Status Codes |
|--------|----------|---------|--------------|
| GET | `/api/cart` | Get current cart | 200, 404 |
| POST | `/api/cart/add` | Add item to cart | 201, 400, 404, 409 |
| PUT | `/api/cart/items/:itemId` | Update cart item | 200, 400, 404 |
| DELETE | `/api/cart/items/:itemId` | Remove from cart | 200, 404 |
| DELETE | `/api/cart/clear` | Clear entire cart | 200 |
| POST | `/api/cart/apply-coupon` | Apply discount coupon | 200, 400 |
| DELETE | `/api/cart/remove-coupon` | Remove coupon | 200 |
| POST | `/api/cart/calculate-shipping` | Calculate shipping rates | 200, 400, 422 |
| POST | `/api/cart/merge` | Merge guest cart with user cart | 200, 401 |

---

## 📋 Order Management

### Customer Order Endpoints (Requires Authentication)

| Method | Endpoint | Purpose | Status Codes |
|--------|----------|---------|--------------|
| POST | `/api/orders` | Create new order | 201, 400, 401, 409 |
| GET | `/api/orders` | List user's orders | 200, 401 |
| GET | `/api/orders/:orderNumber` | Get order details | 200, 401, 403, 404 |
| POST | `/api/orders/:orderNumber/cancel` | Cancel order | 200, 400, 401, 403 |
| GET | `/api/orders/:orderNumber/invoice` | Download invoice | 200, 401, 404 |
| GET | `/api/orders/:orderNumber/receipt` | View receipt | 200, 401, 404 |

---

## 💳 Payment Processing

### Payment Endpoints

| Method | Endpoint | Purpose | Status Codes |
|--------|----------|---------|--------------|
| POST | `/api/payments/create` | Create payment intent | 201, 400, 401 |
| POST | `/api/payments/execute` | Execute PayPal payment | 200, 400, 402 |
| GET | `/api/payments/:paymentId` | Get payment status | 200, 401, 404 |
| POST | `/api/payments/:paymentId/refund` | Process refund | 200, 400, 401 |
| GET | `/api/payments/:paymentId/refunds` | Get refund history | 200, 401, 404 |
| POST | `/api/webhooks/paypal` | PayPal webhook handler | 200, 400 |

---

## 🚚 Shipping Operations

### Shipping Endpoints

| Method | Endpoint | Purpose | Status Codes |
|--------|----------|---------|--------------|
| POST | `/api/shipping/rates` | Calculate shipping rates | 200, 400 |
| GET | `/api/shipping/carriers` | Get available carriers | 200 |
| POST | `/api/shipping/validate-address` | Validate shipping address | 200, 400 |
| GET | `/api/shipping/tracking/:trackingNumber` | Track shipment | 200, 404 |
| POST | `/api/webhooks/shipstation` | ShipStation webhook | 200, 400 |

---

## 🎯 Recommendations

### Recommendation Endpoints

| Method | Endpoint | Purpose | Status Codes |
|--------|----------|---------|--------------|
| GET | `/api/recommendations/personalized` | Get personalized recommendations | 200 |
| GET | `/api/recommendations/products/:productId` | Get product recommendations | 200, 404 |
| GET | `/api/recommendations/recently-viewed` | Get recently viewed products | 200, 401 |
| GET | `/api/recommendations/trending` | Get trending products | 200 |
| GET | `/api/recommendations/bestsellers` | Get bestselling products | 200 |
| POST | `/api/recommendations/track-view` | Track product view | 204 |

---

## 📧 Email & Newsletter

### Newsletter Endpoints

| Method | Endpoint | Purpose | Status Codes |
|--------|----------|---------|--------------|
| POST | `/api/newsletter/subscribe` | Subscribe to newsletter | 200, 400, 409 |
| POST | `/api/newsletter/unsubscribe` | Unsubscribe from newsletter | 200, 404 |
| GET | `/api/newsletter/verify/:token` | Verify subscription | 200, 400 |

---

## 👨‍💼 Admin API

### Admin Authentication

| Method | Endpoint | Purpose | Status Codes |
|--------|----------|---------|--------------|
| POST | `/api/admin/login` | Admin login | 200, 401, 403 |
| POST | `/api/admin/logout` | Admin logout | 200 |
| GET | `/api/admin/profile` | Get admin profile | 200, 401, 403 |

### Dashboard & Analytics

| Method | Endpoint | Purpose | Status Codes |
|--------|----------|---------|--------------|
| GET | `/api/admin/dashboard/stats` | Get dashboard statistics | 200, 401, 403 |
| GET | `/api/admin/dashboard/analytics` | Get sales analytics | 200, 401, 403 |
| GET | `/api/admin/dashboard/revenue` | Get revenue data | 200, 401, 403 |
| GET | `/api/admin/dashboard/orders-chart` | Get orders chart data | 200, 401, 403 |

### Admin Order Management

| Method | Endpoint | Purpose | Status Codes |
|--------|----------|---------|--------------|
| GET | `/api/admin/orders` | List all orders | 200, 401, 403 |
| GET | `/api/admin/orders/:id` | Get order details | 200, 401, 403, 404 |
| PUT | `/api/admin/orders/:id/status` | Update order status | 200, 400, 401, 403 |
| POST | `/api/admin/orders/:id/ship` | Mark order as shipped | 200, 400, 401, 403 |
| POST | `/api/admin/orders/:id/refund` | Process refund | 200, 400, 401, 403 |
| POST | `/api/admin/orders/:id/notes` | Add order note | 201, 401, 403 |
| DELETE | `/api/admin/orders/:id` | Delete order | 204, 401, 403, 404 |

### Admin Product Management

| Method | Endpoint | Purpose | Status Codes |
|--------|----------|---------|--------------|
| GET | `/api/admin/products` | List all products | 200, 401, 403 |
| GET | `/api/admin/products/:id` | Get product details | 200, 401, 403, 404 |
| POST | `/api/admin/products` | Create product | 201, 400, 401, 403, 409 |
| PUT | `/api/admin/products/:id` | Update product | 200, 400, 401, 403, 404 |
| DELETE | `/api/admin/products/:id` | Delete product | 204, 401, 403, 404 |
| POST | `/api/admin/products/bulk-update` | Bulk update products | 200, 400, 401, 403 |
| POST | `/api/admin/products/import` | Import products (CSV) | 201, 400, 401, 403 |
| GET | `/api/admin/products/export` | Export products (CSV) | 200, 401, 403 |

### Admin Product Variations

| Method | Endpoint | Purpose | Status Codes |
|--------|----------|---------|--------------|
| GET | `/api/admin/products/:id/variations` | Get product variations | 200, 401, 403 |
| POST | `/api/admin/products/:id/variations` | Add variation | 201, 400, 401, 403 |
| PUT | `/api/admin/products/:id/variations/:varId` | Update variation | 200, 400, 401, 403 |
| DELETE | `/api/admin/products/:id/variations/:varId` | Delete variation | 204, 401, 403 |

### Admin Product Add-ons

| Method | Endpoint | Purpose | Status Codes |
|--------|----------|---------|--------------|
| GET | `/api/admin/products/:id/addons` | Get product add-ons | 200, 401, 403 |
| POST | `/api/admin/products/:id/addons` | Add add-on | 201, 400, 401, 403 |
| PUT | `/api/admin/products/:id/addons/:addonId` | Update add-on | 200, 400, 401, 403 |
| DELETE | `/api/admin/products/:id/addons/:addonId` | Delete add-on | 204, 401, 403 |

### Admin Product Images

| Method | Endpoint | Purpose | Status Codes |
|--------|----------|---------|--------------|
| POST | `/api/admin/products/:id/images` | Upload product image | 201, 400, 401, 403 |
| PUT | `/api/admin/products/:id/images/:imageId` | Update image | 200, 400, 401, 403 |
| DELETE | `/api/admin/products/:id/images/:imageId` | Delete image | 204, 401, 403 |
| PUT | `/api/admin/products/:id/images/reorder` | Reorder images | 200, 400, 401, 403 |

### Admin User Management

| Method | Endpoint | Purpose | Status Codes |
|--------|----------|---------|--------------|
| GET | `/api/admin/users` | List all users | 200, 401, 403 |
| GET | `/api/admin/users/:id` | Get user details | 200, 401, 403, 404 |
| POST | `/api/admin/users` | Create admin user | 201, 400, 401, 403 |
| PUT | `/api/admin/users/:id` | Update user | 200, 400, 401, 403 |
| PUT | `/api/admin/users/:id/role` | Update user role | 200, 400, 401, 403 |
| DELETE | `/api/admin/users/:id` | Delete user | 204, 401, 403 |
| GET | `/api/admin/users/:id/orders` | Get user's orders | 200, 401, 403 |

### Admin Settings

| Method | Endpoint | Purpose | Status Codes |
|--------|----------|---------|--------------|
| GET | `/api/admin/settings` | Get system settings | 200, 401, 403 |
| PUT | `/api/admin/settings` | Update settings | 200, 400, 401, 403 |
| GET | `/api/admin/settings/:key` | Get specific setting | 200, 401, 403, 404 |
| PUT | `/api/admin/settings/:key` | Update specific setting | 200, 400, 401, 403 |

### Admin Reports

| Method | Endpoint | Purpose | Status Codes |
|--------|----------|---------|--------------|
| GET | `/api/admin/reports/sales` | Get sales report | 200, 401, 403 |
| GET | `/api/admin/reports/products` | Get product performance | 200, 401, 403 |
| GET | `/api/admin/reports/customers` | Get customer analytics | 200, 401, 403 |
| GET | `/api/admin/reports/inventory` | Get inventory report | 200, 401, 403 |

### Admin Activity Logs

| Method | Endpoint | Purpose | Status Codes |
|--------|----------|---------|--------------|
| GET | `/api/admin/activity-logs` | Get activity logs | 200, 401, 403 |
| GET | `/api/admin/activity-logs/:id` | Get log details | 200, 401, 403, 404 |

---

## 📤 File Management

### File Upload Endpoints

| Method | Endpoint | Purpose | Status Codes |
|--------|----------|---------|--------------|
| POST | `/api/files/upload` | Upload file | 201, 400, 401, 413 |
| POST | `/api/files/upload/image` | Upload image | 201, 400, 401, 413 |
| POST | `/api/files/upload/document` | Upload document | 201, 400, 401, 413 |
| GET | `/api/files/:id` | Get file details | 200, 404 |
| GET | `/api/files/:id/download` | Download file | 200, 404 |
| DELETE | `/api/files/:id` | Delete file | 204, 401, 404 |

---

## 🔧 System & Utility

### Health & Status

| Method | Endpoint | Purpose | Status Codes |
|--------|----------|---------|--------------|
| GET | `/api/health` | Health check | 200, 503 |
| GET | `/api/status` | System status | 200 |
| GET | `/api/version` | API version | 200 |

---

## 📊 Status Code Reference

### Success Codes
- **200 OK**: Request successful, data returned
- **201 Created**: Resource created successfully
- **204 No Content**: Request successful, no data to return

### Client Error Codes
- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource doesn't exist
- **409 Conflict**: Resource conflict (e.g., duplicate)
- **413 Payload Too Large**: File too large
- **422 Unprocessable Entity**: Validation failed
- **423 Locked**: Account temporarily locked
- **429 Too Many Requests**: Rate limit exceeded

### Server Error Codes
- **500 Internal Server Error**: Unexpected server error
- **502 Bad Gateway**: Upstream service error
- **503 Service Unavailable**: Temporary unavailability

---

## 🔒 Authentication Methods

### Session-Based (Customers)
```
Cookie: sessionId=abc123xyz
```

### Token-Based (Admin)
```
Authorization: Bearer admin_token_xyz
```

---

## 📝 Common Query Parameters

### Pagination
```
?page=1
&limit=20
```

### Sorting
```
?sortBy=price
&sortOrder=asc
```

### Filtering
```
?category=flight-sim
&minPrice=100
&maxPrice=5000
&inStock=true
```

### Search
```
?q=cockpit
&search=racing
```

---

## 🎨 Request/Response Examples

### Standard Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": [],
    "requestId": "req_abc123"
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

---

## 📋 Development Checklist

### Phase 1: Foundation
- [ ] Database schema implementation
- [ ] User registration
- [ ] User login
- [ ] Session management
- [ ] Password reset
- [ ] Email verification

### Phase 2: Products
- [ ] List products
- [ ] Get product details
- [ ] Product search
- [ ] Price calculator
- [ ] Product categories
- [ ] Product images

### Phase 3: Cart
- [ ] Get cart
- [ ] Add to cart
- [ ] Update cart
- [ ] Remove from cart
- [ ] Apply coupon
- [ ] Calculate shipping

### Phase 4: Orders
- [ ] Create order
- [ ] List orders
- [ ] Order details
- [ ] Cancel order

### Phase 5: Payments
- [ ] Create payment
- [ ] Execute payment
- [ ] Process refund
- [ ] Payment webhooks

### Phase 6: Shipping
- [ ] Calculate rates
- [ ] Create label
- [ ] Track shipment
- [ ] Shipping webhooks

### Phase 7: Admin
- [ ] Admin login
- [ ] Dashboard stats
- [ ] Order management
- [ ] Product management
- [ ] User management

### Phase 8: Recommendations
- [ ] Personalized recommendations
- [ ] Product recommendations
- [ ] Recently viewed
- [ ] Track views

### Phase 9: Polish
- [ ] Email notifications
- [ ] Newsletter
- [ ] File uploads
- [ ] Activity logging
- [ ] Error handling
- [ ] Rate limiting

---

## 🧪 Testing Endpoints

### Test with cURL

**Register User**:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Login**:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }' \
  -c cookies.txt
```

**Get Products**:
```bash
curl http://localhost:3000/api/products?category=flight-sim&page=1&limit=10
```

**Add to Cart** (with session):
```bash
curl -X POST http://localhost:3000/api/cart/add \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "productId": 101,
    "quantity": 1,
    "configuration": {
      "colorId": 1
    }
  }'
```

---

## 📖 Additional Resources

### Documentation
- Full API Spec: `BACKEND_IMPLEMENTATION_SPEC.md`
- Executive Summary: `BACKEND_EXECUTIVE_SUMMARY.md`
- Database Schema: See `database/schema.sql`

### External APIs
- PayPal API: https://developer.paypal.com/docs/api/overview/
- ShipStation API: https://www.shipstation.com/docs/api/

### Tools
- Postman Collection: `simfab-api.postman_collection.json`
- API Testing: Postman, Insomnia, Thunder Client
- Database GUI: pgAdmin, DBeaver, TablePlus

---

**Last Updated**: October 9, 2025
**API Version**: v1.0
**Total Endpoints**: 100+

