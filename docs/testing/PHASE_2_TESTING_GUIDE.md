# 🧪 Phase 2: Complete Testing Guide

**Step-by-step guide to verify everything works**

---

## Prerequisites

✅ Backend server running on `http://localhost:3001`  
✅ Frontend server running on `http://localhost:5173`  
✅ PostgreSQL database running with Phase 1 migrations complete  
✅ `.env` file configured with `VITE_API_URL=http://localhost:3001`

---

## Part 1: Backend Health Check (2 minutes)

### Step 1.1: Verify Server is Running

```bash
curl http://localhost:3001/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-10-12T..."
}
```

✅ **Pass**: Server responds with success  
❌ **Fail**: Connection refused → Start backend with `cd server && npm run dev`

---

### Step 1.2: Test Database Connection

```bash
cd server
npm run db:test
```

**Expected Output:**
```
✓ Database connection successful
✓ Connected to: simfab_dev
```

✅ **Pass**: Database connected  
❌ **Fail**: Check PostgreSQL is running and credentials in `.env`

---

### Step 1.3: Verify Tables Exist

```bash
psql simfab_dev

\dt
```

**Expected**: You should see 35+ tables including:
- ✅ `products`
- ✅ `product_images`
- ✅ `product_colors`
- ✅ `product_variations`
- ✅ `product_addons`
- ✅ `users`
- ✅ `user_sessions`

Type `\q` to exit psql.

---

## Part 2: Create Sample Products (5 minutes)

### Step 2.1: Create an Admin User

First, we need an admin account to create products.

**Option A: Via Registration + Manual Database Update**

```bash
# 1. Register a user via frontend or API
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@simfab.com",
    "password": "Admin123!",
    "confirmPassword": "Admin123!",
    "firstName": "Admin",
    "lastName": "User"
  }'

# 2. Update their role to admin in database
psql simfab_dev

UPDATE users SET role = 'admin' WHERE email = 'admin@simfab.com';
\q
```

**Option B: Direct SQL Insert**

```sql
psql simfab_dev

INSERT INTO users (email, password_hash, first_name, last_name, role)
VALUES (
  'admin@simfab.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lw7BLyWU.5QC', -- password: Admin123!
  'Admin',
  'User',
  'admin'
);
\q
```

---

### Step 2.2: Login as Admin

```bash
# Save session cookie for subsequent requests
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@simfab.com",
    "password": "Admin123!"
  }' \
  -c cookies.txt \
  -v
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "role": "admin",
      ...
    }
  }
}
```

✅ **Pass**: Response shows `"role": "admin"`  
❌ **Fail**: Check credentials or role in database

**Important**: The session cookie is saved in `cookies.txt`. We'll use this for admin requests.

---

### Step 2.3: Create Sample Product #1 (Flight Sim Trainer)

```bash
curl -X POST http://localhost:3001/api/admin/products \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "sku": "FS-TRAINER-001",
    "name": "SimFab Flight Sim Trainer Station",
    "slug": "flight-sim-trainer-station",
    "description": "SimFab'\''s Trainer Station is focused on providing precise and exact replication of popular aircrafts with true to life controls placement in an ergonomically correct framework. The Trainer Station is designed for use with Microsoft Flight Simulator, X-Plane, Prepar3D, and other flight simulation software.",
    "short_description": "Your Gateway to Precision Aviation Training",
    "type": "configurable",
    "status": "active",
    "featured": true,
    "regular_price": 999.00,
    "weight_lbs": 73.6,
    "length_in": 37,
    "width_in": 23,
    "height_in": 16,
    "stock_quantity": 15,
    "low_stock_threshold": 5,
    "manage_stock": true,
    "allow_backorders": false,
    "requires_shipping": true,
    "categories": ["flight-sim", "cockpits"],
    "tags": ["best-seller", "modular", "customizable"],
    "seo_title": "SimFab Flight Sim Trainer Station - Professional Aviation Simulator",
    "seo_description": "Experience precision aviation training with SimFab'\''s modular Flight Sim Trainer Station."
  }' | jq
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": 1,
    "sku": "FS-TRAINER-001",
    "name": "SimFab Flight Sim Trainer Station",
    "slug": "flight-sim-trainer-station",
    ...
  }
}
```

✅ **Pass**: Product created with ID  
❌ **Fail**: Check admin role and session cookie

**Note the product ID** from the response (probably `1`). We'll use it in next steps.

---

### Step 2.4: Add Colors to Product

```bash
# Add Black color
curl -X POST http://localhost:3001/api/admin/products/1/colors \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "color_name": "Black",
    "color_code": "#000000",
    "is_available": true,
    "sort_order": 0
  }' | jq

# Add Blue color
curl -X POST http://localhost:3001/api/admin/products/1/colors \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "color_name": "Blue",
    "color_code": "#0066CC",
    "is_available": true,
    "sort_order": 1
  }' | jq

# Add Gray color
curl -X POST http://localhost:3001/api/admin/products/1/colors \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "color_name": "Gray",
    "color_code": "#808080",
    "is_available": true,
    "sort_order": 2
  }' | jq
```

**Expected**: Each returns `"success": true` with color data

---

### Step 2.5: Add Model Variation

```bash
curl -X POST http://localhost:3001/api/admin/products/1/variations \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "variation_type": "model",
    "name": "Base Configuration",
    "description": "Standard cockpit setup with essential components",
    "is_required": true,
    "sort_order": 0,
    "options": [
      {
        "option_name": "Base Cockpit Configuration",
        "option_value": "base",
        "price_adjustment": 0,
        "is_default": true
      }
    ]
  }' | jq
```

**Expected**: Variation created with options

---

### Step 2.6: Add Dropdown Variations with Pricing

```bash
# Rudder Pedals variation
curl -X POST http://localhost:3001/api/admin/products/1/variations \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "variation_type": "dropdown",
    "name": "What rudder pedals are you using?",
    "is_required": true,
    "sort_order": 1,
    "options": [
      {
        "option_name": "Standard Rudder Pedals",
        "option_value": "standard",
        "price_adjustment": 0,
        "is_default": true
      },
      {
        "option_name": "Premium Rudder Pedals",
        "option_value": "premium",
        "price_adjustment": 150.00
      },
      {
        "option_name": "Custom Rudder Pedals",
        "option_value": "custom",
        "price_adjustment": 300.00
      }
    ]
  }' | jq

# Yoke variation
curl -X POST http://localhost:3001/api/admin/products/1/variations \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "variation_type": "dropdown",
    "name": "What yoke are you using?",
    "is_required": false,
    "sort_order": 2,
    "options": [
      {
        "option_name": "No Yoke",
        "option_value": "none",
        "price_adjustment": 0,
        "is_default": true
      },
      {
        "option_name": "Basic Yoke",
        "option_value": "basic",
        "price_adjustment": 100.00
      },
      {
        "option_name": "Advanced Yoke",
        "option_value": "advanced",
        "price_adjustment": 250.00
      }
    ]
  }' | jq
```

**Expected**: Both variations created successfully

---

### Step 2.7: Add Optional Add-ons

```bash
# Articulating Arm addon with options
curl -X POST http://localhost:3001/api/admin/products/1/addons \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "Active Articulating Arm with Keyboard & Mouse or Laptop Tray kit",
    "description": "Adjustable arm for keyboard and mouse positioning",
    "is_required": false,
    "has_options": true,
    "sort_order": 0,
    "options": [
      {
        "name": "Keyboard & Mouse Tray",
        "description": "Standard keyboard and mouse tray",
        "price": 199.00,
        "is_available": true
      },
      {
        "name": "Laptop Tray",
        "description": "Laptop mounting tray",
        "price": 229.00,
        "is_available": true
      }
    ]
  }' | jq

# Monitor Stand addon
curl -X POST http://localhost:3001/api/admin/products/1/addons \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "Triple Monitor Stand",
    "description": "Heavy-duty triple monitor mounting system",
    "base_price": 399.00,
    "is_required": false,
    "has_options": false,
    "sort_order": 1
  }' | jq
```

**Expected**: Add-ons created successfully

---

### Step 2.8: Create Sample Product #2 (Sim Racing)

```bash
curl -X POST http://localhost:3001/api/admin/products \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "sku": "SR-RACING-001",
    "name": "Gen3 Racing Modular Cockpit",
    "slug": "gen3-racing-cockpit",
    "description": "Professional sim racing cockpit with adjustable seating position and modular design for all major racing wheels and pedal sets.",
    "short_description": "The Ultimate Racing Experience",
    "type": "configurable",
    "status": "active",
    "featured": true,
    "regular_price": 799.00,
    "weight_lbs": 65.0,
    "stock_quantity": 10,
    "categories": ["sim-racing", "cockpits"],
    "tags": ["racing", "modular", "featured"]
  }' | jq
```

---

### Step 2.9: Create Sample Product #3 (Accessory)

```bash
curl -X POST http://localhost:3001/api/admin/products \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "sku": "ACC-MONITOR-001",
    "name": "SimFab Single Monitor Mount Stand",
    "slug": "single-monitor-stand",
    "description": "Adjustable monitor mount for single display setups. Compatible with most VESA monitor mounts.",
    "short_description": "Professional Monitor Mounting Solution",
    "type": "simple",
    "status": "active",
    "featured": false,
    "regular_price": 219.00,
    "sale_price": 199.00,
    "stock_quantity": 25,
    "categories": ["monitor-stands", "accessories"],
    "tags": ["monitor", "mount", "sale"]
  }' | jq
```

---

## Part 3: Test Backend API Endpoints (10 minutes)

### Step 3.1: Test Product Listing

```bash
# Get all products
curl http://localhost:3001/api/products | jq
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "sku": "FS-TRAINER-001",
        "name": "SimFab Flight Sim Trainer Station",
        ...
      },
      ...
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 3,
      "totalPages": 1,
      "hasNext": false,
      "hasPrevious": false
    }
  }
}
```

✅ **Pass**: Returns array of 3 products  
❌ **Fail**: Empty array → Products not created

---

### Step 3.2: Test Filtering by Category

```bash
# Get flight sim products only
curl 'http://localhost:3001/api/products?category=flight-sim' | jq
```

**Expected**: Returns only products with `"flight-sim"` in categories (should be 1 product)

---

### Step 3.3: Test Search

```bash
# Search for "trainer"
curl 'http://localhost:3001/api/products/search?q=trainer' | jq

# Search for "racing"
curl 'http://localhost:3001/api/products/search?q=racing' | jq
```

**Expected**: Returns products matching search term

---

### Step 3.4: Test Get Product by ID

```bash
curl http://localhost:3001/api/products/1 | jq
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "SimFab Flight Sim Trainer Station",
    "images": [...],
    "colors": [
      {"id": 1, "name": "Black", ...},
      {"id": 2, "name": "Blue", ...}
    ],
    "variations": {
      "model": [...],
      "dropdown": [...]
    },
    "addons": [...],
    "faqs": [],
    "rating": {
      "average": 0,
      "count": 0
    }
  }
}
```

✅ **Pass**: Full product details with all relations  
❌ **Fail**: Check product ID exists

---

### Step 3.5: Test Get Product by Slug

```bash
curl http://localhost:3001/api/products/slug/flight-sim-trainer-station | jq
```

**Expected**: Same as Step 3.4 (full product details)

✅ **Pass**: Product loaded by slug  
❌ **Fail**: 404 → Check slug is correct

---

### Step 3.6: Test Featured Products

```bash
curl http://localhost:3001/api/products/featured | jq
```

**Expected**: Returns products where `featured = true` (should be 2 products)

---

### Step 3.7: Test Price Calculator (⭐ Important)

```bash
# Calculate price with default configuration
curl -X POST http://localhost:3001/api/products/1/calculate-price \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 1
  }' | jq

# Expected: $999.00 (base price)
```

**Expected Response:**
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
    },
    "breakdown": {
      "base": 999.00,
      "variations": 0,
      "addons": 0
    }
  }
}
```

✅ **Pass**: Returns $999.00

---

### Step 3.8: Test Price Calculator with Configuration

Now let's test with selections:

```bash
# Get variation and addon IDs first
curl http://localhost:3001/api/products/1 | jq '.data.variations, .data.addons'

# Note the IDs, then calculate with configuration:
# Assuming: variation option ID = 2 (Premium Rudder), addon ID = 1, addon option ID = 1

curl -X POST http://localhost:3001/api/products/1/calculate-price \
  -H "Content-Type: application/json" \
  -d '{
    "colorId": 1,
    "dropdownSelections": {
      "2": 4
    },
    "addons": [
      {
        "addonId": 1,
        "optionId": 1
      }
    ],
    "quantity": 1
  }' | jq
```

**Note**: Replace the IDs with actual IDs from your database.

**Expected Calculation:**
```
Base Price:        $999.00
+ Premium Rudder:  $150.00
+ Articulating Arm: $199.00
─────────────────────────
Total:           $1,348.00
```

✅ **Pass**: Correct price with breakdown  
❌ **Fail**: Check variation/addon IDs are correct

---

### Step 3.9: Test Categories Endpoint

```bash
curl http://localhost:3001/api/products/categories | jq
```

**Expected**: Returns list of categories:
```json
{
  "success": true,
  "data": [
    {
      "id": "flight-sim",
      "name": "Flight Simulation",
      "slug": "flight-sim",
      "description": "...",
      "image": "..."
    },
    ...
  ]
}
```

---

## Part 4: Test Frontend Integration (10 minutes)

### Step 4.1: Open Shop Page

1. Navigate to `http://localhost:5173/shop`
2. **You should see**: Product grid with 3 products
3. **Loading**: Brief spinner on initial load
4. **Products**: Cards with images (placeholders), names, prices

✅ **Pass**: Products display  
❌ **Fail**: Shows "No products found" → Check backend is running and products exist

---

### Step 4.2: Test Category Filter

1. Click on "Flight Simulation" category tab
2. **Expected**: Only Flight Sim Trainer shows
3. Click on "Sim Racing"
4. **Expected**: Only Gen3 Racing shows
5. Click "All"
6. **Expected**: All 3 products show

✅ **Pass**: Filtering works  
❌ **Fail**: Check browser console for errors

---

### Step 4.3: Test Search

1. Type "trainer" in search box
2. Press Enter or click Search button
3. **Expected**: Only Flight Sim Trainer shows
4. Clear search and type "monitor"
5. **Expected**: Only Monitor Stand shows

✅ **Pass**: Search works  
❌ **Fail**: Check search query is sending to backend (Network tab)

---

### Step 4.4: Test Pagination (if applicable)

If you have 20+ products:
1. Click "Next" button
2. **Expected**: Shows next page
3. Click "Previous"
4. **Expected**: Back to page 1

---

### Step 4.5: Test Product Detail Page

1. Click "BUY NOW" on Flight Sim Trainer
2. **Expected**: Redirects to `/product/flight-sim-trainer-station`
3. **You should see**:
   - Product name and description
   - Price: "$999.00 - $3522.00" (range)
   - "Current Total: $999.00"
   - Image gallery (placeholders)
   - Color selector with Black, Blue, Gray
   - Dropdown variations
   - Add-on checkboxes

✅ **Pass**: Product detail loads  
❌ **Fail**: 404 error → Check product has correct slug

---

### Step 4.6: Test Real-Time Price Calculator (⭐⭐⭐)

**This is the critical feature!**

On the ProductDetail page:

1. **Note starting price**: Should show "Current Total: $999.00"

2. **Select a color**: 
   - Click "Blue"
   - Price should stay $999.00 (colors don't add cost)

3. **Select Premium Rudder Pedals**:
   - Find "What rudder pedals are you using?" dropdown
   - Select "Premium Rudder Pedals"
   - **Expected**: Price updates to $1,149.00 (+$150)
   - **Expected**: Small spinner appears briefly during calculation

4. **Select Advanced Yoke**:
   - Find "What yoke are you using?" dropdown
   - Select "Advanced Yoke"
   - **Expected**: Price updates to $1,399.00 (+$250)

5. **Add Articulating Arm**:
   - Check the "Active Articulating Arm..." checkbox
   - Select "Keyboard & Mouse Tray" option
   - **Expected**: Price updates to $1,598.00 (+$199)

6. **Final Price Check**: $1,598.00

**Expected Breakdown:**
```
$999 (base) + $150 (rudder) + $250 (yoke) + $199 (arm) = $1,598
```

✅ **Pass**: Price updates instantly with each selection  
❌ **Fail**: Check browser console Network tab for API calls

---

### Step 4.7: Test Loading States

1. Refresh ProductDetail page
2. **Expected**: Loading spinner for ~1 second
3. Then product loads

✅ **Pass**: Smooth loading experience

---

### Step 4.8: Test Error Handling

1. Navigate to `/product/non-existent-product`
2. **Expected**: 
   - Error icon
   - "Product not found" message
   - "Back to Shop" button

✅ **Pass**: Graceful error handling  
❌ **Fail**: Check error handling code

---

### Step 4.9: Test Browser Console

**Open DevTools (F12) → Console**

1. Navigate to Shop page
2. **Expected**: No errors in console
3. Navigate to ProductDetail
4. **Expected**: No errors
5. Change product configuration
6. **Expected**: See network requests to `/calculate-price` endpoint

✅ **Pass**: No console errors  
❌ **Fail**: Fix any JavaScript errors

---

### Step 4.10: Test Network Requests

**Open DevTools (F12) → Network Tab**

1. Refresh Shop page
2. **Expected requests**:
   - `GET /api/products?page=1&limit=20` → 200 OK
   - `GET /api/products/categories` → 200 OK

3. Click on product
4. **Expected requests**:
   - `GET /api/products/slug/flight-sim-trainer-station` → 200 OK
   - `POST /api/products/1/calculate-price` → 200 OK

5. Change configuration
6. **Expected**: New `POST /calculate-price` request for each change

✅ **Pass**: All requests return 200  
❌ **Fail**: Check failing endpoints

---

## Part 5: Advanced Testing (5 minutes)

### Step 5.1: Test Price with Multiple Configurations

Try different combinations on ProductDetail:

**Configuration A:**
- Standard Rudder + No Yoke + No addons = $999

**Configuration B:**
- Premium Rudder + Basic Yoke + No addons = $1,249

**Configuration C:**
- Custom Rudder + Advanced Yoke + Arm + Monitor = $999 + $300 + $250 + $199 + $399 = $2,147

Verify the price calculator handles all combinations correctly.

---

### Step 5.2: Test Pagination with More Products

If you want to test pagination:

```bash
# Create 25 more products quickly
for i in {4..28}; do
  curl -X POST http://localhost:3001/api/admin/products \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d "{
      \"sku\": \"TEST-PRODUCT-$i\",
      \"name\": \"Test Product $i\",
      \"slug\": \"test-product-$i\",
      \"type\": \"simple\",
      \"status\": \"active\",
      \"regular_price\": $((RANDOM % 1000 + 100)),
      \"stock_quantity\": 10,
      \"categories\": [\"accessories\"]
    }" > /dev/null
done

echo "Created 25 test products!"
```

Now refresh Shop page - you should see pagination controls.

---

### Step 5.3: Test Sorting (Manual)

On Shop page, products should be sorted by newest first by default.

To test other sorting:
```bash
# Sort by price ascending
curl 'http://localhost:3001/api/products?sortBy=price&sortOrder=asc' | jq

# Sort by name
curl 'http://localhost:3001/api/products?sortBy=name&sortOrder=asc' | jq
```

**Expected**: Products sorted correctly

---

### Step 5.4: Test Price Range Filter

```bash
# Products between $100 and $500
curl 'http://localhost:3001/api/products?minPrice=100&maxPrice=500' | jq
```

**Expected**: Only products in that price range

---

### Step 5.5: Test Stock Status

```bash
# Set a product to out of stock
psql simfab_dev

UPDATE products SET stock_quantity = 0 WHERE id = 3;
\q

# Refresh Shop page
```

**Expected**: Product shows "Out of Stock" and "OUT OF STOCK" button (disabled)

---

## Part 6: Verify Data Integrity (3 minutes)

### Step 6.1: Check Database Tables

```sql
psql simfab_dev

-- Check products
SELECT id, sku, name, slug, regular_price, stock_quantity, status FROM products;

-- Check colors
SELECT pc.id, p.name, pc.color_name FROM product_colors pc
JOIN products p ON p.id = pc.product_id;

-- Check variations
SELECT pv.id, p.name, pv.variation_type, pv.name as variation_name 
FROM product_variations pv
JOIN products p ON p.id = pv.product_id;

-- Check variation options
SELECT vo.id, pv.name, vo.option_name, vo.price_adjustment 
FROM variation_options vo
JOIN product_variations pv ON pv.id = vo.variation_id;

-- Check addons
SELECT pa.id, p.name, pa.name as addon_name, pa.base_price 
FROM product_addons pa
JOIN products p ON p.id = pa.product_id;

\q
```

**Expected**: All related data properly linked

---

## Part 7: Frontend User Experience Test (5 minutes)

### Step 7.1: Complete User Journey

**Scenario: New customer browses and configures product**

1. **Start**: Go to `http://localhost:5173/shop`
2. **Browse**: See all products
3. **Filter**: Click "Flight Simulation" category
4. **Search**: Type "trainer" and search
5. **View**: Click "BUY NOW" on Flight Sim Trainer
6. **Configure**:
   - Select color: Blue
   - Select Premium Rudder Pedals
   - Select Advanced Yoke
   - Check Articulating Arm addon
   - Select "Keyboard & Mouse Tray" option
7. **Price Check**: Verify price shows $1,598.00
8. **Back**: Click browser back button
9. **Verify**: Back on Shop page

✅ **Pass**: Smooth user experience  
❌ **Fail**: Note any UI issues

---

### Step 7.2: Test Mobile Responsiveness

1. Open DevTools (F12) → Toggle Device Toolbar
2. Select iPhone or Android device
3. Navigate through Shop and ProductDetail
4. **Expected**: Responsive layout, everything readable

---

### Step 7.3: Test Performance

**Open DevTools → Network Tab**

1. Refresh Shop page
2. **Check**: Time to load products (should be < 500ms)
3. Click on product
4. **Check**: Time to load product details (should be < 500ms)
5. Change configuration
6. **Check**: Price calculation time (should be < 200ms)

✅ **Pass**: Fast responses  
❌ **Fail**: Check database queries or add indexes

---

## Part 8: Error Scenarios (5 minutes)

### Step 8.1: Test Backend Down

1. Stop backend server (Ctrl+C in backend terminal)
2. Refresh Shop page
3. **Expected**: Error message with "Try Again" button
4. Restart backend
5. Click "Try Again"
6. **Expected**: Products load

✅ **Pass**: Graceful error handling

---

### Step 8.2: Test Invalid Product ID

```bash
curl http://localhost:3001/api/products/9999 | jq
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Product not found"
  }
}
```

✅ **Pass**: Proper 404 error

---

### Step 8.3: Test Invalid Configuration

```bash
curl -X POST http://localhost:3001/api/products/1/calculate-price \
  -H "Content-Type: application/json" \
  -d '{
    "colorId": 9999,
    "quantity": 1
  }' | jq
```

**Expected**: Should still calculate (invalid colorId ignored) or return validation error

---

### Step 8.4: Test Admin Endpoints Without Auth

```bash
# Try to create product without session cookie
curl -X POST http://localhost:3001/api/admin/products \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "TEST",
    "name": "Test",
    "type": "simple",
    "regular_price": 100
  }' | jq
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

✅ **Pass**: Protected endpoints require auth

---

## Part 9: Checklist Summary

### Backend API ✅
- [ ] Health endpoint responds
- [ ] Database connection works
- [ ] Tables exist (35 tables)
- [ ] Can create products
- [ ] Can add colors
- [ ] Can add variations
- [ ] Can add add-ons
- [ ] GET /api/products returns products
- [ ] GET /api/products/:id works
- [ ] GET /api/products/slug/:slug works
- [ ] Search works
- [ ] Category filter works
- [ ] Featured products works
- [ ] **Price calculator works** ⭐
- [ ] Price calculator with config works ⭐⭐⭐
- [ ] Admin endpoints require auth
- [ ] Error responses are standardized

### Frontend Integration ✅
- [ ] Shop page loads
- [ ] Shop page displays products
- [ ] Categories load from API
- [ ] Category filtering works
- [ ] Search works
- [ ] Pagination shows (if 20+ products)
- [ ] ProductDetail loads by slug
- [ ] Product images display
- [ ] Color selector works
- [ ] Variations display correctly
- [ ] Add-ons display correctly
- [ ] **Price updates in real-time** ⭐⭐⭐
- [ ] Loading states show
- [ ] Error states show
- [ ] 404 page works
- [ ] No console errors
- [ ] Network requests succeed

### User Experience ✅
- [ ] Page loads are fast
- [ ] UI is responsive
- [ ] Price updates smoothly
- [ ] All buttons work
- [ ] Navigation works
- [ ] Back button works
- [ ] Mobile responsive

---

## 🎯 Success Criteria

**Phase 2 is 100% working if:**

✅ All API endpoints return successful responses  
✅ Shop page displays products from database  
✅ Categories and search work  
✅ ProductDetail page loads product by slug  
✅ **Price calculator updates in real-time** ⭐  
✅ All configurations calculate correct prices  
✅ Loading and error states display properly  
✅ No console errors  
✅ Admin endpoints are protected  
✅ Data integrity maintained  

---

## 🐛 Troubleshooting Guide

### Products not showing on Shop page

**Check:**
```bash
# 1. Backend running?
curl http://localhost:3001/health

# 2. Products exist in database?
psql simfab_dev -c "SELECT COUNT(*) FROM products WHERE status='active';"

# 3. API responds?
curl http://localhost:3001/api/products

# 4. Frontend .env configured?
cat .env  # Should have VITE_API_URL=http://localhost:3001
```

### Price calculator not working

**Check:**
```bash
# 1. Test API directly
curl -X POST http://localhost:3001/api/products/1/calculate-price \
  -H "Content-Type: application/json" \
  -d '{"quantity": 1}'

# 2. Check browser console for errors (F12)

# 3. Check Network tab - should see POST requests to /calculate-price

# 4. Verify variations exist
curl http://localhost:3001/api/products/1 | jq '.data.variations'
```

### 401 Unauthorized on admin endpoints

**Solution:**
```bash
# Login again and save cookie
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@simfab.com", "password": "Admin123!"}' \
  -c cookies.txt

# Check role is admin
psql simfab_dev -c "SELECT email, role FROM users WHERE email='admin@simfab.com';"
```

### CORS errors

**Check:**
- Backend `src/index.ts` has CORS configured ✅ (already done)
- Frontend API calls use `credentials: 'include'` ✅ (already done)
- Both servers on localhost

### Product detail 404

**Check:**
- Product has `slug` field in database
- Using `/product/:slug` not `/product/:id`
- Product status is 'active'

---

## 📊 Expected Results Summary

| Test | Expected Result | Status |
|------|----------------|--------|
| Backend health | Server running | ✅ |
| Create product | Product created | ✅ |
| Get products | List of products | ✅ |
| Search | Filtered results | ✅ |
| Category filter | Filtered results | ✅ |
| Get by slug | Full product | ✅ |
| **Price calculator** | **Correct price** | ✅ |
| Shop page | Displays products | ✅ |
| ProductDetail | Loads product | ✅ |
| **Real-time pricing** | **Updates live** | ✅ |
| Error handling | Shows errors | ✅ |

---

## 🎊 If All Tests Pass

**Congratulations!** 🎉

Phase 2 is **100% working!**

You now have:
- ✅ Complete product management backend
- ✅ Dynamic price calculator
- ✅ Fully integrated frontend
- ✅ Real-time price updates
- ✅ Professional user experience

**Next**: Phase 3 - Shopping Cart & Checkout

---

## 📝 Quick Test Script

Save this as `test-products.sh` for quick testing:

```bash
#!/bin/bash

echo "🧪 Testing SimFab Product API..."

echo "\n1. Testing health..."
curl -s http://localhost:3001/health | jq .success

echo "\n2. Getting products..."
curl -s http://localhost:3001/api/products | jq '.data.products | length'

echo "\n3. Getting featured..."
curl -s http://localhost:3001/api/products/featured | jq '.data | length'

echo "\n4. Testing search..."
curl -s 'http://localhost:3001/api/products/search?q=trainer' | jq '.data.products | length'

echo "\n5. Testing price calculator..."
curl -s -X POST http://localhost:3001/api/products/1/calculate-price \
  -H "Content-Type: application/json" \
  -d '{"quantity": 1}' | jq '.data.pricing.total'

echo "\n✅ All tests complete!"
```

Run with: `bash test-products.sh`

---

**Happy Testing!** 🚀

If any tests fail, refer to the Troubleshooting section above.

