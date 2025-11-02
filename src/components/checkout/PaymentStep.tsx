import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Shield } from 'lucide-react';
import PayPalButton from '@/components/PayPalButton';

interface PaymentStepProps {
  orderTotal: number;
  orderId: number;
  billingAddress?: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
    email?: string;
  };
  shippingAddress?: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
    email?: string;
  };
  onPaymentSuccess: (paymentId: string) => void;
  onPaymentError: (error: any) => void;
}

export const PaymentStep: React.FC<PaymentStepProps> = ({
  orderTotal,
  orderId,
  billingAddress,
  shippingAddress,
  onPaymentSuccess,
  onPaymentError
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPayPalReady, setIsPayPalReady] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    // Set PayPal as ready after a short delay to ensure it's loaded
    const timer = setTimeout(() => {
      setIsPayPalReady(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Reset key when orderId or orderTotal changes to force clean remount
  useEffect(() => {
    setKey(prev => prev + 1);
    setIsPayPalReady(false);
    const timer = setTimeout(() => {
      setIsPayPalReady(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [orderId, orderTotal]);

  // Memoize callbacks to prevent unnecessary re-renders
  const handlePaymentSuccess = useCallback((paymentId: string) => {
    setIsProcessing(false);
    onPaymentSuccess(paymentId);
  }, [onPaymentSuccess]);

  const handlePaymentError = useCallback((error: any) => {
    setIsProcessing(false);
    onPaymentError(error);
  }, [onPaymentError]);

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

          {/* Payment Button */}
          <div className="space-y-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Complete your payment</h3>
              <p className="text-sm text-muted-foreground">
                Pay securely with PayPal or enter your card details
              </p>
            </div>
            
            {isPayPalReady ? (
              <PayPalButton
                key={`paypal-${orderId}-${orderTotal}-${key}`}
                amount={orderTotal}
                orderId={orderId}
                paymentMethod="paypal_account"
                billingAddress={billingAddress}
                shippingAddress={shippingAddress}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-gray-600">Loading payment options...</span>
              </div>
            )}
          </div>

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
