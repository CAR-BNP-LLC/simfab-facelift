# 💳 Payment Implementation - Phase 2: Frontend Payment Integration

**Duration**: Week 2 (5 days)  
**Complexity**: Medium  
**Dependencies**: Phase 1 (Backend Payment Infrastructure)

---

## 🎯 Phase 2 Objectives

### **Primary Goals**
1. **PayPal React SDK**: Set up PayPal client-side integration
2. **Payment Step Component**: Create payment selection UI
3. **Checkout Integration**: Integrate payment into checkout flow
4. **Payment Confirmation**: Handle payment success/failure
5. **Error Handling**: User-friendly payment error management

---

## 📋 Day-by-Day Implementation Plan

### **Day 1-2: PayPal React SDK Setup**

#### **2.1 Install Frontend Dependencies**
```bash
npm install @paypal/react-paypal-js
npm install @types/paypal__react-paypal-js
```

#### **2.2 Environment Configuration**
Update `.env` file:
```env
# PayPal Frontend Configuration
VITE_PAYPAL_CLIENT_ID=sandbox_client_id_here
VITE_PAYPAL_CLIENT_ID_PROD=live_client_id_here
```

#### **2.3 PayPal Provider Setup**
Create `src/components/PayPalProvider.tsx`:
```typescript
import { PayPalScriptProvider } from '@paypal/react-paypal-js';

interface PayPalProviderProps {
  children: React.ReactNode;
}

export const PayPalProvider: React.FC<PayPalProviderProps> = ({ children }) => {
  const paypalOptions = {
    clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID,
    currency: 'USD',
    intent: 'capture',
    components: 'buttons',
    disableFunding: 'credit,card', // Disable specific funding sources if needed
    enableFunding: 'paylater' // Enable PayPal Pay Later
  };

  return (
    <PayPalScriptProvider options={paypalOptions}>
      {children}
    </PayPalScriptProvider>
  );
};

export default PayPalProvider;
```

#### **2.4 PayPal Button Component**
Create `src/components/PayPalButton.tsx`:
```typescript
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { paymentAPI } from '@/services/api';

interface PayPalButtonProps {
  amount: number;
  orderId: number;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: any) => void;
}

export const PayPalButton: React.FC<PayPalButtonProps> = ({
  amount,
  orderId,
  onSuccess,
  onError
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const createOrder = async () => {
    try {
      const response = await paymentAPI.createPayment({
        orderId,
        amount,
        currency: 'USD',
        returnUrl: `${window.location.origin}/checkout/success`,
        cancelUrl: `${window.location.origin}/checkout/cancel`
      });

      if (response.success) {
        return response.data.payment.paymentId;
      } else {
        throw new Error('Failed to create payment');
      }
    } catch (error) {
      console.error('Payment creation failed:', error);
      toast({
        title: 'Payment Error',
        description: 'Failed to create payment. Please try again.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const onApprove = async (data: any) => {
    try {
      const response = await paymentAPI.executePayment({
        paymentId: data.orderID,
        payerId: data.payerID,
        orderId
      });

      if (response.success) {
        toast({
          title: 'Payment Successful!',
          description: 'Your payment has been processed successfully.',
        });
        
        if (onSuccess) {
          onSuccess(data.orderID);
        }
        
        navigate(`/order-confirmation/${orderId}`);
      } else {
        throw new Error('Payment execution failed');
      }
    } catch (error) {
      console.error('Payment execution failed:', error);
      toast({
        title: 'Payment Failed',
        description: 'Failed to process payment. Please try again.',
        variant: 'destructive'
      });
      
      if (onError) {
        onError(error);
      }
    }
  };

  const onError = (err: any) => {
    console.error('PayPal error:', err);
    toast({
      title: 'Payment Error',
      description: 'An error occurred during payment. Please try again.',
      variant: 'destructive'
    });
    
    if (onError) {
      onError(err);
    }
  };

  return (
    <PayPalButtons
      createOrder={createOrder}
      onApprove={onApprove}
      onError={onError}
      style={{
        layout: 'vertical',
        color: 'blue',
        shape: 'rect',
        label: 'paypal'
      }}
    />
  );
};

export default PayPalButton;
```

---

### **Day 3-4: Payment Step Component & Checkout Integration**

#### **2.5 Payment Step Component**
Create `src/components/checkout/PaymentStep.tsx`:
```typescript
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Shield, Lock } from 'lucide-react';
import PayPalButton from '@/components/PayPalButton';

interface PaymentStepProps {
  orderTotal: number;
  orderId: number;
  onPaymentSuccess: (paymentId: string) => void;
  onPaymentError: (error: any) => void;
}

export const PaymentStep: React.FC<PaymentStepProps> = ({
  orderTotal,
  orderId,
  onPaymentSuccess,
  onPaymentError
}) => {
  const [selectedMethod, setSelectedMethod] = useState('paypal');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePaymentSuccess = (paymentId: string) => {
    setIsProcessing(false);
    onPaymentSuccess(paymentId);
  };

  const handlePaymentError = (error: any) => {
    setIsProcessing(false);
    onPaymentError(error);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Method Selection */}
          <div>
            <Label className="text-base font-semibold mb-4 block">
              Choose your payment method
            </Label>
            <RadioGroup
              value={selectedMethod}
              onValueChange={setSelectedMethod}
              className="space-y-4"
            >
              <div className="flex items-center space-x-3 p-4 border rounded-lg">
                <RadioGroupItem value="paypal" id="paypal" />
                <Label htmlFor="paypal" className="flex items-center gap-3 flex-1 cursor-pointer">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                    <span className="text-white font-bold text-sm">P</span>
                  </div>
                  <div>
                    <div className="font-medium">PayPal</div>
                    <div className="text-sm text-muted-foreground">
                      Pay with PayPal or credit/debit card
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Payment Amount Display */}
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Amount</span>
              <span className="text-2xl font-bold text-primary">
                ${orderTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Security Notice */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Your payment information is secure and encrypted. We use PayPal's secure payment processing.
            </AlertDescription>
          </Alert>

          {/* PayPal Payment Button */}
          {selectedMethod === 'paypal' && (
            <div className="space-y-4">
              <div className="border-t pt-4">
                <PayPalButton
                  amount={orderTotal}
                  orderId={orderId}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  You will be redirected to PayPal to complete your payment securely
                </p>
              </div>
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Processing your payment...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentStep;
```

#### **2.6 Update Checkout Flow**
Update `src/pages/Checkout.tsx`:
```typescript
// Add imports
import PaymentStep from '@/components/checkout/PaymentStep';
import PayPalProvider from '@/components/PayPalProvider';

// Update checkout steps
const steps = [
  { id: 1, name: 'Cart Review', icon: ShoppingCart },
  { id: 2, name: 'Address', icon: MapPin },
  { id: 3, name: 'Shipping', icon: Truck },
  { id: 4, name: 'Payment', icon: CreditCard }, // New step
  { id: 5, name: 'Review', icon: CheckCircle }
];

// Add payment step handling
const handlePaymentSuccess = (paymentId: string) => {
  // Update order with payment ID
  setStep(5); // Move to review step
};

const handlePaymentError = (error: any) => {
  // Handle payment error
  console.error('Payment error:', error);
};

// Update render method
const renderStepContent = () => {
  switch (step) {
    case 1:
      return <CartReviewStep />;
    case 2:
      return <AddressStep />;
    case 3:
      return <ShippingStep />;
    case 4:
      return (
        <PaymentStep
          orderTotal={orderTotal}
          orderId={order?.id || 0}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
        />
      );
    case 5:
      return <ReviewStep />;
    default:
      return null;
  }
};

// Wrap the entire checkout in PayPalProvider
return (
  <PayPalProvider>
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Checkout content */}
      </main>
      <Footer />
    </div>
  </PayPalProvider>
);
```

---

### **Day 5: Payment Confirmation & Error Handling**

#### **2.7 Payment Confirmation Page**
Create `src/pages/PaymentConfirmation.tsx`:
```typescript
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Package, Truck } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { orderAPI } from '@/services/api';

const PaymentConfirmation = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await orderAPI.getOrder(orderId!);
      if (response.success) {
        setOrder(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch order details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading order details...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Message */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-green-600 mb-2">
                  Payment Successful!
                </h1>
                <p className="text-muted-foreground">
                  Your order has been placed and payment has been processed.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Order Details */}
          {order && (
            <Card>
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Order Number:</span>
                  <span className="font-mono">{order.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-bold">${order.total_amount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Status:</span>
                  <span className="text-green-600 font-medium">Paid</span>
                </div>
                <div className="flex justify-between">
                  <span>Order Status:</span>
                  <span className="font-medium">{order.status}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next Steps */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                What's Next?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Order Confirmation</h4>
                  <p className="text-sm text-muted-foreground">
                    You'll receive an email confirmation with your order details.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Processing</h4>
                  <p className="text-sm text-muted-foreground">
                    We'll prepare your order for shipping within 1-2 business days.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Shipping</h4>
                  <p className="text-sm text-muted-foreground">
                    You'll receive tracking information once your order ships.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-6">
            <Button
              onClick={() => navigate('/shop')}
              variant="outline"
              className="flex-1"
            >
              Continue Shopping
            </Button>
            <Button
              onClick={() => navigate(`/orders/${orderId}`)}
              className="flex-1"
            >
              View Order Details
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentConfirmation;
```

#### **2.8 Update API Service**
Update `src/services/api.ts`:
```typescript
// Add payment API
export const paymentAPI = {
  createPayment: (data: {
    orderId: number;
    amount: number;
    currency: string;
    returnUrl: string;
    cancelUrl: string;
  }) => {
    return apiRequest<{
      success: boolean;
      data: {
        payment: {
          paymentId: string;
          approvalUrl: string;
          status: string;
        };
      };
      message: string;
    }>('/api/payments/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  executePayment: (data: {
    paymentId: string;
    payerId: string;
    orderId: number;
  }) => {
    return apiRequest<{
      success: boolean;
      data: {
        payment: {
          paymentId: string;
          status: string;
        };
      };
      message: string;
    }>('/api/payments/execute', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getPaymentStatus: (paymentId: string) => {
    return apiRequest<{
      success: boolean;
      data: {
        payment: any;
      };
    }>(`/api/payments/${paymentId}`);
  }
};
```

---

## ✅ Phase 2 Deliverables

### **Frontend Components Created**
- ✅ PayPal React SDK integration
- ✅ PayPal Button component
- ✅ Payment Step component
- ✅ Payment Confirmation page
- ✅ Checkout flow integration

### **Features Implemented**
- ✅ PayPal payment processing
- ✅ Payment method selection
- ✅ Payment success/failure handling
- ✅ User-friendly error messages
- ✅ Payment confirmation flow

### **Testing Checklist**
- ✅ PayPal button rendering
- ✅ Payment creation flow
- ✅ Payment execution flow
- ✅ Error handling scenarios
- ✅ Mobile responsiveness

---

## 🚀 Next Steps

**Phase 2 Completion Criteria:**
- PayPal integration is functional
- Payment step is integrated into checkout
- Payment confirmation is working
- Error handling is implemented
- User experience is smooth

**Ready for Phase 3:** Testing, Refinement & Production Setup

---

**Status**: 📋 Ready for Implementation  
**Estimated Time**: 5 days  
**Dependencies**: Phase 1 (Backend Payment Infrastructure)
