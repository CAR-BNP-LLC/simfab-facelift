# Shipping Calculation and Payment Flow Review

## Issue Summary

**Problem**: 402 Payment Required error when creating PayPal payment
**Root Cause**: Payment amount mismatch between frontend calculation and database order total

## Current Shipping Calculation Flow

### 1. Shipping Rate Fetching (Step 3+)
- **Trigger**: When shipping address is complete (addressLine1, state, postalCode, country)
- **Location**: `Checkout.tsx` lines 218-303
- **Process**:
  1. Builds cartItems array from cart
  2. Calls `shippingAPI.calculateShipping()` with:
     - Shipping address
     - Order subtotal
     - Cart items (for package size determination)
  3. Receives shipping methods with costs
  4. Auto-selects first option if none selected

### 2. Shipping Cost Calculation
- **Location**: `Checkout.tsx` line 682-684
- **Formula**: `shippingOptions.find(opt => opt.id === selectedShipping)?.cost || 0`
- **Issue**: This is calculated from the selected shipping option, not from the order

### 3. Order Creation (Step 4)
- **Location**: `Checkout.tsx` lines 477-549
- **Process**:
  1. Gets selected shipping method: `selectedShippingMethod = shippingOptions.find(opt => opt.id === selectedShipping)`
  2. Calculates shipping: `shippingAmount = selectedShippingMethod?.cost || 0`
  3. Creates order with:
     - `shippingAmount`: From selected shipping method
     - `taxAmount`: Florida tax (6% if shipping to FL)
     - Order total calculated on backend: `subtotal - discount + shipping + tax`

### 4. Payment Creation (Step 5)
- **Location**: `Checkout.tsx` lines 700-730, `PaymentStep.tsx` line 122
- **Previous Issue**: 
  - `orderTotal` was recalculated from: `totals.subtotal - totals.discount + shippingCost + floridaTax`
  - This could differ from the order's `total_amount` in the database
  - PaymentService validates amount matches order total → throws 402 if mismatch

### 5. Payment Validation
- **Location**: `PaymentService.ts` lines 131-225
- **Process**:
  1. Gets order from database
  2. Compares payment amount with order total
  3. If difference > $0.01:
     - If payment > order total AND shipping was 0/wrong: Updates order
     - Otherwise: Throws PaymentError (402) with "AMOUNT_MISMATCH"

## Fixes Applied

### Fix 1: Use Order Total from Database
**File**: `src/pages/Checkout.tsx` lines 700-730
- **Change**: When `createdOrder` exists, use `createdOrder.total_amount` instead of recalculating
- **Benefit**: Ensures payment amount exactly matches database order total
- **Impact**: Prevents 402 Payment Required errors

### Fix 2: Cart Validation with Backorders
**File**: `server/src/services/CartService.ts` lines 1053-1093
- **Change**: Added backorder check in cart validation
- **Benefit**: Allows checkout when stock is 0 but backorders are allowed
- **Impact**: Prevents "Cart validation failed" errors for backorder products

## Shipping Selection Process

### Step 3: Shipping Method Selection
1. User enters shipping address
2. Shipping rates are fetched automatically
3. User selects a shipping method
4. `selectedShipping` state is updated
5. `shippingCost` is calculated from selected option

### Step 4: Order Review
1. Displays selected shipping method
2. Shows calculated totals (subtotal - discount + shipping + tax)
3. User clicks "Place Order"
4. Order is created with:
   - Selected shipping method ID
   - Shipping amount from selected method
   - Tax amount (if applicable)
   - Total amount (calculated on backend)

### Step 5: Payment
1. Uses order's `total_amount` from database (not recalculated)
2. Passes exact amount to PayPal
3. PaymentService validates amount matches order total
4. If match: Creates PayPal payment
5. If mismatch: Returns 402 error (now fixed)

## Potential Issues Identified

### 1. Shipping Cost Recalculation
- **Issue**: `shippingCost` is recalculated from `shippingOptions` which may change
- **Risk**: If shipping options are refetched and costs change, displayed cost may differ from order
- **Mitigation**: Once order is created, use order's shipping_amount from database

### 2. Shipping Options Refresh
- **Issue**: Shipping options are refetched when address changes
- **Risk**: Selected shipping method may no longer exist in new options
- **Current Behavior**: Auto-selects first option if selected option is missing

### 3. Tax Calculation Timing
- **Issue**: Tax is calculated on frontend, but also calculated on backend
- **Risk**: Minor rounding differences could cause mismatches
- **Current Behavior**: Backend tax calculation is authoritative

## Recommendations

1. ✅ **FIXED**: Use order's total_amount for payment (prevents 402 errors)
2. ✅ **FIXED**: Cart validation respects backorders
3. **Consider**: Lock shipping selection once order is created
4. **Consider**: Store shipping method details in order for reference
5. **Consider**: Add validation to ensure selected shipping method still exists before order creation

## Testing Checklist

- [ ] Create order with backorder product → Should succeed
- [ ] Create order with shipping → Payment should use order total
- [ ] Change shipping address after selecting method → Should refetch rates
- [ ] Create payment with exact order total → Should succeed
- [ ] Create payment with mismatched amount → Should update order or fail gracefully

