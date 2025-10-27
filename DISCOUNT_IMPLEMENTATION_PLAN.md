# 💰 Discount & Coupon System Implementation Plan

**Project**: SimFab E-commerce Platform  
**Feature**: Product Discounts & Admin Coupon Management  
**Phase**: Discount System Integration  
**Duration**: 1-2 weeks  
**Complexity**: Medium  
**Dependencies**: Existing Cart, Order, and Payment Systems

---

## 📊 Current System Analysis

### ✅ **What's Already Built**
- **Coupon System**: Database schema for coupons (`coupons` table)
- **Coupon Service**: Basic coupon validation and discount calculation
- **Cart Integration**: Cart totals include discount field
- **Order System**: Orders track `discount_amount`
- **Product Pricing**: Products have `regular_price` and `sale_price` fields

### ❌ **What's Missing**
1. **Product-level discount fields** (is_discounted, sale_price checkbox)
2. **Admin coupon management UI**
3. **Applied coupon storage in cart**
4. **Admin product discount management**
5. **Frontend coupon application UI**
6. **Discount application logic in checkout**
7. **Price display with sale prices**

---

## 🎯 Implementation Goals

### **Primary Objectives**
1. **Admin Coupon Management**
   - Create, edit, delete coupons
   - Set discount types (percentage, fixed, free shipping)
   - Configure validity periods
   - Track usage statistics

2. **Product-Level Discounts**
   - Mark products as discounted
   - Set discounted prices
   - Display sale prices on frontend
   - Show original vs. discounted price

3. **Cart Discount Application**
   - Apply coupons at cart level
   - Stack coupons with product discounts
   - Calculate total savings
   - Prevent coupon expiration during checkout

4. **Order Discount Tracking**
   - Record applied discounts in orders
   - Track coupon usage
   - Generate discount reports

---

## 🏗️ Database Schema Changes

### **1. Add Discount Fields to Products Table**

```sql
-- Migration: Add product discount fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_on_sale BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_start_date TIMESTAMP;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_end_date TIMESTAMP;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_label VARCHAR(100); -- e.g., "50% OFF"
```

### **2. Create Cart Coupons Join Table**

```sql
-- Migration: Create cart_coupons table
CREATE TABLE IF NOT EXISTS cart_coupons (
  id SERIAL PRIMARY KEY,
  cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  discount_amount DECIMAL(10,2) NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cart_id, coupon_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_coupons_cart_id ON cart_coupons(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_coupons_coupon_id ON cart_coupons(coupon_id);
```

### **3. Add Sale Label to Products**

```sql
-- Migration: Add sale label field
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_label VARCHAR(100);

-- Add index for products on sale
CREATE INDEX IF NOT EXISTS idx_products_on_sale ON products(is_on_sale, sale_start_date, sale_end_date) 
WHERE is_on_sale = true;
```

---

## 🎨 Frontend Implementation

### **1. Admin Dashboard - Coupon Management**

#### **A. Coupons List Page**
```
/admin/coupons
```
**Features:**
- Table view of all coupons
- Filters: Active/Inactive, Type, Date range
- Search by code
- Bulk actions: Activate, Deactivate, Delete
- Export coupon usage statistics

**Components:**
```typescript
// components/admin/CouponList.tsx
- CouponTable
- CouponFilters
- CreateCouponButton
- CouponStats
```

#### **B. Create/Edit Coupon Form**
```
/admin/coupons/new
/admin/coupons/:id/edit
```
**Fields:**
- Coupon Code (auto-uppercase)
- Description
- Discount Type (Percentage / Fixed Amount / Free Shipping)
- Discount Value
- Minimum Order Amount
- Maximum Discount Amount (for percentages)
- Usage Limits
  - Total usage limit
  - Per user limit
- Validity Period
  - Start Date
  - End Date
- Product/Category Restrictions
  - Applicable products (multi-select)
  - Excluded products (multi-select)
  - Applicable categories (multi-select)
- Active status

**Components:**
```typescript
// components/admin/CouponForm.tsx
- CouponCodeInput
- DiscountTypeSelector
- DiscountValueInput
- ValidityDatePicker
- ProductRestrictions
- UsageLimitsConfig
```

#### **C. Coupon Statistics Dashboard**
```
/admin/coupons/:id/stats
```
**Metrics:**
- Total usage count
- Total discount given
- Revenue impact
- Most used by users
- Usage over time (chart)
- Top products purchased with coupon

---

### **2. Admin Dashboard - Product Discount Management**

#### **A. Product Edit Form - Discount Section**
```typescript
// Add to components/admin/ProductForm.tsx

<div className="grid grid-cols-2 gap-4">
  {/* Regular Price */}
  <div>
    <Label>Regular Price ($)</Label>
    <Input 
      type="number" 
      step="0.01" 
      value={regularPrice}
      onChange={(e) => setRegularPrice(e.target.value)}
    />
  </div>

  {/* Discount Toggle */}
  <div className="flex items-center space-x-2">
    <Checkbox 
      checked={isOnSale}
      onCheckedChange={setIsOnSale}
    />
    <Label>Product is on sale</Label>
  </div>

  {/* Sale Price (only show if isOnSale = true) */}
  {isOnSale && (
    <div className="col-span-2">
      <Label>Sale Price ($)</Label>
      <Input 
        type="number" 
        step="0.01"
        value={salePrice}
        onChange={(e) => setSalePrice(e.target.value)}
      />
    </div>
  )}

  {/* Sale Period */}
  {isOnSale && (
    <>
      <div>
        <Label>Sale Start Date</Label>
        <Input type="datetime-local" value={saleStartDate} />
      </div>
      <div>
        <Label>Sale End Date</Label>
        <Input type="datetime-local" value={saleEndDate} />
      </div>
    </>
  )}

  {/* Sale Label */}
  {isOnSale && (
    <div className="col-span-2">
      <Label>Sale Badge Label (e.g., "50% OFF")</Label>
      <Input value={saleLabel} onChange={(e) => setSaleLabel(e.target.value)} />
    </div>
  )}
</div>

{/* Auto-calculate discount percentage */}
{isOnSale && regularPrice && salePrice && (
  <div className="text-sm text-muted-foreground">
    Discount: {Math.round(((regularPrice - salePrice) / regularPrice) * 100)}% OFF
  </div>
)}
```

---

### **3. Customer Facing - Product Display**

#### **A. Product Card Component Updates**
```typescript
// Update components/ProductCard.tsx

const ProductCard = ({ product }) => {
  const isOnSale = product.isOnSale && isSaleActive(product);
  const displayPrice = isOnSale ? product.sale_price : product.regular_price;
  const originalPrice = isOnSale ? product.regular_price : null;

  return (
    <Card>
      {/* Sale Badge */}
      {isOnSale && product.saleLabel && (
        <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-bold">
          {product.saleLabel}
        </div>
      )}
      
      <CardContent>
        {/* Price Display */}
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary">
            ${displayPrice}
          </span>
          {originalPrice && (
            <span className="text-sm line-through text-muted-foreground">
              ${originalPrice}
            </span>
          )}
        </div>
        
        {/* Savings Indicator */}
        {isOnSale && originalPrice && (
          <span className="text-xs text-green-600 font-medium">
            Save ${(originalPrice - displayPrice).toFixed(2)}
          </span>
        )}
      </CardContent>
    </Card>
  );
};
```

#### **B. Product Detail Page Updates**
```typescript
// Update pages/ProductDetail.tsx

// Add discount display in price section
{product.isOnSale && isSaleActive(product) && (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
        {product.saleLabel || `SAVE ${calculateDiscountPercent()}%`}
      </div>
      {product.saleStartDate && product.saleEndDate && (
        <span className="text-sm text-muted-foreground">
          Sale ends {formatDate(product.saleEndDate)}
        </span>
      )}
    </div>
    
    <div className="flex items-baseline gap-2">
      <span className="text-3xl font-bold text-primary">
        ${product.sale_price}
      </span>
      <span className="text-xl line-through text-muted-foreground">
        ${product.regular_price}
      </span>
    </div>
  </div>
)}
```

---

### **4. Customer Facing - Cart Coupon Application**

#### **A. Cart Page - Coupon Input**
```typescript
// Update pages/Cart.tsx

const [couponCode, setCouponCode] = useState('');
const [appliedCoupon, setAppliedCoupon] = useState(null);
const [applyingCoupon, setApplyingCoupon] = useState(false);

const handleApplyCoupon = async () => {
  try {
    setApplyingCoupon(true);
    const response = await fetch(`${API_URL}/api/cart/apply-coupon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ couponCode })
    });
    
    const data = await response.json();
    if (data.success) {
      setAppliedCoupon(data.data.coupon);
      setCouponCode('');
      // Refresh cart totals
      await refreshCart();
    }
  } catch (error) {
    toast.error(error.message);
  } finally {
    setApplyingCoupon(false);
  }
};

const handleRemoveCoupon = async () => {
  try {
    await fetch(`${API_URL}/api/cart/remove-coupon`, {
      method: 'POST',
      credentials: 'include'
    });
    setAppliedCoupon(null);
    await refreshCart();
  } catch (error) {
    toast.error(error.message);
  }
};

// In JSX
<div className="space-y-3 p-4 border rounded-lg">
  {appliedCoupon ? (
    <div className="flex items-center justify-between bg-green-50 p-3 rounded">
      <div>
        <p className="font-medium text-green-800">{appliedCoupon.code}</p>
        <p className="text-sm text-green-600">{appliedCoupon.description}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={handleRemoveCoupon}>
        Remove
      </Button>
    </div>
  ) : (
    <div className="flex gap-2">
      <Input
        placeholder="Enter coupon code"
        value={couponCode}
        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
        onKeyPress={(e) => e.key === 'Enter' && handleApplyCoupon()}
      />
      <Button 
        onClick={handleApplyCoupon}
        disabled={!couponCode || applyingCoupon}
      >
        Apply
      </Button>
    </div>
  )}
</div>
```

---

### **5. Customer Facing - Checkout Updates**

```typescript
// Update pages/Checkout.tsx

// Show applied coupon in order summary
{appliedCoupon && (
  <div className="flex items-center justify-between text-sm text-green-600">
    <span>Coupon: {appliedCoupon.code}</span>
    <span>-${appliedCoupon.discount.toFixed(2)}</span>
  </div>
)}

// Validate coupon hasn't expired before payment
useEffect(() => {
  const validateAppliedCoupon = async () => {
    if (appliedCoupon) {
      const response = await fetch(`${API_URL}/api/cart/validate-coupon`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        toast.error('Applied coupon is no longer valid');
        await handleRemoveCoupon();
      }
    }
  };
  
  validateAppliedCoupon();
}, [step]); // Re-validate on each step
```

---

## 🔧 Backend Implementation

### **1. Update Cart Service**

```typescript
// Update server/src/services/CartService.ts

export class CartService {
  // Apply coupon to cart
  async applyCoupon(cartId: number, couponCode: string): Promise<AppliedCoupon> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get cart and coupon
      const cart = await this.getCartById(cartId);
      const coupon = await this.couponService.getCouponByCode(couponCode);
      
      if (!coupon) {
        throw new ValidationError('Invalid coupon code');
      }
      
      // Validate coupon
      const validation = await this.couponService.validateCoupon(
        couponCode, 
        cart.totals.subtotal
      );
      
      if (!validation.valid) {
        throw new ValidationError(validation.errors[0]);
      }
      
      // Calculate discount
      const discount = this.couponService.calculateDiscount(
        coupon, 
        cart.totals.subtotal
      );
      
      // Store applied coupon
      await client.query(
        `INSERT INTO cart_coupons (cart_id, coupon_id, discount_amount)
         VALUES ($1, $2, $3)
         ON CONFLICT (cart_id, coupon_id) DO UPDATE
         SET discount_amount = $3`,
        [cartId, coupon.id, discount]
      );
      
      // Recalculate cart totals
      await this.recalculateCartTotals(cartId);
      
      await client.query('COMMIT');
      
      return {
        code: coupon.code,
        type: coupon.discount_type,
        value: coupon.discount_value,
        amount: discount,
        description: coupon.description
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Remove coupon from cart
  async removeCoupon(cartId: number): Promise<void> {
    await this.pool.query(
      'DELETE FROM cart_coupons WHERE cart_id = $1',
      [cartId]
    );
    
    await this.recalculateCartTotals(cartId);
  }
  
  // Recalculate cart totals (including discounts)
  private async recalculateCartTotals(cartId: number): Promise<void> {
    // Get cart items
    const items = await this.getCartItems(cartId);
    
    // Get applied coupons
    const coupons = await this.pool.query(
      `SELECT * FROM cart_coupons 
       WHERE cart_id = $1`,
      [cartId]
    );
    
    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => 
      sum + parseFloat(item.total_price.toString()), 0
    );
    
    // Calculate discount from coupons
    const couponDiscount = coupons.rows.reduce((sum, cc) => 
      sum + parseFloat(cc.discount_amount.toString()), 0
    );
    
    // Calculate product discounts
    const productDiscount = items.reduce((sum, item) => {
      const product = item.product;
      if (product.is_on_sale && isSaleActive(product)) {
        const discount = product.regular_price - product.sale_price;
        return sum + (discount * item.quantity);
      }
      return sum;
    }, 0);
    
    const totalDiscount = couponDiscount + productDiscount;
    const total = subtotal - totalDiscount;
    
    // Update cart totals
    await this.pool.query(
      `UPDATE carts 
       SET discount_amount = $1, 
           total = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [totalDiscount, total, cartId]
    );
  }
}

// Helper function to check if sale is active
function isSaleActive(product: Product): boolean {
  if (!product.is_on_sale) return false;
  
  const now = new Date();
  
  if (product.sale_start_date && new Date(product.sale_start_date) > now) {
    return false;
  }
  
  if (product.sale_end_date && new Date(product.sale_end_date) < now) {
    return false;
  }
  
  return true;
}
```

---

### **2. Update Price Calculator Service**

```typescript
// Update server/src/services/PriceCalculatorService.ts

async calculatePrice(
  productId: number,
  configuration: ProductConfiguration,
  quantity: number = 1
): Promise<PriceCalculation> {
  // Get product
  const product = await this.getProduct(productId);
  
  // Check if product is on sale
  const isOnSale = product.is_on_sale && this.isSaleActive(product);
  const basePrice = isOnSale ? product.sale_price : product.regular_price;
  
  // Calculate as before with basePrice instead of regular_price
  // ... rest of calculation logic
  
  return {
    basePrice,
    isOnSale,
    regularPrice: product.regular_price,
    salePrice: product.sale_price,
    // ... rest of breakdown
  };
}

private isSaleActive(product: Product): boolean {
  if (!product.is_on_sale) return false;
  
  const now = new Date();
  
  if (product.sale_start_date && new Date(product.sale_start_date) > now) {
    return false;
  }
  
  if (product.sale_end_date && new Date(product.sale_end_date) < now) {
    return false;
  }
  
  return true;
}
```

---

### **3. Create Admin Coupon Controller**

```typescript
// server/src/controllers/admin/couponController.ts

export class CouponController {
  private couponService: CouponService;
  
  constructor(pool: Pool) {
    this.couponService = new CouponService(pool);
  }
  
  // GET /api/admin/coupons
  listCoupons = async (req: Request, res: Response) => {
    const { page = 1, limit = 20, status, type } = req.query;
    
    const coupons = await this.couponService.listCoupons({
      page: Number(page),
      limit: Number(limit),
      status,
      type
    });
    
    res.json(successResponse({ coupons }));
  };
  
  // POST /api/admin/coupons
  createCoupon = async (req: Request, res: Response) => {
    const couponData = req.body;
    
    const coupon = await this.couponService.createCoupon(couponData);
    
    res.status(201).json(successResponse({ coupon }));
  };
  
  // PUT /api/admin/coupons/:id
  updateCoupon = async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const coupon = await this.couponService.updateCoupon(
      Number(id), 
      req.body
    );
    
    res.json(successResponse({ coupon }));
  };
  
  // DELETE /api/admin/coupons/:id
  deleteCoupon = async (req: Request, res: Response) => {
    const { id } = req.params;
    
    await this.couponService.deleteCoupon(Number(id));
    
    res.json(successResponse({ message: 'Coupon deleted' }));
  };
  
  // GET /api/admin/coupons/:id/stats
  getCouponStats = async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const stats = await this.couponService.getCouponStats(Number(id));
    
    res.json(successResponse({ stats }));
  };
}
```

---

### **4. Update Product Controller/Service**

```typescript
// Update server/src/services/ProductService.ts

async updateProduct(id: number, data: UpdateProductDto): Promise<Product> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;
  
  // Handle discount fields
  if ('is_on_sale' in data) {
    updates.push(`is_on_sale = $${paramCount++}`);
    values.push(data.is_on_sale);
  }
  
  if ('sale_price' in data) {
    updates.push(`sale_price = $${paramCount++}`);
    values.push(data.sale_price);
  }
  
  if ('sale_start_date' in data) {
    updates.push(`sale_start_date = $${paramCount++}`);
    values.push(data.sale_start_date);
  }
  
  if ('sale_end_date' in data) {
    updates.push(`sale_end_date = $${paramCount++}`);
    values.push(data.sale_end_date);
  }
  
  if ('sale_label' in data) {
    updates.push(`sale_label = $${paramCount++}`);
    values.push(data.sale_label);
  }
  
  // ... handle other fields
  
  if (updates.length === 0) {
    throw new ValidationError('No fields to update');
  }
  
  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);
  
  const sql = `
    UPDATE products 
    SET ${updates.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;
  
  const result = await this.pool.query(sql, values);
  
  return result.rows[0];
}
```

---

## 📋 Implementation Checklist

### **Phase 1: Database & Backend (Week 1)**
- [ ] Create database migration for product discount fields
- [ ] Create cart_coupons join table migration
- [ ] Update Product model/types to include discount fields
- [ ] Update CouponService with CRUD operations
- [ ] Update CartService to apply coupons and calculate discounts
- [ ] Update PriceCalculatorService to use sale prices
- [ ] Create Admin Coupon Controller
- [ ] Add coupon validation during checkout
- [ ] Create coupon usage tracking
- [ ] Add discount calculation to order creation
- [ ] Write unit tests for discount logic

### **Phase 2: Admin UI (Week 1-2)**
- [ ] Create Coupon List page component
- [ ] Create Coupon Form component (create/edit)
- [ ] Create Coupon Stats dashboard
- [ ] Add discount section to Product Form
- [ ] Add coupon filtering and search
- [ ] Create coupon usage analytics components
- [ ] Add bulk coupon actions
- [ ] Test admin coupon CRUD operations
- [ ] Add form validation for coupons

### **Phase 3: Customer Facing (Week 2)**
- [ ] Update ProductCard to show sale prices
- [ ] Update ProductDetail page to show discounts
- [ ] Update Cart page with coupon input
- [ ] Update Checkout to show applied coupons
- [ ] Add coupon validation on checkout
- [ ] Show savings indicators throughout
- [ ] Update order confirmation with discount details
- [ ] Test end-to-end coupon flow
- [ ] Test product discount display

### **Phase 4: Testing & Polish (Week 2)**
- [ ] Integration tests for discount system
- [ ] Test coupon expiration handling
- [ ] Test multiple coupon scenarios
- [ ] Test product sale period logic
- [ ] Performance testing with discounts
- [ ] Fix any discovered bugs
- [ ] Documentation updates
- [ ] User acceptance testing

---

## 🧪 Test Scenarios

### **Coupon Tests**
1. ✅ Create valid coupon
2. ✅ Apply valid coupon to cart
3. ✅ Reject expired coupon
4. ✅ Reject invalid coupon code
5. ✅ Limit coupon usage
6. ✅ Apply per-user limit
7. ✅ Minimum order amount validation
8. ✅ Maximum discount amount cap
9. ✅ Remove applied coupon
10. ✅ Multiple coupons stacking (if allowed)

### **Product Discount Tests**
1. ✅ Mark product as on sale
2. ✅ Set sale price
3. ✅ Sale period validation
4. ✅ Display sale badge
5. ✅ Calculate discount percentage
6. ✅ Show savings amount
7. ✅ Expired sale doesn't show
8. ✅ Future sale doesn't show yet
9. ✅ Combine product sale + coupon
10. ✅ Price updates on sale toggle

### **Integration Tests**
1. ✅ Cart totals with discounts
2. ✅ Order creation with discounts
3. ✅ Payment amount matches discounted total
4. ✅ Discount reflected in order history
5. ✅ Admin can view discount reports
6. ✅ Coupon usage tracking works
7. ✅ Email confirmation includes discounts

---

## 🔍 Edge Cases & Considerations

### **Discount Stacking**
- **Decision**: Do we allow coupons to stack with product discounts?
- **Recommendation**: Yes, but apply product discount first, then coupon
- **Example**: $100 product on 20% sale = $80, then 10% coupon = $72 total

### **Sale Period Logic**
- Sale is active if:
  1. `is_on_sale = true`
  2. Current date >= `sale_start_date` (if set)
  3. Current date <= `sale_end_date` (if set)

### **Coupon Expiration During Checkout**
- Validate coupon on each checkout step
- If coupon expires, notify user and remove it
- Recalculate totals without expired coupon
- Prevent payment if coupon expired

### **Multiple Products on Sale**
- Each product's sale price is calculated independently
- Cart shows total savings from all products
- Breakdown shows per-product discounts

### **Percentage vs Fixed Discounts**
- Percentages: Applied to subtotal before tax/shipping
- Fixed amounts: Deducted from subtotal
- Maximum discount caps for percentages
- Minimum order amounts can apply

---

## 📊 Analytics & Reporting

### **Admin Dashboard Metrics**
- Total discount given (all time)
- Active coupons count
- Expired coupons count
- Most used coupons
- Coupon redemption rate
- Average discount per order
- Products on sale count
- Total savings provided

### **Coupon Reports**
- Usage timeline
- Top coupons by usage
- Top coupons by revenue impact
- Geographic coupon usage
- Product associations
- User segments using coupons

---

## 🚀 Future Enhancements

### **Advanced Features**
1. **Automatic Coupons**: Auto-apply based on cart value
2. **First-time Buyer Coupons**: One-time use for new customers
3. **Birthday Coupons**: Auto-sent on user birthdays
4. **Abandoned Cart Coupons**: Encourage completion
5. **Dynamic Pricing**: AI-powered price optimization
6. **Bulk Discounts**: Quantity-based pricing
7. **Loyalty Points**: Convert to discounts
8. **Referral Discounts**: Friend referral program

### **Integration Ideas**
- Email marketing (abandoned cart codes)
- SMS notifications for flash sales
- Push notifications for exclusive coupons
- Social media promotional codes
- Influencer codes tracking

---

## 📝 Notes

- **Pricing Display**: Always show both regular and sale prices when discounted
- **Badge Design**: Use consistent sale badge styling across site
- **Promotion Blocks**: Create promotional banners for sales
- **Countdown Timers**: Show time remaining for sales (optional)
- **Flash Sales**: Support limited-time high-impact sales
- **Seasonal Sales**: Easy bulk activation of products for events

---

## ✅ Success Criteria

- [ ] Admin can create and manage coupons
- [ ] Admin can set product sale prices
- [ ] Products display sale prices correctly
- [ ] Customers can apply coupons to cart
- [ ] Discounts calculate accurately in checkout
- [ ] Orders record discount information
- [ ] Coupon usage is tracked
- [ ] Reports show discount analytics
- [ ] System handles expiration gracefully
- [ ] No bugs in discount calculations

---

## 👥 Team Assignments (Example)

- **Backend Developer**: Database migrations, services, controllers
- **Frontend Developer**: Admin UI, product displays, cart integration
- **QA Engineer**: Test scenarios, edge cases, integration testing
- **Product Manager**: Requirements review, user acceptance testing
- **Designer**: Sale badges, discount UI, admin dashboard layouts

---

**Document Version**: 1.0  
**Last Updated**: [Current Date]  
**Status**: Planning Phase  
**Next Steps**: Team review and approval
