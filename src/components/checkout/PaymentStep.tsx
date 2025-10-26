import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Shield, Lock } from 'lucide-react';
import PayPalButton from '@/components/PayPalButton';
import { useEffect } from 'react';

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
  const [selectedMethod, setSelectedMethod] = useState<'paypal_account' | 'guest_card'>('paypal_account');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPayPalReady, setIsPayPalReady] = useState(false);

  useEffect(() => {
    // Set PayPal as ready after a short delay to ensure it's loaded
    const timer = setTimeout(() => {
      setIsPayPalReady(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

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
              onValueChange={(value) => setSelectedMethod(value as 'paypal_account' | 'guest_card')}
              className="space-y-4"
            >
              <div className="flex items-center space-x-3 p-4 border rounded-lg">
                <RadioGroupItem value="paypal_account" id="paypal_account" />
                <Label htmlFor="paypal_account" className="flex items-center gap-3 flex-1 cursor-pointer">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                    <span className="text-white font-bold text-sm">P</span>
                  </div>
                  <div>
                    <div className="font-medium">PayPal Account</div>
                    <div className="text-sm text-muted-foreground">
                      Log in to your PayPal account
                    </div>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-4 border rounded-lg">
                <RadioGroupItem value="guest_card" id="guest_card" />
                <Label htmlFor="guest_card" className="flex items-center gap-3 flex-1 cursor-pointer">
                  <div className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium">Pay with Card</div>
                    <div className="text-sm text-muted-foreground">
                      Enter your card details directly (Visa, Mastercard, Amex)
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
          {(selectedMethod === 'paypal_account' || selectedMethod === 'guest_card') && (
            <div className="space-y-4">
              <div className="border-t pt-4">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {selectedMethod === 'paypal_account' ? 'PayPal Payment' : 'Card Payment'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedMethod === 'paypal_account' 
                      ? 'Click below to pay with your PayPal account'
                      : 'Click below to enter your card details'
                    }
                  </p>
                </div>
                
                {isPayPalReady ? (
                  <PayPalButton
                    amount={orderTotal}
                    orderId={orderId}
                    paymentMethod={selectedMethod}
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
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {selectedMethod === 'paypal_account' 
                    ? 'You will be redirected to PayPal to complete your payment securely'
                    : 'Click the button above to enter your card details securely'
                  }
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
