/**
 * Checkout Page
 * Multi-step checkout flow: Cart Review → Address → Shipping → Review → Order
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ShoppingCart, 
  MapPin, 
  Truck, 
  CheckCircle, 
  ChevronRight, 
  Loader2,
  Package,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckout } from '@/contexts/CheckoutContext';
import { useRegion } from '@/contexts/RegionContext';
import { orderAPI, shippingAPI, ShippingMethod } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import PayPalProvider from '@/components/PayPalProvider';
import { AddressForm } from '@/components/checkout/AddressForm';
import PaymentStep from '@/components/checkout/PaymentStep';
import { isEuropeanCountry } from '@/utils/europeanCountries';

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { cart, loading: cartLoading, applyCoupon, refreshCart, clearCart } = useCart();
  const { user } = useAuth();
  const { checkoutState, updateCheckoutState, clearStorage } = useCheckout();
  const { region } = useRegion();
  const { toast } = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<ShippingMethod[]>([]);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [quoteRequested, setQuoteRequested] = useState(false);
  const [requestingQuote, setRequestingQuote] = useState(false);

  // Destructure state from context
  const {
    step: contextStep,
    shippingAddress,
    billingAddress,
    selectedShipping,
    orderNotes = '',
    createdOrder,
    isBillingSameAsShipping
  } = checkoutState;

  // Sync step with URL query parameter for browser navigation
  const urlStep = searchParams.get('step') ? parseInt(searchParams.get('step')!, 10) : null;
  const step = urlStep && urlStep >= 1 && urlStep <= 5 ? urlStep : contextStep;

  // Sync step from URL when browser back/forward is used
  useEffect(() => {
    const currentUrlStep = searchParams.get('step') ? parseInt(searchParams.get('step')!, 10) : null;
    // Only sync if URL step is different from context step (browser navigation)
    if (currentUrlStep !== null && currentUrlStep !== contextStep && currentUrlStep >= 1 && currentUrlStep <= 5) {
      updateCheckoutState({ step: currentUrlStep });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Only depend on searchParams to detect URL changes (contextStep and updateCheckoutState intentionally excluded)

  // Update URL when step changes from context (for cases where step changes programmatically)
  // This won't run when URL already matches, avoiding loops
  useEffect(() => {
    const currentUrlStep = searchParams.get('step') ? parseInt(searchParams.get('step')!, 10) : null;
    // Only update URL if context step differs from URL step and it's not already being handled by handleNext/handleBack
    if (contextStep !== currentUrlStep) {
      const newParams = new URLSearchParams(searchParams);
      if (contextStep === 1) {
        newParams.delete('step'); // Remove step param for step 1 to keep URL clean
      } else if (contextStep >= 2 && contextStep <= 5) {
        newParams.set('step', contextStep.toString());
      }
      // Use replace for automatic sync to avoid cluttering history
      setSearchParams(newParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextStep]); // Only depend on contextStep (searchParams and setSearchParams intentionally excluded to avoid loops)

  // Get cart data early so it's available for useEffects
  const items = cart?.items || [];
  const totals = cart?.totals || { subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0, currency: 'USD', itemCount: 0 };
  
  // Get currency symbol from cart totals
  const currency = totals.currency === 'EUR' ? '€' : '$';

  // Auto-fill from user data when available (only if fields are empty, never overwrite user input)
  const [hasAutoFilled, setHasAutoFilled] = useState(false);
  
  useEffect(() => {
    // Only auto-fill once when user data becomes available and we haven't auto-filled yet
    if (user && !hasAutoFilled) {
      // Only set fields that are actually empty - never overwrite existing values
      const updates: Partial<typeof shippingAddress> = {};
      
      if (!shippingAddress.firstName && user.firstName) {
        updates.firstName = user.firstName;
      }
      if (!shippingAddress.lastName && user.lastName) {
        updates.lastName = user.lastName;
      }
      // Only auto-fill email if it's completely empty - never overwrite if user typed something
      if (!shippingAddress.email && user.email) {
        updates.email = user.email;
      }
      
      if (Object.keys(updates).length > 0) {
        updateCheckoutState({
          shippingAddress: {
            ...shippingAddress,
            ...updates
          }
        });
      }
      // Mark as auto-filled to prevent re-running even if no updates were made
      setHasAutoFilled(true);
    }
    // Also mark as auto-filled if user is null (guest checkout)
    if (!user && !hasAutoFilled) {
      setHasAutoFilled(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, hasAutoFilled]);

  // Create a signature of cart items to detect any changes (including quantity changes)
  const cartItemsSignature = React.useMemo(() => {
    return JSON.stringify(
      items.map(item => ({
        productId: item.product_id,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unit_price.toString())
      })).sort((a, b) => a.productId - b.productId)
    );
  }, [items]);

  // Fetch shipping rates when address is complete
  useEffect(() => {
    const fetchShippingRates = async () => {
      // Only fetch if we have a complete shipping address
      // City is optional for countries without city lists (like UK)
      const hasCompleteAddress = 
        shippingAddress.addressLine1 &&
        shippingAddress.state &&
        shippingAddress.postalCode &&
        shippingAddress.country;

      // Fetch shipping rates on step 3+ (shipping, review, payment steps)
      // Also fetch if we're on review/payment step and don't have shipping options loaded yet (page reload scenario)
      const needsShippingOptions = step >= 4 && selectedShipping && 
        !shippingOptions.find(opt => opt.id === selectedShipping);
      const shouldFetch = hasCompleteAddress && (
        step === 3 || 
        needsShippingOptions
      );

      if (!shouldFetch) {
        return;
      }

      // Don't fetch shipping rates for non-European addresses on EU site
      if (region === 'eu' && shippingAddress.country && !isEuropeanCountry(shippingAddress.country)) {
        return;
      }

      setLoadingShipping(true);
      try {
        // Build cartItems array from cart items
        const cartItems = items.map(item => ({
          productId: item.product_id,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unit_price.toString())
        }));

        const response = await shippingAPI.calculateShipping({
          shippingAddress: {
            addressLine1: shippingAddress.addressLine1,
            addressLine2: shippingAddress.addressLine2 || undefined,
            city: shippingAddress.city,
            state: shippingAddress.state,
            postalCode: shippingAddress.postalCode,
            country: shippingAddress.country
          },
          orderTotal: totals.subtotal,
          cartItems: cartItems.length > 0 ? cartItems : undefined
        });

        if (response.success && response.data.shippingMethods) {
          setShippingOptions(response.data.shippingMethods);
          // Auto-select first option if none selected or if shipping was cleared
          if (!selectedShipping && response.data.shippingMethods.length > 0) {
            updateCheckoutState({ 
              selectedShipping: response.data.shippingMethods[0].id 
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch shipping rates:', error);
        toast({
          title: 'Shipping calculation failed',
          description: 'Please try again or contact support',
          variant: 'destructive'
        });
      } finally {
        setLoadingShipping(false);
      }
    };

    fetchShippingRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    shippingAddress.addressLine1,
    shippingAddress.city,
    shippingAddress.state,
    shippingAddress.postalCode,
    shippingAddress.country,
    step,
    selectedShipping, // Re-fetch if selectedShipping is restored but shippingOptions are missing (page reload)
    region, // Recalculate when region changes
    cartItemsSignature, // Recalculate when cart items change (including quantities)
    totals.subtotal // Recalculate when cart total changes
  ]);

  // Redirect if cart is empty
  useEffect(() => {
    if (!cartLoading && (!cart || !cart.items || cart.items.length === 0)) {
      toast({
        title: 'Cart is empty',
        description: 'Add some products before checking out',
        variant: 'destructive'
      });
      navigate('/shop');
    }
  }, [cart, cartLoading, navigate, toast]);

  // Validate createdOrder exists if we're on payment step
  useEffect(() => {
    if (step === 5 && createdOrder) {
      // If we're on payment step but order doesn't exist, reset to review step
      // This handles stale localStorage state
      if (!createdOrder.id) {
        console.warn('Invalid createdOrder in state, resetting to review step');
        updateCheckoutState({ 
          step: 4,
          createdOrder: null 
        });
      }
    }
  }, [step, createdOrder, updateCheckoutState]);

  const handleAddressChange = (field: keyof typeof shippingAddress, value: string) => {
    updateCheckoutState({
      shippingAddress: { ...shippingAddress, [field]: value }
    });
  };

  const handleAddressBatchChange = (updates: Partial<typeof shippingAddress>) => {
    updateCheckoutState({
      shippingAddress: { ...shippingAddress, ...updates }
    });
  };

  const handleBillingAddressChange = (field: keyof typeof billingAddress, value: string) => {
    updateCheckoutState({
      billingAddress: { ...billingAddress, [field]: value }
    });
  };

  const handleShippingChange = (value: string) => {
    updateCheckoutState({ selectedShipping: value });
  };

  const handleOrderNotesChange = (value: string) => {
    updateCheckoutState({ orderNotes: value });
  };

  const handleBillingSameAsShippingChange = (checked: boolean) => {
    updateCheckoutState({
      isBillingSameAsShipping: checked,
      billingAddress: checked ? shippingAddress : billingAddress
    });
  };

  const validateAddress = (): boolean => {
    const required: (keyof typeof shippingAddress)[] = ['firstName', 'lastName', 'addressLine1', 'country', 'state', 'postalCode', 'phone', 'email'];

    for (const field of required) {
      const value = shippingAddress[field];

      if (!value || value.trim() === '') {
        toast({
          title: 'Missing information',
          description: `Please fill in ${String(field).replace(/([A-Z])/g, ' $1').toLowerCase()}`,
          variant: 'destructive'
        });
        return false;
      }
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingAddress.email)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (step === 2 && !validateAddress()) {
      return;
    }
    // Check if EU site and non-European address
    if (step === 2 && region === 'eu' && shippingAddress.country && !isEuropeanCountry(shippingAddress.country)) {
      toast({
        title: 'Shipping not available',
        description: 'We can only ship to addresses in Europe. Please visit our US site to place an order for addresses outside of Europe.',
        variant: 'destructive'
      });
      return;
    }
    // Validate shipping method selection before moving to review
    if (step === 3 && !selectedShipping) {
      toast({
        title: 'Shipping method required',
        description: 'Please select a shipping method to continue',
        variant: 'destructive'
      });
      return;
    }
    // Clear selectedShipping when entering shipping step to ensure proper initialization
    const nextStep = step + 1;
    
    const updates: any = { step: nextStep };
    if (step === 2) { // Moving from address to shipping step
      updates.selectedShipping = '';
    }
    
    // Update URL with new step FIRST (push to create history entry for back button)
    const newParams = new URLSearchParams(searchParams);
    newParams.set('step', nextStep.toString());
    setSearchParams(newParams, { replace: false }); // Use push for forward navigation
    
    // Then update state (the useEffect will see URL already matches, so it won't update again)
    updateCheckoutState(updates);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    const prevStep = step - 1;
    
    // Update URL with previous step FIRST (push to create history entry)
    const newParams = new URLSearchParams(searchParams);
    if (prevStep === 1) {
      newParams.delete('step');
    } else {
      newParams.set('step', prevStep.toString());
    }
    setSearchParams(newParams, { replace: false }); // Use push so browser back works
    
    // Then update state (the useEffect will see URL already matches, so it won't update again)
    updateCheckoutState({ step: prevStep });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    try {
      setApplyingCoupon(true);
      await applyCoupon(couponCode);
      setCouponCode('');
    } catch (error) {
      console.error('Failed to apply coupon:', error);
    } finally {
      setApplyingCoupon(false);
    }
  };

  // Helper function to clean up empty strings in address
  const cleanAddress = (address: any) => {
    const cleaned = { ...address };
    // Convert empty strings to null for optional fields
    if (cleaned.company === '') cleaned.company = null;
    if (cleaned.addressLine2 === '') cleaned.addressLine2 = null;
    if (cleaned.phone === '') cleaned.phone = null;
    return cleaned;
  };

  const handleSubmitOrder = async () => {
    try {
      setSubmitting(true);

      // Get selected shipping method data (for FedEx rate info)
      const selectedShippingMethod = shippingOptions.find(opt => opt.id === selectedShipping);
      
      // Calculate shipping cost
      const shippingAmount = selectedShippingMethod?.cost || 0;
      
      const orderData = {
        shippingAddress: cleanAddress(shippingAddress),
        billingAddress: cleanAddress(isBillingSameAsShipping ? shippingAddress : billingAddress),
        shippingMethodId: selectedShipping,
        paymentMethodId: 'pending',
        orderNotes: orderNotes || '',
        shippingAmount: shippingAmount,
        taxAmount: floridaTax,
        shippingMethodData: selectedShippingMethod ? {
          fedexRateData: selectedShippingMethod.fedexRateData
        } : undefined
      };

      // Validate state fields before sending
      if (!orderData.shippingAddress.state || orderData.shippingAddress.state.length < 2) {
        toast({
          title: 'Invalid shipping state',
          description: 'Please enter a valid state (at least 2 characters)',
          variant: 'destructive'
        });
        return;
      }

      if (!orderData.billingAddress.state || orderData.billingAddress.state.length < 2) {
        toast({
          title: 'Invalid billing state',
          description: 'Please enter a valid state (at least 2 characters)',
          variant: 'destructive'
        });
        return;
      }

      const response = await orderAPI.createOrder(orderData);

      if (response.success && response.data.order) {
        const createdOrderData = response.data.order;

        // Parse amounts (PostgreSQL returns numeric as strings)
        const subtotal = typeof createdOrderData.subtotal === 'string' ? parseFloat(createdOrderData.subtotal) : Number(createdOrderData.subtotal) || 0;
        const discount = typeof createdOrderData.discount_amount === 'string' ? parseFloat(createdOrderData.discount_amount) : Number(createdOrderData.discount_amount) || 0;
        const shipping = typeof createdOrderData.shipping_amount === 'string' ? parseFloat(createdOrderData.shipping_amount) : Number(createdOrderData.shipping_amount) || 0;
        const tax = typeof createdOrderData.tax_amount === 'string' ? parseFloat(createdOrderData.tax_amount) : Number(createdOrderData.tax_amount) || 0;
        const total = typeof createdOrderData.total_amount === 'string' ? parseFloat(createdOrderData.total_amount) : Number(createdOrderData.total_amount) || 0;
        const expectedTotal = subtotal - discount + shipping + tax;
        updateCheckoutState({ 
          createdOrder: createdOrderData,
          step: 5 // Move to payment step
        });
      } else {
        console.error('Order creation failed:', response);
        throw new Error('Failed to create order');
      }
    } catch (error) {
      console.error('Order creation failed:', error);
      toast({
        title: 'Order failed',
        description: error instanceof Error ? error.message : 'Failed to create order',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    toast({
      title: 'Payment successful!',
      description: 'Your order has been placed successfully.',
    });
    
    // Capture order number before resetting state
    const orderNumber = createdOrder?.order_number;
    
    // Refresh cart to clear it from the UI
    await refreshCart();
    
    // Reset checkout state after successful payment
    updateCheckoutState({
      step: 1,
      shippingAddress: {
        firstName: '',
        lastName: '',
        company: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
        phone: '',
        email: ''
      },
      billingAddress: {
        firstName: '',
        lastName: '',
        company: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
        phone: '',
        email: ''
      },
      selectedShipping: '',
      orderNotes: '',
      createdOrder: null,
      isBillingSameAsShipping: true
    });
    
    if (orderNumber) {
      navigate(`/order-confirmation/${orderNumber}`);
    } else {
      console.error('No order number available for confirmation');
      navigate('/');
    }
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment failed:', error);
    toast({
      title: 'Payment failed',
      description: 'Failed to process payment. Please try again.',
      variant: 'destructive'
    });
  };

  // Check if quote is required
  const isQuoteRequired = selectedShipping === 'international_quote' || 
    shippingOptions.find(opt => opt.id === selectedShipping)?.requiresManualQuote === true;

  // Handler for quote request
  const handleRequestQuote = async () => {
    try {
      setRequestingQuote(true);

      // Prepare cart items
      const cartItems = items.map((item: any) => ({
        productId: item.product_id,
        productName: item.product_name,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unit_price),
        productImage: item.product_image
      }));

      // Request quote
      const response = await shippingAPI.requestQuote({
        shippingAddress: {
          firstName: shippingAddress.firstName,
          lastName: shippingAddress.lastName,
          email: shippingAddress.email,
          addressLine1: shippingAddress.addressLine1,
          addressLine2: shippingAddress.addressLine2,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country,
          phone: shippingAddress.phone
        },
        cartItems
      });

      if (response.success) {
        // Clear cart
        try {
          await clearCart();
          await refreshCart(); // Refresh to update state
        } catch (clearError) {
          console.error('Error clearing cart:', clearError);
          // Don't fail the request if cart clearing fails
        }

        // Show success
        setQuoteRequested(true);
        toast({
          title: 'Quote Request Submitted',
          description: 'We have received your shipping quote request. You will receive an email confirmation shortly.',
        });
      } else {
        throw new Error(response.error?.message || 'Failed to submit quote request');
      }
    } catch (error) {
      console.error('Quote request failed:', error);
      toast({
        title: 'Quote Request Failed',
        description: error instanceof Error ? error.message : 'Failed to submit quote request. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setRequestingQuote(false);
    }
  };

  // Calculate shipping (only on step 3+)
  const shippingCost = step >= 3 
    ? (shippingOptions.find(opt => opt.id === selectedShipping)?.cost || 0)
    : 0;
  
  // Calculate Florida tax (6%) - only for US orders shipping to Florida
  // Tax is calculated on the final price: subtotal - discount + shipping
  // Only calculate if we have a complete shipping address AND we're on step 3+
  const hasCompleteAddress = shippingAddress.country && shippingAddress.state;
  // Handle both "Florida" (full name) and "FL" (abbreviation)
  const isFloridaState = shippingAddress.state === 'FL' || shippingAddress.state === 'Florida';
  const isFloridaOrder = hasCompleteAddress && shippingAddress.country === 'US' && isFloridaState;
  const priceBeforeTax = totals.subtotal - totals.discount + shippingCost;
  // Only calculate tax on step 3+ (shipping step and beyond)
  const floridaTax = (step >= 3 && isFloridaOrder) 
    ? Math.round(priceBeforeTax * 0.06 * 100) / 100 
    : 0;
  
  // Calculate order total
  // On step 2 (address step): subtotal - discount only (no shipping, no tax)
  // On step 3+: subtotal - discount + shipping + tax
  let orderTotal = step >= 3
    ? Number((totals.subtotal - totals.discount + shippingCost + floridaTax) || 0)
    : Number((totals.subtotal - totals.discount) || 0);
  
  // Ensure we have a valid number
  if (isNaN(orderTotal) || orderTotal < 0) {
    console.error('Invalid orderTotal calculated:', orderTotal);
    // Fallback: use createdOrder total if available, but try to add current shipping
    if (createdOrder?.total_amount) {
      const fallbackTotal = typeof createdOrder.total_amount === 'string' 
        ? parseFloat(createdOrder.total_amount) 
        : Number(createdOrder.total_amount);
      
      // If order has shipping but current shipping is different, adjust
      const orderShipping = createdOrder?.shipping_amount 
        ? (typeof createdOrder.shipping_amount === 'string' ? parseFloat(createdOrder.shipping_amount) : Number(createdOrder.shipping_amount))
        : 0;
      
      // Replace old shipping with new shipping
      orderTotal = fallbackTotal - orderShipping + shippingCost;
      console.error('Using adjusted fallback total:', orderTotal, '(was', fallbackTotal, 'with shipping', orderShipping, 'now using shipping', shippingCost, ')');
    } else {
      orderTotal = 0;
    }
  }
  
  // CRITICAL: Round to 2 decimal places to avoid floating-point precision issues
  // This ensures we send exactly what's in the database (which is stored with 2 decimals)
  orderTotal = Math.round(orderTotal * 100) / 100;
  
  // Get image
  const getImageUrl = (item: any) => {
    // product_image is already a single URL string from the API
    if (item.product_image && typeof item.product_image === 'string') {
      return item.product_image;
    }
    
    // Fallback: try to get from product_images array if available
    if (item.product_images && Array.isArray(item.product_images) && item.product_images.length > 0) {
      return item.product_images[0].image_url || item.product_images[0].url || '/placeholder.svg';
    }
    
    return '/placeholder.svg';
  };

  if (cartLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Checkout</h1>
            <p className="text-muted-foreground">Complete your purchase</p>
          </div>


          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center max-w-3xl mx-auto">
              {[
                { num: 1, label: 'Cart' },
                { num: 2, label: 'Shipping' },
                { num: 3, label: 'Delivery' },
                { num: 4, label: 'Review' },
                { num: 5, label: 'Payment' }
              ].map((stepInfo, idx) => (
                <div key={stepInfo.num} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${step >= stepInfo.num ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {step > stepInfo.num ? <CheckCircle className="w-6 h-6" /> : stepInfo.num}
                    </div>
                    <span className="text-xs mt-2 hidden sm:block">{stepInfo.label}</span>
                  </div>
                  {/* Add invisible spacer for last item to maintain alignment */}
                  {idx < 4 ? (
                    <div className={`h-1 flex-1 ${step > stepInfo.num ? 'bg-primary' : 'bg-muted'}`} />
                  ) : (
                    <div className="h-1 flex-1 opacity-0 pointer-events-none" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Step 1: Cart Review */}
              {step === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Review Your Cart ({items.length} items)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {items.map((item: any) => (
                        <div key={item.id} className="flex gap-4 border-b border-border pb-4 last:border-0">
                          <img
                            src={getImageUrl(item)}
                            alt={item.product_name}
                            className="w-20 h-20 object-cover rounded bg-muted"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold">{item.product_name}</h3>
                            <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                            <p className="font-semibold mt-2">{currency}{parseFloat(item.total_price).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 flex justify-between items-center">
                      <Button variant="outline" onClick={() => navigate('/cart')}>
                        ← Edit Cart
                      </Button>
                      <Button onClick={handleNext}>
                        Continue to Shipping
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Shipping Address */}
              {step === 2 && (
                <div className="space-y-6">
                  <AddressForm
                    title="Shipping Address"
                    address={shippingAddress as any}
                    onAddressChange={handleAddressChange}
                    onAddressBatchChange={handleAddressBatchChange}
                    required={true}
                  />
                  
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={handleBack}>
                      ← Back to Cart
                    </Button>
                    <Button onClick={handleNext}>
                      Continue to Shipping
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Quote Requested Success Screen */}
              {quoteRequested && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Quote Request Received!</h2>
                    <p className="text-muted-foreground mb-6">
                      We have received your shipping quote request. You will receive a confirmation email shortly, and our team will contact you with a shipping quote as soon as possible.
                    </p>
                    <Button onClick={() => navigate('/')}>
                      Return to Shop
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Shipping Method or Quote Request */}
              {step === 3 && !quoteRequested && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {isQuoteRequired ? (
                        <>
                          <Package className="h-5 w-5" />
                          Contact for Shipping Quote
                        </>
                      ) : (
                        <>
                          <Truck className="h-5 w-5" />
                          Shipping Method
                        </>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>

                    {/* Check if EU site and non-European address */}
                    {region === 'eu' && shippingAddress.country && !isEuropeanCountry(shippingAddress.country) ? (
                      <div className="space-y-6">
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-2">
                              <p className="font-semibold">We can only ship to addresses in Europe</p>
                              <p>
                                The address you entered is outside of Europe. Please visit our US site to place an order for addresses outside of Europe.
                              </p>
                            </div>
                          </AlertDescription>
                        </Alert>
                        <div className="flex justify-between">
                          <Button variant="outline" onClick={handleBack}>
                            ← Back to Address
                          </Button>
                        </div>
                      </div>
                    ) : loadingShipping ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                        <span className="text-muted-foreground">Calculating shipping rates...</span>
                      </div>
                    ) : shippingOptions.length === 0 ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Please complete your shipping address to see shipping options.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <RadioGroup value={selectedShipping} onValueChange={handleShippingChange}>
                        <div className="space-y-3">
                          {shippingOptions.map((option) => (
                            <div
                              key={option.id}
                              className="flex items-center space-x-3 border border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50"
                              onClick={() => handleShippingChange(option.id)}
                            >
                              <RadioGroupItem value={option.id} id={option.id} />
                              <div className="flex-1">
                                <label htmlFor={option.id} className="flex items-center justify-between cursor-pointer">
                                  <div>
                                    <p className="font-semibold">{option.name}</p>
                                    <p className="text-sm text-muted-foreground">{option.description}</p>
                                    <p className="text-xs text-muted-foreground mt-1">via {option.carrier}</p>
                                    {option.fedexRateData && (
                                      <div className="mt-1 space-y-1">
                                        {option.fedexRateData.hasNegotiatedRate ? (
                                          <span className="text-xs text-green-600">Special rate available</span>
                                        ) : option.fedexRateData.discountPercent ? (
                                          <div className="text-xs">
                                            <div className="text-green-600 font-medium">
                                              SimFab team saves you {option.fedexRateData.discountPercent}% on delivery!
                                            </div>
                                            <div className="text-muted-foreground">
                                              <span className="line-through">{currency}{option.fedexRateData.listRate.toFixed(2)}</span>
                                              {' '}→{' '}
                                              <span className="font-semibold text-foreground">{currency}{option.cost.toFixed(2)}</span>
                                            </div>
                                          </div>
                                        ) : null}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold">
                                      {option.requiresManualQuote || option.id === 'international_quote'
                                        ? '' // Don't show price for quote required
                                        : option.cost === 0
                                        ? 'FREE'
                                        : `${currency}${option.cost.toFixed(2)}`}
                                    </p>
                                  </div>
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    )}

                    {!loadingShipping && shippingOptions.length > 0 && !isQuoteRequired && (
                      <Alert className="mt-6">
                        <Package className="h-4 w-4" />
                        <AlertDescription>
                          {shippingAddress.country === 'US' && 
                           shippingAddress.state && 
                           !['AK', 'HI'].includes(shippingAddress.state) 
                            ? `Free shipping on orders over ${currency}50`
                            : 'Shipping rates are calculated based on package size and destination'}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Show quote request form if quote is required */}
                    {!loadingShipping && isQuoteRequired && selectedShipping && (
                      <div className="mt-6 space-y-6">
                        <Alert>
                          <Package className="h-4 w-4" />
                          <AlertDescription>
                            Shipping to {shippingAddress.country} requires a custom quote. Please submit your request below and we'll calculate the exact shipping cost for you.
                          </AlertDescription>
                        </Alert>

                        {/* Order Summary */}
                        <div className="border rounded-lg p-4 space-y-3">
                          <h3 className="font-semibold mb-3">Order Summary</h3>
                          {items.map((item: any) => (
                            <div key={item.id} className="flex gap-3">
                              <img
                                src={getImageUrl(item)}
                                alt={item.product_name}
                                className="w-16 h-16 object-cover rounded"
                                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                              />
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{item.product_name}</h4>
                                <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">{currency}{parseFloat(item.total_price).toFixed(2)}</p>
                              </div>
                            </div>
                          ))}
                          <div className="pt-3 border-t">
                            <div className="flex justify-between text-sm">
                              <span>Subtotal:</span>
                              <span className="font-semibold">{currency}{totals.subtotal.toFixed(2)}</span>
                            </div>
                            {totals.discount > 0 && (
                              <div className="flex justify-between text-sm text-green-600">
                                <span>Discount:</span>
                                <span className="font-semibold">-{currency}{totals.discount.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-lg font-bold mt-2">
                              <span>Total:</span>
                              <span>{currency}{(totals.subtotal - totals.discount).toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Shipping cost will be calculated separately</p>
                          </div>
                        </div>

                        <Button 
                          onClick={handleRequestQuote}
                          disabled={requestingQuote}
                          className="w-full"
                          size="lg"
                        >
                          {requestingQuote ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Submitting Quote Request...
                            </>
                          ) : (
                            <>
                              Contact Us for Shipping Quote
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Regular shipping buttons - only show if not quote required */}
                    {!isQuoteRequired && (
                      <div className="mt-6 flex justify-between">
                        <Button variant="outline" onClick={handleBack}>
                          ← Back to Address
                        </Button>
                        <Button onClick={handleNext}>
                          Review Order
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Step 4: Review & Submit - Skip if quote required */}
              {step === 4 && !isQuoteRequired && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <MapPin className="h-5 w-5" />
                          Shipping Address
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => updateCheckoutState({ step: 2 })}>
                          Edit
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm space-y-1">
                        <p className="font-semibold">{shippingAddress.firstName} {shippingAddress.lastName}</p>
                        {shippingAddress.company && <p>{shippingAddress.company}</p>}
                        <p>{shippingAddress.addressLine1}</p>
                        {shippingAddress.addressLine2 && <p>{shippingAddress.addressLine2}</p>}
                        <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}</p>
                        <p>{shippingAddress.country}</p>
                        <p className="mt-2">{shippingAddress.phone}</p>
                        <p>{shippingAddress.email}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Truck className="h-5 w-5" />
                          Shipping Method
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => updateCheckoutState({ step: 3 })}>
                          Edit
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm">
                        <p className="font-semibold">
                          {shippingOptions.find(opt => opt.id === selectedShipping)?.name || 'Shipping'}
                        </p>
                        <p className="text-muted-foreground">
                          {shippingOptions.find(opt => opt.id === selectedShipping)?.description || 'Calculating...'}
                        </p>
                        <p className="font-semibold mt-2">
                          {isQuoteRequired || shippingOptions.find(opt => opt.id === selectedShipping)?.requiresManualQuote
                            ? 'Quote Required - No payment needed' 
                            : shippingCost === 0 
                            ? 'FREE' 
                            : `${currency}${shippingCost.toFixed(2)}`}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <ShoppingCart className="h-5 w-5" />
                          Order Items ({items.length})
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => updateCheckoutState({ step: 1 })}>
                          Edit
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {items.map((item: any) => (
                          <div key={item.id} className="flex gap-3">
                            <img
                              src={getImageUrl(item)}
                              alt={item.product_name}
                              className="w-16 h-16 object-cover rounded"
                              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                            />
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{item.product_name}</h4>
                              <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{currency}{parseFloat(item.total_price).toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Order Notes (Optional)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <textarea
                        className="w-full min-h-[100px] p-3 border border-border rounded-md bg-background"
                        placeholder="Add any special instructions for your order..."
                        value={orderNotes}
                        onChange={(e) => handleOrderNotesChange(e.target.value)}
                      />
                    </CardContent>
                  </Card>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={handleBack}>
                      ← Back to Shipping
                    </Button>
                    <Button 
                      onClick={handleSubmitOrder}
                      disabled={submitting}
                      className="btn-primary"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Order...
                        </>
                      ) : (
                        'Place Order'
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 5: Payment */}
              {step === 5 && createdOrder && (
                <div className="space-y-6">
                  <PayPalProvider>
                    <PaymentStep
                      orderTotal={orderTotal}
                      orderId={createdOrder.id}
                      billingAddress={isBillingSameAsShipping ? shippingAddress : billingAddress}
                      shippingAddress={shippingAddress}
                      onPaymentSuccess={handlePaymentSuccess}
                      onPaymentError={handlePaymentError}
                    />
                  </PayPalProvider>
                  
                  <div className="flex justify-start">
                    <Button variant="outline" onClick={handleBack}>
                      ← Back to Review
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Applied Coupons */}
                    {cart?.appliedCoupons && cart.appliedCoupons.length > 0 && (
                      <div className="border-b pb-3 mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Applied Coupons:</p>
                        {cart.appliedCoupons.map((coupon: any, idx: number) => {
                          const discount = Number(coupon?.discountAmount ?? coupon?.amount ?? 0);
                          return (
                            <div key={idx} className="flex items-center justify-between bg-green-50 dark:bg-green-950 p-2 rounded mb-1">
                              <div>
                                <span className="font-mono font-semibold text-sm text-green-700 dark:text-green-300">{coupon?.code || 'Coupon'}</span>
                                <p className="text-xs text-green-600 dark:text-green-400">-{currency}{discount.toFixed(2)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Coupon Code Input - Only show before payment step */}
                    {step < 5 && (
                      <div className="border-b pb-3 mb-3">
                        <label className="block text-sm font-medium mb-2">
                          Coupon Code
                        </label>
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            placeholder="Enter code"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleApplyCoupon()}
                            disabled={cartLoading || applyingCoupon}
                            className="text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleApplyCoupon}
                            disabled={cartLoading || applyingCoupon || !couponCode.trim()}
                          >
                            {applyingCoupon ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Apply'
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">{currency}{totals.subtotal.toFixed(2)}</span>
                    </div>

                    {totals.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Discount:</span>
                        <span className="font-medium text-green-600">-{currency}{totals.discount.toFixed(2)}</span>
                      </div>
                    )}

                    {step >= 3 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Shipping:</span>
                          <span className="font-medium">
                            {loadingShipping || (!selectedShipping && !shippingOptions.length) ? (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Calculating...
                              </span>
                            ) : shippingCost === 0 ? (
                              'FREE'
                            ) : (
                              `${currency}${shippingCost.toFixed(2)}`
                            )}
                          </span>
                        </div>
                        {(loadingShipping && isFloridaOrder) || floridaTax > 0 ? (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tax (FL 6%):</span>
                            <span className="font-medium">
                              {loadingShipping ? (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Calculating...
                                </span>
                              ) : (
                                `${currency}${floridaTax.toFixed(2)}`
                              )}
                            </span>
                          </div>
                        ) : null}
                      </>
                    )}

                    <div className="border-t border-border pt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold">Total:</span>
                        <span className="text-xl font-bold text-primary">
                          {loadingShipping && step >= 3 ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-muted-foreground">Calculating...</span>
                            </span>
                          ) : (
                            `${currency}${orderTotal.toFixed(2)}`
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
                    {totals.itemCount} item{totals.itemCount !== 1 ? 's' : ''} in your order
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Checkout;
