import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { useEffect } from 'react';

interface PayPalProviderProps {
  children: React.ReactNode;
}

export const PayPalProvider: React.FC<PayPalProviderProps> = ({ children }) => {
  // Suppress verbose PayPal SDK console logs (can be disabled by setting VITE_PAYPAL_DEBUG=true)
  useEffect(() => {
    const enablePayPalDebug = import.meta.env.VITE_PAYPAL_DEBUG === 'true';
    
    if (!enablePayPalDebug) {
      const originalWarn = console.warn;
      const originalInfo = console.info;
      const originalLog = console.log;

      // Filter out PayPal SDK verbose logs
      const shouldSuppressPayPalLog = (args: any[]) => {
        if (args.length === 0) return false;
        const firstArg = args[0];
        if (typeof firstArg === 'string') {
          // Check for PayPal SDK internal logs
          return (
            firstArg.includes('buttons?style') ||
            firstArg.includes('js?client-id=') ||
            firstArg.startsWith('N @') ||
            firstArg.startsWith('D @') ||
            (firstArg.includes('paypal') && firstArg.includes('sessionID'))
          );
        }
        return false;
      };

      console.warn = (...args: any[]) => {
        if (!shouldSuppressPayPalLog(args)) {
          originalWarn.apply(console, args);
        }
      };

      console.info = (...args: any[]) => {
        if (!shouldSuppressPayPalLog(args)) {
          originalInfo.apply(console, args);
        }
      };

      console.log = (...args: any[]) => {
        if (!shouldSuppressPayPalLog(args)) {
          originalLog.apply(console, args);
        }
      };

      return () => {
        console.warn = originalWarn;
        console.info = originalInfo;
        console.log = originalLog;
      };
    }
  }, []);

  // Detect region from hostname/query params (same logic as api.ts)
  const hostname = window.location.hostname;
  const urlParams = new URLSearchParams(window.location.search);
  const queryRegion = urlParams.get('region');
  
  let region: string = 'us';
  
  // 1. Check hostname (production: eu.simfab.com -> 'eu')
  if (hostname.startsWith('eu.') || hostname.includes('.eu.')) {
    region = 'eu';
  }
  // 2. Check query parameter
  else if (queryRegion === 'eu' || queryRegion === 'us') {
    region = queryRegion;
  }
  // 3. Check env var (development)
  else if (import.meta.env.VITE_DEFAULT_REGION) {
    region = import.meta.env.VITE_DEFAULT_REGION;
  }

  const currency = region === 'eu' ? 'EUR' : 'USD';

  const paypalOptions = {
    clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID,
    currency,
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
