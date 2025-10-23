# 🚀 Phase 2 Quick Start Guide

Get up and running with the Product Management System in 5 minutes!

---

## Step 1: Start the Backend

```bash
cd server
npm run dev
```

✅ Server should start at `http://localhost:3001`

---

## Step 2: Test Basic Endpoints

### Health Check
```bash
curl http://localhost:3001/health
```

**Expected Output:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-10-12T..."
}
```

### Get Products (will be empty initially)
```bash
curl http://localhost:3001/api/products
```

**Expected Output:**
```json
{
  "success": true,
  "data": {
    "products": [],
    "pagination": { ... }
  }
}
```

---

## Step 3: Create Sample Product (Admin)

First, create an admin user or login with existing credentials.

### Create Product via API

```bash
curl -X POST http://localhost:3001/api/admin/products \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "sku": "FS-TRAINER-001",
    "name": "SimFab Flight Sim Trainer Station",
    "slug": "flight-sim-trainer-station",
    "description": "Professional flight simulator cockpit",
    "short_description": "Your Gateway to Precision Aviation Training",
    "type": "configurable",
    "status": "active",
    "featured": true,
    "regular_price": 999.00,
    "stock_quantity": 15,
    "categories": ["flight-sim", "cockpits"],
    "tags": ["best-seller", "modular"]
  }'
```

---

## Step 4: Test Product Endpoints

### Get All Products
```bash
curl http://localhost:3001/api/products
```

### Get Product by ID
```bash
curl http://localhost:3001/api/products/1
```

### Get Featured Products
```bash
curl http://localhost:3001/api/products/featured
```

### Search Products
```bash
curl 'http://localhost:3001/api/products/search?q=trainer'
```

---

## Step 5: Test Price Calculator

### Calculate Price
```bash
curl -X POST http://localhost:3001/api/products/1/calculate-price \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 1
  }'
```

**Expected Output:**
```json
{
  "success": true,
  "data": {
    "pricing": {
      "basePrice": 999.00,
      "variationAdjustments": [],
      "addonsTotal": 0,
      "subtotal": 999.00,
      "quantity": 1,
      "total": 999.00,
      "currency": "USD"
    }
  }
}
```

---

## Step 6: Frontend Testing

### Start Frontend
```bash
# In project root
npm run dev
```

✅ Frontend runs at `http://localhost:5173`

### Test API from Browser Console

Open DevTools Console (F12) and run:

```javascript
// Fetch products
fetch('http://localhost:3001/api/products', {
  credentials: 'include'
})
.then(r => r.json())
.then(console.log)

// Search products
fetch('http://localhost:3001/api/products/search?q=trainer', {
  credentials: 'include'
})
.then(r => r.json())
.then(console.log)
```

---

## Step 7: Using Frontend API Client

In any React component:

```typescript
import { productsAPI } from '@/services/api';

// Get products
const response = await productsAPI.getAll({
  page: 1,
  limit: 20
});

console.log(response.data.products);

// Get featured
const featured = await productsAPI.getFeatured(6);
console.log(featured.data);

// Search
const results = await productsAPI.search('trainer');
console.log(results.data.products);
```

---

## Common Issues & Solutions

### Issue: "Cannot GET /api/products"
**Solution**: Make sure backend is running on port 3001

### Issue: CORS errors
**Solution**: Backend already configured for CORS. Make sure you're using `credentials: 'include'`

### Issue: "Unauthorized" errors
**Solution**: Login first or use public endpoints

### Issue: Empty results
**Solution**: Create sample products first via admin API or use seed data

---

## Creating Test Data

### Option 1: Manual Product Creation

Use the admin API to create products one by one (see Step 3).

### Option 2: Database Seed Script (Future)

We'll create a seed script in Phase 3 to populate sample data.

### Option 3: Import CSV (Existing Feature)

If you have the CSV upload feature from Phase 1, you can import bulk products.

---

## Verify Everything Works

✅ Backend server running  
✅ Can call `/health` endpoint  
✅ Can GET `/api/products`  
✅ Can create products via admin API  
✅ Can search products  
✅ Can calculate prices  
✅ Frontend can fetch from API  
✅ No CORS errors  
✅ Sessions working  

---

## Next: Connect Frontend Pages

Now that the backend is working, update these pages:

1. **Shop Page** (`src/pages/Shop.tsx`)
   - Replace mock data with `productsAPI.getAll()`
   - Add filters, search, pagination

2. **ProductDetail Page** (`src/pages/ProductDetail.tsx`)
   - Use `productsAPI.getBySlug()`
   - Implement price calculator
   - Add variation selectors

---

## Useful Debugging

### Check Database Tables
```bash
psql simfab_dev

SELECT COUNT(*) FROM products;
SELECT * FROM products LIMIT 5;
```

### Check Server Logs
Server logs show all requests and errors. Look for:
- `POST /api/admin/products 201` (success)
- `GET /api/products 200` (success)
- Any error stack traces

### Check Browser Network Tab
Open DevTools > Network > XHR to see all API calls from frontend.

---

## Ready to Build!

You now have a fully functional product management backend ready for integration.

See `PHASE_2_COMPLETE.md` for complete documentation!

