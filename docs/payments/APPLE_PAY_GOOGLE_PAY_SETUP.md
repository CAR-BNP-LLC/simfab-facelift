# Apple Pay and Google Pay Setup Guide

This document outlines the steps required to enable Apple Pay and Google Pay through PayPal on your e-commerce website.

## Overview

Apple Pay and Google Pay are now integrated into the checkout flow through PayPal's JavaScript SDK. The wallet payment buttons will automatically appear when:
- **Apple Pay**: User is on Safari browser on macOS/iOS devices with Apple Pay configured
- **Google Pay**: User is on Chrome/Android devices with Google Pay configured

## Frontend Implementation

The frontend implementation is complete. Wallet payments are **disabled by default** until you enable them in your PayPal account and set the environment variable.

### Enabling Wallet Payments

1. **Complete PayPal Account Setup** (see steps below)
2. **Set Environment Variable**: Add to your `.env` file:
   ```env
   VITE_ENABLE_WALLET_PAYMENTS=true
   ```
3. **Restart your development server** or rebuild for production

The PayPal SDK automatically:
- **Detects supported devices and browsers** - No custom code needed!
  - Apple Pay button only appears on Safari (macOS/iOS) with Apple Pay configured
  - Google Pay button only appears on Chrome/Android with Google Pay configured
  - Buttons are hidden automatically on unsupported devices
- Shows appropriate wallet payment buttons (when enabled)
- Handles payment token generation
- Processes payments through the same PayPal Orders API

**Note**: If you try to enable wallet payments before completing PayPal account setup, the SDK will fail to load with a 400 error. Keep `VITE_ENABLE_WALLET_PAYMENTS=false` until setup is complete.

**Device Detection**: PayPal's SDK handles all device/browser detection automatically. You don't need to add any custom code to check for Apple Pay or Google Pay availability - the SDK only renders buttons when the device and browser support them.

### Files Modified

1. **`src/components/PayPalProvider.tsx`**
   - Added `applepay` and `googlepay` to the `components` option
   - Added `applepay,googlepay` to `enableFunding` option

2. **`src/components/checkout/PaymentStep.tsx`**
   - Updated messaging to mention Apple Pay and Google Pay
   - Enhanced security notice to include wallet payments

3. **`src/components/PayPalButton.tsx`**
   - Updated to handle optional `payerID` for wallet payments
   - Wallet payments work seamlessly with existing payment flow

## PayPal Business Account Configuration

### Step 1: Enable Apple Pay in PayPal Business Account

1. Log in to your [PayPal Business Account](https://www.paypal.com/businessprofile/mytools)
2. Navigate to **Account Settings** → **Website Preferences**
3. Find **Apple Pay** section
4. Click **Enable Apple Pay**
5. Follow the prompts to complete setup

### Step 2: Domain Verification for Apple Pay

Apple Pay requires domain verification through PayPal:

1. In PayPal Business Account, go to **Account Settings** → **Website Preferences** → **Apple Pay**
2. Click **Add Domain**
3. Enter your website domain (e.g., `simfab.com` or `eu.simfab.com`)
4. Download the domain verification file provided by PayPal
5. Upload the verification file to your website's root directory (e.g., `/.well-known/apple-developer-merchantid-domain-association`)
6. Ensure the file is accessible via HTTPS at: `https://yourdomain.com/.well-known/apple-developer-merchantid-domain-association`
7. Click **Verify Domain** in PayPal dashboard
8. Wait for verification (usually takes a few minutes)

**Note**: For multi-region setups (US/EU), you may need to verify each domain separately.

### Step 3: Enable Google Pay in PayPal Business Account

1. Log in to your PayPal Business Account
2. Navigate to **Account Settings** → **Website Preferences**
3. Find **Google Pay** section
4. Click **Enable Google Pay**
5. Google Pay typically doesn't require additional domain verification, but ensure your PayPal account is fully verified

### Step 4: Verify PayPal Client ID Configuration

Ensure your PayPal Client IDs are correctly configured:

1. **For US Region**:
   - Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
   - Select your US app/credentials
   - Verify Client ID is set in admin dashboard (`region_settings` table for `paypal_client_id` with region `us`)

2. **For EU Region**:
   - Select your EU app/credentials
   - Verify Client ID is set in admin dashboard (`region_settings` table for `paypal_client_id` with region `eu`)

### Step 5: Test in Sandbox Mode

Before going live:

1. Ensure you're using PayPal Sandbox credentials in development
2. Test Apple Pay on Safari (macOS/iOS) with a sandbox Apple Pay account
3. Test Google Pay on Chrome/Android with a sandbox Google Pay account
4. Verify payments complete successfully
5. Check that order status updates correctly in your system

## Production Deployment Checklist

Before enabling wallet payments in production:

- [ ] Apple Pay domain verification file uploaded and accessible via HTTPS
- [ ] Domain verified in PayPal Business Account
- [ ] Google Pay enabled in PayPal Business Account
- [ ] PayPal Client IDs configured for both US and EU regions (if applicable)
- [ ] Tested wallet payments in sandbox environment
- [ ] Verified payment flow works end-to-end
- [ ] Confirmed order completion emails are sent correctly
- [ ] Tested error handling for failed wallet payments

## Troubleshooting

### Apple Pay Button Not Showing

1. **Check Browser/Device**: Apple Pay only works on:
   - Safari on macOS (10.12.4+)
   - Safari on iOS (11.0+)
   - Users must have Apple Pay configured in their device settings

2. **Verify Domain**: Ensure domain verification file is accessible:
   ```bash
   curl https://yourdomain.com/.well-known/apple-developer-merchantid-domain-association
   ```

3. **Check PayPal Configuration**: Verify Apple Pay is enabled in PayPal Business Account

4. **Check Console**: Look for errors in browser console related to PayPal SDK

### Google Pay Button Not Showing

1. **Check Browser/Device**: Google Pay works on:
   - Chrome browser (desktop and mobile)
   - Android devices with Google Pay app
   - Users must have Google Pay configured

2. **Verify PayPal Configuration**: Ensure Google Pay is enabled in PayPal Business Account

3. **Check Console**: Look for errors in browser console related to PayPal SDK

### Payment Fails with Wallet Payment

1. **Check PayPal Logs**: Review PayPal transaction logs in Business Account
2. **Verify Amount**: Ensure payment amount matches order total exactly
3. **Check Currency**: Verify currency matches region (USD for US, EUR for EU)
4. **Review Backend Logs**: Check server logs for payment execution errors

## Technical Notes

- Wallet payments use the same PayPal Orders API as regular PayPal payments
- The `payerID` parameter is optional for wallet payments (handled automatically by PayPal)
- Payment tokens from wallet payments are processed identically to regular PayPal payments
- No backend code changes are required - wallet payments flow through existing endpoints

## Support Resources

- [PayPal Apple Pay Documentation](https://developer.paypal.com/docs/checkout/apm/apple-pay/)
- [PayPal Google Pay Documentation](https://developer.paypal.com/docs/checkout/apm/google-pay/)
- [PayPal Developer Support](https://developer.paypal.com/support/)

## Related Files

- `src/components/PayPalProvider.tsx` - PayPal SDK configuration
- `src/components/PayPalButton.tsx` - Payment button component
- `src/components/checkout/PaymentStep.tsx` - Checkout payment step
- `server/src/services/PaymentService.ts` - Backend payment processing
- `server/src/controllers/paymentController.ts` - Payment API endpoints

