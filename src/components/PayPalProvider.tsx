import { PayPalScriptProvider } from '@paypal/react-paypal-js';

interface PayPalProviderProps {
  children: React.ReactNode;
}

export const PayPalProvider: React.FC<PayPalProviderProps> = ({ children }) => {
  const paypalOptions = {
    clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID,
    currency: 'USD',
    intent: 'capture',
    components: 'buttons,marks,messages', // Include more components for better UX
    enableFunding: 'paylater,card,credit', // Enable PayPal Pay Later, card, and credit payments
    disableFunding: '', // Don't disable any funding sources
    merchantId: import.meta.env.VITE_PAYPAL_MERCHANT_ID || undefined,
    dataClientToken: import.meta.env.VITE_PAYPAL_CLIENT_TOKEN || undefined
  };

  return (
    <PayPalScriptProvider options={paypalOptions}>
      {children}
    </PayPalScriptProvider>
  );
};

export default PayPalProvider;
