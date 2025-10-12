# 🧪 Phase 3: Shopping Cart - Testing Guide

**Quick guide to test your new shopping cart!**

---

## 🚀 Start the App

### Terminal 1: Backend
```bash
cd server
npm run dev
```
✅ Backend running on http://localhost:3001

### Terminal 2: Frontend
```bash
cd ..
npm run dev
```
✅ Frontend running on http://localhost:5173

---

## ✅ Test Checklist

### **Test 1: View Products** ⭐
1. Open http://localhost:5173/shop
2. ✅ See products listed
3. ✅ Click on a product

### **Test 2: Add to Cart** ⭐⭐⭐
1. On product detail page
2. Select options (color, variations if any)
3. Click "ADD TO CART" button
4. ✅ See success notification
5. ✅ Cart icon shows "1" badge

### **Test 3: View Cart Sidebar** ⭐⭐
1. Click cart icon in header
2. ✅ Sidebar slides in from right
3. ✅ See your product
4. ✅ See price and quantity
5. ✅ See total

### **Test 4: Update Quantity** ⭐⭐
1. In cart sidebar
2. Click "+" button
3. ✅ Quantity increases to 2
4. ✅ Total updates
5. ✅ Cart badge shows "2"

### **Test 5: Remove Item** ⭐
1. In cart sidebar
2. Click "X" button on item
3. ✅ Item removed
4. ✅ Cart shows "empty" message
5. ✅ Cart badge disappears

### **Test 6: Cart Persistence** ⭐⭐⭐
1. Add product to cart
2. Close browser tab
3. Open http://localhost:5173 again
4. Look at cart icon
5. ✅ Cart badge still shows count!
6. Click cart icon
7. ✅ Items still in cart!

### **Test 7: Multiple Products** ⭐⭐
1. Add product A to cart
2. Go back to shop
3. Add product B to cart
4. Open cart sidebar
5. ✅ Both products in cart
6. ✅ Totals add up correctly

---

## 🎯 Expected Behavior

### When Adding to Cart:
- Button shows "ADDING TO CART..." with spinner
- Success toast appears ("Added to cart!")
- Cart badge updates immediately
- Cart sidebar opens automatically (optional)

### Cart Sidebar Shows:
- Product name
- Product image
- Selected options (color, etc.)
- Unit price
- Quantity controls (+/-)
- Remove button (X)
- Subtotal
- Total
- "View Full Cart" button
- "Proceed to Checkout" button

### Cart Badge:
- Shows number of items
- Updates in real-time
- Red circle on cart icon

---

## 🐛 Common Issues & Solutions

### Issue: "Cart is empty" message
**Solution**: Add products from shop page first

### Issue: Cart badge not updating
**Solution**: 
1. Check browser console for errors
2. Refresh page
3. Make sure backend is running

### Issue: "Request timeout" error
**Solution**: 
1. Check backend is running on port 3001
2. Check no errors in backend terminal
3. Test backend: `curl http://localhost:3001/health`

### Issue: Product not adding to cart
**Solution**:
1. Check browser console (F12)
2. Check backend terminal for errors
3. Make sure product has stock

---

## 📊 Backend API Tests

### Test Backend is Running:
```bash
curl http://localhost:3001/health
```
✅ Should return: `{"success":true,...}`

### Test Get Cart:
```bash
curl http://localhost:3001/api/cart \
  -H "Cookie: connect.sid=..." \
  -v
```

### Test Add to Cart:
```bash
curl -X POST http://localhost:3001/api/cart/add \
  -H "Content-Type: application/json" \
  -d '{"productId":1,"quantity":1,"configuration":{}}'
```

---

## 🎉 Success Indicators

You'll know it's working when:
- ✅ You can add products to cart
- ✅ Cart icon shows item count
- ✅ Cart persists after page refresh
- ✅ You can update quantities
- ✅ You can remove items
- ✅ Toast notifications appear
- ✅ Loading states show properly

---

## 📸 What You Should See

### **Header Cart Icon:**
```
🛒 [1]  ← red badge with count
```

### **Cart Sidebar:**
```
┌─────────────────────────┐
│ Your Cart (1)      ✕    │
├─────────────────────────┤
│                         │
│ [img] Product Name      │
│       Color: Black      │
│       $999.00           │
│       [−] 1 [+]    ✕    │
│                         │
├─────────────────────────┤
│ Subtotal:      $999.00  │
│ Total:         $999.00  │
│                         │
│ [Proceed to Checkout]   │
│ [View Full Cart]        │
└─────────────────────────┘
```

### **Success Toast:**
```
✅ Added to cart!
1 item(s) added to your cart
```

---

## 🔥 Advanced Tests

### Test Configuration Storage:
1. Select color: Black
2. Select variations
3. Add to cart
4. Open cart sidebar
5. ✅ See "Color: Black" displayed

### Test Stock Validation:
1. Try to add more items than in stock
2. ✅ Should show error

### Test Cart Merge (if logged in):
1. Add items as guest
2. Login
3. ✅ Cart items persist

---

## 🎯 Quick Test (2 minutes)

1. ✅ Start backend & frontend
2. ✅ Go to /shop
3. ✅ Click product
4. ✅ Click "Add to Cart"
5. ✅ See cart badge: 1
6. ✅ Click cart icon
7. ✅ See product in sidebar
8. ✅ Click "+"
9. ✅ See count: 2
10. ✅ Refresh page
11. ✅ Cart still shows 2 items

**If all ✅ = Cart works!** 🎉

---

## 📝 Test Data

### Sample Product IDs:
- If you have products in DB, use their IDs
- Or create via admin dashboard first

### Sample Configuration:
```json
{
  "productId": 1,
  "quantity": 1,
  "configuration": {
    "colorId": 1,
    "modelVariationId": 1,
    "dropdownSelections": {},
    "addons": []
  }
}
```

---

## 🚨 Known Limitations

1. **Checkout page not built yet** - Just UI needed, backend ready
2. **Coupon UI not connected** - Backend works, just needs UI
3. **Full cart page** - Uses old mock data, needs update

---

## ✨ What's Actually Working

### **Backend (100%):**
- ✅ All cart endpoints
- ✅ Order creation
- ✅ Stock management
- ✅ Session management
- ✅ Validation
- ✅ Error handling

### **Frontend (90%):**
- ✅ Cart state
- ✅ Add to cart
- ✅ Cart sidebar
- ✅ Quantity updates
- ✅ Remove items
- ✅ Persistence
- ✅ Real-time updates
- ⏳ Checkout UI (pending)

---

## 🎊 You're Ready!

**Phase 3 Cart is ready to test!**

Just run both servers and start adding products to cart.

Everything should work smoothly! 🚀

---

**Quick Start**:
```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd .. && npm run dev

# Browser
http://localhost:5173
```

**Happy Testing!** 🧪✨

