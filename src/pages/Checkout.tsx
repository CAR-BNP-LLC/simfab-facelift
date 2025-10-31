/**
 * Checkout Page
 * Multi-step checkout flow: Cart Review → Address → Shipping → Review → Order
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { orderAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import PayPalProvider from '@/components/PayPalProvider';
import { AddressForm } from '@/components/checkout/AddressForm';
import PaymentStep from '@/components/checkout/PaymentStep';

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, loading: cartLoading, applyCoupon, refreshCart } = useCart();
  const { user } = useAuth();
  const { checkoutState, updateCheckoutState, clearStorage } = useCheckout();
  const { toast } = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Destructure state from context
  const {
    step,
    shippingAddress,
    billingAddress,
    selectedShipping,
    orderNotes = '',
    createdOrder,
    isBillingSameAsShipping
  } = checkoutState;

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

  // Shipping options
  const shippingOptions = [
    {
      id: 'standard',
      name: 'Standard Shipping',
      description: '5-7 business days',
      price: 0,
      carrier: 'USPS'
    },
    {
      id: 'express',
      name: 'Express Shipping',
      description: '2-3 business days',
      price: 25.00,
      carrier: 'FedEx'
    },
    {
      id: 'overnight',
      name: 'Overnight Shipping',
      description: 'Next business day',
      price: 50.00,
      carrier: 'FedEx'
    }
  ];

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
      console.log('Validating createdOrder exists:', createdOrder);
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
    console.log(`Updating shipping address ${field}:`, value);
    updateCheckoutState({
      shippingAddress: { ...shippingAddress, [field]: value }
    });
  };

  const handleAddressBatchChange = (updates: Partial<typeof shippingAddress>) => {
    console.log('Batch updating shipping address:', updates);
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
    const required: (keyof typeof shippingAddress)[] = ['firstName', 'lastName', 'addressLine1', 'country', 'state', 'city', 'postalCode', 'phone', 'email'];
    
    console.log('Validating address:', shippingAddress);
    
    for (const field of required) {
      const value = shippingAddress[field];
      console.log(`Field ${field}:`, value, 'Empty?', !value || value.trim() === '');
      
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
    updateCheckoutState({ step: step + 1 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    updateCheckoutState({ step: step - 1 });
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

      const orderData = {
        shippingAddress: cleanAddress(shippingAddress),
        billingAddress: cleanAddress(isBillingSameAsShipping ? shippingAddress : billingAddress),
        shippingMethodId: selectedShipping,
        paymentMethodId: 'pending',
        orderNotes: orderNotes || ''
      };

      console.log('Creating order:', orderData);
      console.log('Shipping address state:', orderData.shippingAddress.state);
      console.log('Billing address state:', orderData.billingAddress.state);
      console.log('Current checkout state:', checkoutState);
      console.log('Shipping address from context:', shippingAddress);
      console.log('Billing address from context:', billingAddress);

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

      console.log('Order creation response:', response);

      if (response.success && response.data.order) {
        console.log('Order created successfully:', response.data.order);
        updateCheckoutState({ 
          createdOrder: response.data.order,
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
      selectedShipping: 'standard',
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

  // Get cart data
  const items = cart?.items || [];
  const totals = cart?.totals || { subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0, itemCount: 0 };
  
  // Calculate shipping
  const shippingCost = shippingOptions.find(opt => opt.id === selectedShipping)?.price || 0;
  const orderTotal = totals.total + shippingCost;

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
            <div className="flex items-center justify-between max-w-3xl mx-auto">
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
                  {idx < 4 && (
                    <div className={`h-1 flex-1 ${step > stepInfo.num ? 'bg-primary' : 'bg-muted'}`} />
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
                            <p className="font-semibold mt-2">${parseFloat(item.total_price).toFixed(2)}</p>
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

              {/* Step 3: Shipping Method */}
              {step === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Shipping Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
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
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold">
                                    {option.price === 0 ? 'FREE' : `$${option.price.toFixed(2)}`}
                                  </p>
                                </div>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>

                    <Alert className="mt-6">
                      <Package className="h-4 w-4" />
                      <AlertDescription>
                        Free standard shipping on orders over $500
                      </AlertDescription>
                    </Alert>

                    <div className="mt-6 flex justify-between">
                      <Button variant="outline" onClick={handleBack}>
                        ← Back to Address
                      </Button>
                      <Button onClick={handleNext}>
                        Review Order
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 4: Review & Submit */}
              {step === 4 && (
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
                          {shippingOptions.find(opt => opt.id === selectedShipping)?.name}
                        </p>
                        <p className="text-muted-foreground">
                          {shippingOptions.find(opt => opt.id === selectedShipping)?.description}
                        </p>
                        <p className="font-semibold mt-2">
                          {shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}
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
                              <p className="font-semibold">${parseFloat(item.total_price).toFixed(2)}</p>
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

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Payment Integration Coming Soon</strong> - Orders will be created as "Pending Payment". 
                      Phase 4 will add PayPal payment processing.
                    </AlertDescription>
                  </Alert>

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
                                <p className="text-xs text-green-600 dark:text-green-400">-${discount.toFixed(2)}</p>
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
                      <span className="font-medium">${totals.subtotal.toFixed(2)}</span>
                    </div>

                    {totals.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Discount:</span>
                        <span className="font-medium text-green-600">-${totals.discount.toFixed(2)}</span>
                      </div>
                    )}

                    {step >= 3 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Shipping:</span>
                        <span className="font-medium">
                          {shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax:</span>
                      <span className="font-medium">${totals.tax.toFixed(2)}</span>
                    </div>

                    <div className="border-t border-border pt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold">Total:</span>
                        <span className="text-xl font-bold text-primary">
                          ${orderTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
                    {totals.itemCount} item{totals.itemCount !== 1 ? 's' : ''} in your order
                  </div>

                  <div className="mt-6 pt-6 border-t border-border">
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Secure checkout
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Free shipping over $500
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Money-back guarantee
                      </div>
                    </div>
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
