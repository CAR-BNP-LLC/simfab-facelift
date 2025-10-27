import { PayPalButtons } from '@paypal/react-paypal-js';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { paymentAPI } from '@/services/api';

interface PayPalButtonProps {
  amount: number;
  orderId: number;
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
  paymentMethod = 'paypal_account',
  billingAddress,
  shippingAddress,
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
