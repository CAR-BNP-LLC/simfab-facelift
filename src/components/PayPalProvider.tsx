import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { useEffect, useState, useMemo } from 'react';
import { useRegion } from '@/contexts/RegionContext';
import { paymentAPI } from '@/services/api';

interface PayPalProviderProps {
  children: React.ReactNode;
}

export const PayPalProvider: React.FC<PayPalProviderProps> = ({ children }) => {
  // Defer PayPal script loading to avoid blocking initial render
  const [shouldLoadPayPal, setShouldLoadPayPal] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const { region } = useRegion();
  
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await paymentAPI.getPaymentConfig(region);
        if (response.success && response.data.clientId) {
          setClientId(response.data.clientId);
        } else {
          // Fallback to env var
          setClientId(import.meta.env.VITE_PAYPAL_CLIENT_ID);
        }
      } catch (error) {
        console.error('Failed to fetch PayPal config:', error);
        // Fallback to env var
        setClientId(import.meta.env.VITE_PAYPAL_CLIENT_ID);
      }
    };

    fetchConfig();
  }, [region]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldLoadPayPal(true);
    }, 100); // Small delay to allow initial render
    return () => {
      clearTimeout(timer);
    };
  }, []);
  
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

  // Memoize PayPal options to avoid recreating on every render
  const paypalOptions = useMemo(() => {
    const currency = region === 'eu' ? 'EUR' : 'USD';

    // Check if wallet payments are enabled via environment variable
    // Set VITE_ENABLE_WALLET_PAYMENTS=true after enabling Apple Pay/Google Pay in PayPal account
    const enableWalletPayments = import.meta.env.VITE_ENABLE_WALLET_PAYMENTS === 'true';

    // Build components string conditionally
    // Note: PayPal SDK automatically handles device/browser detection:
    // - Apple Pay: Only shows on Safari (macOS/iOS) with Apple Pay configured
    // - Google Pay: Only shows on Chrome/Android with Google Pay configured
    // No custom detection needed - PayPal SDK handles this natively
    const baseComponents = 'buttons,marks,messages';
    const walletComponents = enableWalletPayments ? ',applepay,googlepay' : '';
    const components = baseComponents + walletComponents;

    // Build enableFunding string conditionally
    const baseFunding = 'paylater,card,credit';
    const walletFunding = enableWalletPayments ? ',applepay,googlepay' : '';
    const enableFunding = baseFunding + walletFunding;

    return {
      clientId: clientId || import.meta.env.VITE_PAYPAL_CLIENT_ID,
      currency,
      intent: 'capture',
      components, // Conditionally include wallet payment components
      enableFunding, // Conditionally enable wallet payments
      disableFunding: '', // Don't disable any funding sources
      merchantId: import.meta.env.VITE_PAYPAL_MERCHANT_ID || undefined,
      dataClientToken: import.meta.env.VITE_PAYPAL_CLIENT_TOKEN || undefined
    };
  }, [region, clientId]);
  
  // Don't load PayPal script until after initial render and clientId is available
  if (!shouldLoadPayPal || !clientId) {
    return <>{children}</>;
  }

  return (
    <PayPalScriptProvider options={paypalOptions}>
      {children}
    </PayPalScriptProvider>
  );
};

export default PayPalProvider;
