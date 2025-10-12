# 📋 Phase 3: Shopping Cart & Checkout - Implementation Plan

**Goal**: Build complete shopping cart system with session management and checkout flow  
**Duration**: 2-3 weeks  
**Complexity**: Medium  
**Dependencies**: Phase 1 ✅, Phase 2 ✅

---

## 📊 Phase 3 Overview

### What We're Building

**Shopping Cart System:**
- Session-based cart (for guest users)
- User-linked cart (for logged-in users)
- Cart merge when guest logs in
- Store complex product configurations
- Real-time inventory validation
- Coupon/discount code system
- Shipping calculation

**Checkout Process:**
- Multi-step checkout flow
- Address validation
- Shipping method selection
- Order summary
- Order creation
- Integration ready for payments (Phase 4)

---

## 🗄️ Database Schema (Already Created in Phase 1!)

### Tables Available:
- ✅ `carts` - Shopping cart sessions
- ✅ `cart_items` - Items in carts with configurations
- ✅ `orders` - Order records
- ✅ `order_items` - Products in orders
- ✅ `user_addresses` - Saved addresses
- ✅ `coupons` - Discount codes

**Good news**: Database schema is already complete from Phase 1! 🎉

---

## 📋 Phase 3 Todo List

### Week 1: Cart Backend (Days 1-5)

#### Day 1-2: Cart Services
- [ ] **CartService** - Core cart operations
  - [ ] `getCart()` - Get cart by session or user ID
  - [ ] `createCart()` - Initialize new cart
  - [ ] `addItem()` - Add product with configuration
  - [ ] `updateItem()` - Update quantity or configuration
  - [ ] `removeItem()` - Remove item from cart
  - [ ] `clearCart()` - Empty entire cart
  - [ ] `mergeCart()` - Merge guest cart with user cart on login
  - [ ] `validateCartItems()` - Check stock availability
  - [ ] `calculateCartTotals()` - Compute subtotal, tax, shipping

- [ ] **CouponService** - Discount code management
  - [ ] `validateCoupon()` - Check if coupon is valid
  - [ ] `applyCoupon()` - Apply discount to cart
  - [ ] `removeCoupon()` - Remove discount
  - [ ] `calculateDiscount()` - Compute discount amount

#### Day 3: Cart Controller & Routes
- [ ] **CartController** - HTTP endpoints
  - [ ] `GET /api/cart` - Get current cart
  - [ ] `POST /api/cart/add` - Add item
  - [ ] `PUT /api/cart/items/:itemId` - Update item
  - [ ] `DELETE /api/cart/items/:itemId` - Remove item
  - [ ] `DELETE /api/cart/clear` - Clear cart
  - [ ] `POST /api/cart/apply-coupon` - Apply coupon
  - [ ] `DELETE /api/cart/remove-coupon` - Remove coupon
  - [ ] `POST /api/cart/merge` - Merge guest cart

- [ ] Create cart routes
- [ ] Create cart validation schemas

#### Day 4-5: Order System
- [ ] **OrderService** - Order creation and management
  - [ ] `createOrder()` - Create order from cart
  - [ ] `getOrderById()` - Get order details
  - [ ] `getUserOrders()` - Get user's order history
  - [ ] `updateOrderStatus()` - Update order status
  - [ ] `cancelOrder()` - Cancel pending order

- [ ] **OrderController** - Order endpoints
  - [ ] `POST /api/orders` - Create order
  - [ ] `GET /api/orders` - Get user orders
  - [ ] `GET /api/orders/:orderNumber` - Get order details
  - [ ] `POST /api/orders/:orderNumber/cancel` - Cancel order

---

### Week 2: Cart Frontend (Days 6-10)

#### Day 6-7: Cart Context & State
- [ ] **CartContext** - Global cart state
  - [ ] Cart items state
  - [ ] Cart totals state
  - [ ] Loading states
  - [ ] Add to cart function
  - [ ] Update quantity function
  - [ ] Remove item function
  - [ ] Apply coupon function
  - [ ] Clear cart function

- [ ] **Cart API Integration**
  - [ ] Add cart methods to `api.ts`
  - [ ] TypeScript types for cart
  - [ ] Error handling

#### Day 8: Cart UI Components
- [ ] **Update CartSidebar** (`src/components/CartSidebar.tsx`)
  - [ ] Connect to CartContext
  - [ ] Display real cart items
  - [ ] Update quantity controls
  - [ ] Remove item buttons
  - [ ] Apply coupon input
  - [ ] Subtotal calculation
  - [ ] Proceed to checkout button

- [ ] **Mini Cart** in Header
  - [ ] Show cart item count
  - [ ] Real-time updates

#### Day 9: Add to Cart Integration
- [ ] **ProductDetail Page**
  - [ ] Connect "Add to Cart" button
  - [ ] Validate configuration before adding
  - [ ] Show success notification
  - [ ] Update cart count in header
  - [ ] Open cart sidebar on add

- [ ] **Shop Page**
  - [ ] Quick add to cart (for simple products)

#### Day 10: Cart Page
- [ ] **Update Cart Page** (`src/pages/Cart.tsx`)
  - [ ] Display full cart
  - [ ] Update quantities
  - [ ] Remove items
  - [ ] Apply coupon code
  - [ ] Show shipping estimates
  - [ ] Proceed to checkout button

---

### Week 3: Checkout Flow (Days 11-15)

#### Day 11-12: Checkout Page
- [ ] **Multi-step Checkout** (`src/pages/Checkout.tsx`)
  - [ ] Step 1: Shipping Address
    - [ ] Address form
    - [ ] Save address option
    - [ ] Use saved addresses dropdown
  - [ ] Step 2: Shipping Method
    - [ ] Display shipping options
    - [ ] Calculate shipping costs
    - [ ] Select shipping method
  - [ ] Step 3: Review Order
    - [ ] Order summary
    - [ ] Edit cart link
    - [ ] Total calculation
  - [ ] Step 4: Payment (placeholder for Phase 4)
    - [ ] Payment method selection
    - [ ] Order notes
    - [ ] Terms & conditions checkbox

#### Day 13: Order Creation
- [ ] **Order Submission**
  - [ ] Validate cart not empty
  - [ ] Validate addresses
  - [ ] Create order in database
  - [ ] Clear cart after order
  - [ ] Redirect to order confirmation

- [ ] **Order Confirmation Page**
  - [ ] Display order details
  - [ ] Show order number
  - [ ] Show estimated delivery
  - [ ] Print invoice button

#### Day 14: Order History
- [ ] **Profile Page** - Order History Tab
  - [ ] List user orders
  - [ ] Order status badges
  - [ ] View order details
  - [ ] Reorder button
  - [ ] Cancel order button (if pending)

#### Day 15: Testing & Polish
- [ ] Test complete cart flow
- [ ] Test guest checkout
- [ ] Test logged-in checkout
- [ ] Test cart persistence
- [ ] Test cart merge on login
- [ ] Test inventory validation
- [ ] Test coupon codes
- [ ] Fix bugs and edge cases

---

## 🎯 Key Features to Implement

### 1. **Session-Based Cart** (Critical)

**For Guest Users:**
- Cart stored by session ID
- Persists across page refreshes
- Expires after 7 days
- Auto-cleanup of old carts

**For Logged-In Users:**
- Cart linked to user ID
- Persists forever (until checkout)
- Syncs across devices
- Merges with guest cart on login

**Implementation:**
```typescript
// Cart stored in database with:
{
  id: "cart_abc123",
  userId: null, // null for guests
  sessionId: "sess_xyz789", // session ID
  items: [...],
  totals: {...},
  expiresAt: "2025-10-19T..."
}
```

### 2. **Complex Product Configuration Storage**

**Must Store:**
```typescript
{
  productId: 101,
  quantity: 1,
  configuration: {
    colorId: 1,
    modelVariationId: 1,
    dropdownSelections: { 2: 4, 3: 1 },
    addons: [{ addonId: 1, optionId: 1 }]
  },
  calculatedPrice: 1348.00,
  priceBreakdown: {...}
}
```

### 3. **Real-Time Validation**

**Before Adding to Cart:**
- ✅ Product exists
- ✅ Product is active
- ✅ Stock available
- ✅ Configuration is valid (required options selected)

**Before Checkout:**
- ✅ All items still in stock
- ✅ Prices haven't changed significantly
- ✅ Products still active
- ✅ Cart not empty

### 4. **Coupon System**

**Features:**
- Percentage discounts (10% off)
- Fixed amount ($50 off)
- Minimum order amount
- Expiration dates
- Usage limits
- One per order

**Validation:**
- Check if code exists
- Check if not expired
- Check minimum met
- Check usage limit not exceeded

### 5. **Cart Merge Logic**

**When Guest Logs In:**
```typescript
// Scenario: Guest has 2 items, User has 3 items
1. Get guest cart (by session)
2. Get user cart (by user ID)
3. Merge items:
   - If same product+config: Add quantities
   - If different: Add as new item
4. Delete guest cart
5. Return merged cart
```

---

## 📁 Files to Create

### Backend Services
```
server/src/services/
├── CartService.ts              ⭐ Core cart operations (500+ lines)
├── CartItemService.ts          ⭐ Cart item management (300+ lines)
├── CouponService.ts            ⭐ Discount codes (200+ lines)
├── OrderService.ts             ⭐ Order creation (400+ lines)
└── AddressService.ts           ⭐ Address management (200+ lines)
```

### Backend Controllers
```
server/src/controllers/
├── cartController.ts           ⭐ Cart endpoints (400+ lines)
└── orderController.ts          ⭐ Order endpoints (300+ lines)
```

### Backend Routes
```
server/src/routes/
├── cart.ts                     ⭐ Cart routes
└── orders.ts                   ⭐ Order routes
```

### Backend Validators
```
server/src/validators/
├── cart.ts                     ⭐ Cart validation schemas
└── order.ts                    ⭐ Order validation schemas
```

### Frontend State Management
```
src/contexts/
└── CartContext.tsx             ⭐ Global cart state (400+ lines)
```

### Frontend Pages
```
src/pages/
├── Cart.tsx                    🔄 Update with real API (300+ lines)
├── Checkout.tsx                🔄 Complete checkout flow (500+ lines)
└── OrderConfirmation.tsx       ⭐ New page (200+ lines)
```

### Frontend Components
```
src/components/
├── CartSidebar.tsx             🔄 Update with CartContext
├── CheckoutSteps.tsx           ⭐ New - Stepper component
├── AddressForm.tsx             ⭐ New - Address input
└── OrderSummary.tsx            ⭐ New - Order review
```

---

## 🎯 Phase 3 Implementation Strategy

### **Week 1: Cart Backend** (Foundation)

**Goal**: Working cart API that can store products with configurations

**Tasks:**
1. Create CartService with all cart operations
2. Create CouponService for discounts
3. Create CartController with 8 endpoints
4. Create validation schemas
5. Test all endpoints with Postman/cURL

**Success Criteria:**
- ✅ Can add product to cart via API
- ✅ Can update cart item quantity
- ✅ Can remove cart item
- ✅ Can apply coupon code
- ✅ Cart persists in database
- ✅ Cart totals calculate correctly

---

### **Week 2: Cart Frontend** (User Interface)

**Goal**: Users can add products to cart and see cart contents

**Tasks:**
1. Create CartContext for global state
2. Update CartSidebar with real data
3. Connect Add to Cart buttons
4. Update Cart page
5. Add cart icon badge in header

**Success Criteria:**
- ✅ Can add product to cart from ProductDetail
- ✅ Cart count updates in header
- ✅ CartSidebar shows real items
- ✅ Can update quantities in cart
- ✅ Can remove items
- ✅ Cart persists on refresh

---

### **Week 3: Checkout & Orders** (Complete the Flow)

**Goal**: Users can complete checkout and create orders

**Tasks:**
1. Build multi-step checkout UI
2. Address form and validation
3. Order creation logic
4. Order confirmation page
5. Order history in profile

**Success Criteria:**
- ✅ Can proceed through checkout steps
- ✅ Can enter shipping address
- ✅ Order is created in database
- ✅ Cart clears after order
- ✅ Order shows in history
- ✅ Can view order details

---

## 🔑 Key Technical Decisions

### **Cart Storage Strategy**

**Database-First Approach** (Recommended):
- All carts stored in PostgreSQL
- Session ID for guests
- User ID for logged-in users
- 7-day expiration for guest carts
- Permanent for user carts

**Benefits:**
- ✅ Survives browser close
- ✅ Works across devices (for users)
- ✅ Reliable and consistent
- ✅ Easy to query and analyze

**Alternative** (Not recommended):
- LocalStorage: Doesn't work across devices
- Redux only: Lost on refresh
- Cookies: Size limitations

### **Cart Data Structure**

```typescript
// Cart Table
{
  id: UUID,
  user_id: number | null,
  session_id: string | null,
  items: JSONB,  // Array of cart items
  totals: JSONB, // Subtotal, tax, shipping, total
  applied_coupons: JSONB,
  created_at: timestamp,
  updated_at: timestamp,
  expires_at: timestamp
}

// Cart Item Structure (stored in items JSONB)
{
  id: string,
  product_id: number,
  product_name: string,
  product_sku: string,
  product_image: string,
  quantity: number,
  configuration: {
    colorId: number,
    modelVariationId: number,
    dropdownSelections: {...},
    addons: [...]
  },
  pricing: {
    unitPrice: number,
    lineTotal: number,
    originalPrice: number,
    discount: number
  },
  addedAt: timestamp
}
```

### **Cart Operations Flow**

**Add to Cart:**
```
1. User clicks "Add to Cart" on ProductDetail
2. Validate configuration (all required options selected)
3. Calculate price with PriceCalculatorService
4. Get or create cart (by session/user)
5. Check if same product+config already in cart
   - If yes: Increase quantity
   - If no: Add new item
6. Validate stock availability
7. Save cart to database
8. Return updated cart
9. Update UI (show cart sidebar)
```

**Update Quantity:**
```
1. User changes quantity in cart
2. Validate new quantity (1-100, in stock)
3. Update cart item
4. Recalculate totals
5. Save to database
6. Return updated cart
```

**Apply Coupon:**
```
1. User enters coupon code
2. Validate coupon (exists, not expired, min order met)
3. Calculate discount amount
4. Apply to cart totals
5. Save cart with coupon
6. Show discount in UI
```

---

## 🛒 Cart API Endpoints (8 endpoints)

### Public Cart Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/cart` | Get current cart |
| `POST` | `/api/cart/add` | Add item to cart |
| `PUT` | `/api/cart/items/:itemId` | Update cart item quantity |
| `DELETE` | `/api/cart/items/:itemId` | Remove item from cart |
| `DELETE` | `/api/cart/clear` | Clear entire cart |
| `POST` | `/api/cart/apply-coupon` | Apply discount coupon |
| `DELETE` | `/api/cart/remove-coupon` | Remove coupon |
| `POST` | `/api/cart/merge` | Merge guest cart with user cart (on login) |

---

## 📦 Order API Endpoints (4 endpoints)

### Customer Order Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/orders` | Create new order from cart |
| `GET` | `/api/orders` | List user's orders |
| `GET` | `/api/orders/:orderNumber` | Get order details |
| `POST` | `/api/orders/:orderNumber/cancel` | Cancel pending order |

---

## 🎨 Frontend Cart Components

### **CartContext** (Global State)

```typescript
interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  itemCount: number;
  
  // Actions
  addToCart: (productId, configuration, quantity) => Promise<void>;
  updateQuantity: (itemId, quantity) => Promise<void>;
  removeItem: (itemId) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code) => Promise<void>;
  removeCoupon: () => Promise<void>;
  refreshCart: () => Promise<void>;
}
```

### **CartSidebar** (Updated)

Features:
- List of cart items with images
- Quantity controls (+ / -)
- Remove item button
- Subtotal display
- Coupon input
- "Proceed to Checkout" button
- Empty cart state

### **Cart Page** (Full Page View)

Features:
- Larger cart item cards
- Product configuration display
- Quantity inputs
- Price breakdown
- Coupon code section
- Continue shopping button
- Checkout button

### **Checkout Page** (Multi-Step)

**Step 1: Shipping Information**
- Address form
- Use saved addresses dropdown
- Save address checkbox
- Continue to shipping button

**Step 2: Shipping Method**
- List of shipping options with prices
- Estimated delivery dates
- Select shipping method
- Continue to review button

**Step 3: Order Review**
- Cart items summary
- Shipping address
- Shipping method
- Price breakdown
- Edit links for each section
- Place order button (creates order)

**Step 4: Order Confirmation**
- Order number
- Order details
- Estimated delivery
- Continue shopping button

---

## 💻 Example Code Structure

### Backend: CartService

```typescript
export class CartService {
  async getCart(sessionId?: string, userId?: number) {
    // Get cart by session or user
  }

  async addItem(cartId: string, item: CartItemData) {
    // Add item to cart with configuration
    // Calculate price using PriceCalculatorService
    // Validate stock
    // Check for duplicates
  }

  async updateQuantity(itemId: string, quantity: number) {
    // Update item quantity
    // Validate stock availability
    // Recalculate totals
  }

  async calculateTotals(cartId: string) {
    // Sum all item line totals
    // Apply coupons
    // Calculate tax (if applicable)
    // Calculate shipping (if address provided)
  }

  async mergeGuestCart(sessionId: string, userId: number) {
    // Get guest cart
    // Get user cart
    // Merge items
    // Delete guest cart
    // Return merged cart
  }
}
```

### Frontend: CartContext

```typescript
export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);

  const addToCart = async (productId, configuration, quantity) => {
    try {
      setLoading(true);
      const response = await cartAPI.add({
        productId,
        configuration,
        quantity
      });
      setCart(response.data.cart);
      toast.success('Added to cart!');
    } catch (error) {
      toast.error('Failed to add to cart');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CartContext.Provider value={{ cart, loading, addToCart, ... }}>
      {children}
    </CartContext.Provider>
  );
};
```

---

## 🧪 Testing Strategy

### Backend Tests
1. Create cart for guest user
2. Add item with configuration
3. Verify price calculated correctly
4. Update quantity
5. Apply coupon
6. Verify discount applied
7. Remove item
8. Clear cart
9. Create order from cart
10. Verify cart cleared after order

### Frontend Tests
1. Add product to cart from ProductDetail
2. See cart count update in header
3. Open CartSidebar
4. See item with correct price
5. Update quantity
6. Remove item
7. Apply coupon code
8. Go to Cart page
9. Proceed to Checkout
10. Complete checkout
11. See order confirmation

### Integration Tests
1. Guest adds items → Logs in → Cart persists
2. Configure complex product → Add to cart → Verify config saved
3. Add multiple items → Apply coupon → Verify discount
4. Complete full checkout flow
5. View order in history

---

## 📊 Success Metrics

**Phase 3 Complete When:**
- ✅ Can add products to cart
- ✅ Cart persists on page refresh
- ✅ Can update quantities
- ✅ Can remove items
- ✅ Can apply coupons
- ✅ Cart shows in sidebar and page
- ✅ Can proceed to checkout
- ✅ Can enter shipping address
- ✅ Can create order
- ✅ Cart clears after order
- ✅ Can view order history
- ✅ Cart icon shows item count
- ✅ Complex configurations stored correctly

---

## 🔒 Security Considerations

### Cart Security
- ✅ Validate all inputs
- ✅ Verify product exists and is active
- ✅ Check stock availability server-side
- ✅ Recalculate prices server-side (never trust client)
- ✅ Validate coupon server-side
- ✅ Prevent negative quantities
- ✅ Limit max quantity (prevent abuse)

### Order Security
- ✅ Verify user owns cart
- ✅ Validate addresses
- ✅ Check inventory before order creation
- ✅ Use transactions for order creation
- ✅ Generate unique order numbers
- ✅ Log all order actions

---

## 🎯 Phase 3 Milestones

### Milestone 1: Working Cart (Week 1)
- [ ] Cart backend API complete
- [ ] Can add/update/remove items via API
- [ ] Coupon system works
- [ ] All endpoints tested

### Milestone 2: Cart UI (Week 2)
- [ ] CartContext implemented
- [ ] CartSidebar shows real data
- [ ] Add to Cart button works
- [ ] Cart page functional
- [ ] Cart icon updates

### Milestone 3: Checkout (Week 3)
- [ ] Checkout flow complete
- [ ] Address management works
- [ ] Order creation works
- [ ] Order history displays
- [ ] Full flow tested

---

## 💡 Implementation Tips

### Tip 1: Start Simple
- Begin with basic cart operations
- Add complexity gradually
- Test each feature before moving on

### Tip 2: Use Existing Code
- PriceCalculatorService already exists (reuse it!)
- Product validation already works
- Session management already works
- Build on Phase 1 & 2 foundation

### Tip 3: Handle Edge Cases
- Empty cart
- Out of stock items
- Invalid configurations
- Expired coupons
- Deleted products
- Changed prices

### Tip 4: User Experience
- Show loading states
- Clear error messages
- Success notifications
- Optimistic updates where safe
- Smooth transitions

---

## 🚀 Ready to Start Phase 3?

**Phase 3 builds on:**
- ✅ Phase 1: Database schema, auth, sessions
- ✅ Phase 2: Products, price calculator, admin

**Phase 3 delivers:**
- 🛒 Complete shopping cart
- 💳 Checkout process
- 📦 Order creation
- 📜 Order history

**Estimated Time**: 2-3 weeks  
**Difficulty**: Medium  
**Files to Create**: ~15 files  
**Lines of Code**: ~3,000-4,000 lines

---

## 📈 Development Approach

### Option A: Backend-First (Recommended)
1. Build all cart/order services
2. Create all API endpoints
3. Test with Postman
4. Then build frontend

**Pros**: Solid foundation, easy to test  
**Cons**: Can't see results immediately

### Option B: Feature-by-Feature
1. Build "Add to Cart" (backend + frontend)
2. Build "View Cart" (backend + frontend)
3. Build "Update Cart" (backend + frontend)
4. Build "Checkout" (backend + frontend)

**Pros**: See progress quickly, iterative  
**Cons**: More context switching

### Option C: Hybrid (Best for This Project)
1. Build cart backend (Days 1-5)
2. Build cart frontend (Days 6-10)
3. Build checkout together (Days 11-15)

**Pros**: Balance of both approaches  
**Cons**: None

---

## 🎊 What You'll Achieve

**After Phase 3:**
- ✅ Full e-commerce cart system
- ✅ Complex product configurations in cart
- ✅ Session persistence
- ✅ Coupon discounts
- ✅ Checkout flow
- ✅ Order creation
- ✅ Order management
- ✅ Professional shopping experience

**Then Phase 4:**
- 💳 PayPal payment integration
- 💰 Payment processing
- 🔄 Refunds

---

## 📚 Documentation to Create

- **PHASE_3_PLAN.md** (this file)
- **PHASE_3_IMPLEMENTATION.md** - Detailed implementation
- **PHASE_3_API_SPEC.md** - Cart/Order API specs
- **PHASE_3_TESTING_GUIDE.md** - How to test
- **PHASE_3_COMPLETE.md** - Summary when done

---

## ✅ Phase 3 Checklist

### Backend (Week 1)
- [ ] CartService created
- [ ] CouponService created  
- [ ] OrderService created
- [ ] CartController created
- [ ] OrderController created
- [ ] Cart routes created
- [ ] Order routes created
- [ ] Validation schemas created
- [ ] All endpoints tested

### Frontend (Week 2)
- [ ] CartContext created
- [ ] Cart API methods added
- [ ] CartSidebar updated
- [ ] Add to Cart connected
- [ ] Cart page updated
- [ ] Cart icon badge working

### Checkout (Week 3)
- [ ] Checkout page built
- [ ] Address form created
- [ ] Multi-step flow working
- [ ] Order creation working
- [ ] Order confirmation page
- [ ] Order history working
- [ ] Full flow tested

---

**Ready to build Phase 3?** Let me know when you want to start! 🚀

I'll create the cart services, controllers, and routes systematically, just like we did for Phase 2.

