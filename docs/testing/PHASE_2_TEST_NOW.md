# 🚀 Phase 2: Test Everything NOW!

**Quick start guide to test Phase 2 in under 5 minutes**

---

## ⚡ Super Quick Test (1 minute)

### 1. Verify servers are running:

```bash
# Check backend
curl http://localhost:3001/health

# Should return: {"success":true,"message":"Server is running"...}
```

✅ **Backend running**

```bash
# Check frontend
open http://localhost:5173
```

✅ **Frontend running**

---

## 🌱 Seed Sample Data (2 minutes)

### Option A: SQL Seed (Fastest)

```bash
cd server
psql simfab_dev < seed-sample-products.sql
```

✅ **6 products created with full configurations!**

### Option B: API Seed (Via Script)

```bash
cd server
chmod +x seed-via-api.sh
./seed-via-api.sh
```

✅ **6 products created via API!**

### Option C: Manual Quick Product

```sql
psql simfab_dev

INSERT INTO products (sku, name, slug, type, status, regular_price, stock_quantity, categories)
VALUES ('TEST-001', 'Test Product', 'test-product', 'simple', 'active', 99.00, 10, '["accessories"]'::jsonb);
```

---

## 🧪 Test Frontend (2 minutes)

### 1. Test Shop Page

```
Open: http://localhost:5173/shop
```

**Expected:**
- ✅ See 6 products in grid
- ✅ Category tabs at top
- ✅ Search bar working
- ✅ Products show name, price, "BUY NOW" button

**Try:**
- Click "Flight Simulation" → See 1 product
- Search "racing" → See racing products
- Click "BUY NOW" on any product

---

### 2. Test Product Detail + Price Calculator

```
Open: http://localhost:5173/product/flight-sim-trainer-station
```

**Expected:**
- ✅ Product name: "SimFab Flight Sim Trainer Station"
- ✅ Price range: "$999.00 - $2747.00"
- ✅ Current Total: "$999.00"
- ✅ Color selector (Black, Blue, Gray, Olive Green)
- ✅ Dropdown: "What rudder pedals are you using?"
- ✅ Dropdown: "What yoke are you using?"
- ✅ Addon: "Active Articulating Arm Kit"

**Test Price Calculator:**

1. **Base Price**: $999.00 ✅
2. Select "Premium Rudder Pedals" → **$1,149.00** ✅
3. Select "Advanced Yoke" → **$1,399.00** ✅
4. Check "Articulating Arm" + Select "Keyboard Tray" → **$1,598.00** ✅

**If price updates on each selection = SUCCESS!** 🎉

---

## ✅ Quick Checklist

### Backend
- [ ] Server starts without errors
- [ ] `/health` returns success
- [ ] Can create products via API
- [ ] Can get products: `GET /api/products`
- [ ] Can get by slug: `GET /api/products/slug/...`
- [ ] Price calculator works: `POST /api/products/1/calculate-price`

### Frontend
- [ ] Shop page loads
- [ ] Products display
- [ ] Can filter by category
- [ ] Can search
- [ ] ProductDetail loads by slug
- [ ] **Price calculator updates in real-time** ⭐⭐⭐
- [ ] No console errors

---

## 🎯 The Ultimate Test

**Complete User Journey:**

1. Go to Shop: `http://localhost:5173/shop`
2. See all 6 products
3. Click "Flight Simulation" category
4. Click "BUY NOW" on Flight Sim Trainer
5. Arrives at ProductDetail page
6. Select color: Blue
7. Select "Premium Rudder Pedals" → Price: $1,149
8. Select "Advanced Yoke" → Price: $1,399
9. Check "Articulating Arm" → Price: $1,598
10. Watch price update after each selection

**✅ If all steps work = Phase 2 is 100% COMPLETE!**

---

## 📊 What You Should See

### Shop Page
```
┌─────────────────────────────────────────────────────┐
│  SimFab Shop                    [Search: _______ 🔍] │
│  ─────                                                │
│                                                       │
│  All  Flight Sim  Sim Racing  Monitor Stands  Acc   │
│  ───                                                  │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ [Image]  │  │ [Image]  │  │ [Image]  │          │
│  │ Trainer  │  │ Racing   │  │ Monitor  │          │
│  │ $999-    │  │ $799-    │  │ $199.00  │          │
│  │[BUY NOW] │  │[BUY NOW] │  │[BUY NOW] │          │
│  └──────────┘  └──────────┘  └──────────┘          │
└─────────────────────────────────────────────────────┘
```

### ProductDetail Page
```
┌─────────────────────────────────────────────────────┐
│  Home / Shop / Flight Sim Trainer Station           │
│                                                       │
│  ┌─────────────┐   SimFab Flight Sim Trainer        │
│  │   [Image]   │   $999.00 - $2747.00                │
│  │   Gallery   │   Current Total: $1,598.00 💰        │
│  └─────────────┘                                      │
│                    🎨 Color: [●Black] [○Blue]        │
│                    ▼ Rudder: [Premium] +$150         │
│                    ▼ Yoke: [Advanced] +$250          │
│                    ☑ Arm Kit: $199                   │
│                    [🛒 ADD TO CART]                   │
└─────────────────────────────────────────────────────┘
```

---

## 🚨 If Tests Fail

### Backend not responding?
```bash
cd server
npm run dev
```

### Frontend not loading?
```bash
npm run dev
```

### No products showing?
```bash
# Run seed script
cd server
psql simfab_dev < seed-sample-products.sql
```

### Price not updating?
```bash
# Check browser console (F12)
# Check Network tab for API calls
# Verify variations exist in database
```

---

## 🎉 Success = All These Work

1. ✅ Shop page shows products
2. ✅ Categories filter products
3. ✅ Search finds products
4. ✅ ProductDetail loads
5. ✅ **Price updates when you change options** ⭐
6. ✅ No errors in console
7. ✅ Smooth user experience

---

## 📚 Full Guides

- **Complete Testing**: `PHASE_2_TESTING_GUIDE.md` (detailed step-by-step)
- **Quick Start**: `PHASE_2_QUICKSTART.md` (backend setup)
- **Integration**: `PHASE_2_FRONTEND_INTEGRATION.md` (what was built)
- **Summary**: `PHASE_2_COMPLETE.md` (full documentation)

---

## 💡 Pro Tips

1. **Use `jq` for pretty JSON**: `curl ... | jq`
2. **Save admin session**: `-c cookies.txt` (first login), `-b cookies.txt` (subsequent)
3. **Check database anytime**: `psql simfab_dev -c "SELECT * FROM products;"`
4. **Watch price changes**: Open browser DevTools Network tab
5. **Clear data**: `psql simfab_dev -c "TRUNCATE products CASCADE;"`

---

## 🎯 The One Test That Matters Most

**Go to ProductDetail and change configuration options.**

**If the price updates in real-time = PHASE 2 WORKS!** 🎉

---

**Ready? Let's test!** 🚀

```bash
# 1. Seed data
cd server && psql simfab_dev < seed-sample-products.sql

# 2. Open frontend
open http://localhost:5173/shop

# 3. Configure a product
# Go to product detail and select options

# 4. Watch the magic happen! ✨
```

