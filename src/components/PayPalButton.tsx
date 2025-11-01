import { PayPalButtons } from '@paypal/react-paypal-js';
import { useToast } from '@/hooks/use-toast';
import { paymentAPI } from '@/services/api';

interface PayPalButtonProps {
  amount: number;
  orderId: number;
  currency?: string; // Currency code (USD or EUR) - if not provided, detects from region
  paymentMethod?: 'paypal_account' | 'guest_card';
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
  onSuccess?: (paymentId: string) => void;
  onError?: (error: any) => void;
}

export const PayPalButton: React.FC<PayPalButtonProps> = ({
  amount,
  orderId,
  currency,
  paymentMethod = 'paypal_account',
  billingAddress,
  shippingAddress,
  onSuccess,
  onError
}) => {
  const { toast } = useToast();

  // Detect currency if not provided
  const getCurrency = (): string => {
    if (currency) return currency;
    
    // Detect region from hostname/query params
    const hostname = window.location.hostname;
    const urlParams = new URLSearchParams(window.location.search);
    const queryRegion = urlParams.get('region');
    
    let region: string = 'us';
    
    if (hostname.startsWith('eu.') || hostname.includes('.eu.')) {
      region = 'eu';
    } else if (queryRegion === 'eu' || queryRegion === 'us') {
      region = queryRegion;
    } else if (import.meta.env.VITE_DEFAULT_REGION) {
      region = import.meta.env.VITE_DEFAULT_REGION;
    }
    
    return region === 'eu' ? 'EUR' : 'USD';
  };

  const createOrder = async () => {
    try {
      const response = await paymentAPI.createPayment({
        orderId,
        amount,
        currency: getCurrency(),
        paymentMethod,
        returnUrl: `${window.location.origin}/checkout/success`,
        cancelUrl: `${window.location.origin}/checkout/cancel`,
        billingAddress,
        shippingAddress
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
        
        // Don't navigate here - let the parent component handle navigation with order number
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

  const handlePayPalError = (err: any) => {
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
      onError={handlePayPalError}
      style={{
        layout: 'vertical',
        color: paymentMethod === 'guest_card' ? 'black' : 'gold',
        shape: 'rect',
        label: paymentMethod === 'guest_card' ? 'pay' : 'paypal',
        height: 45,
        tagline: false
      }}
      fundingSource={paymentMethod === 'guest_card' ? 'card' : undefined}
    />
  );
};

export default PayPalButton;
