import { useState, useEffect, ReactNode } from 'react';
import { CheckoutProvider } from '@/contexts/CheckoutContext';

interface CheckoutRouteWrapperProps {
  children: ReactNode;
}

/**
 * CheckoutRouteWrapper - Only loads CheckoutProvider on checkout-related routes
 * This prevents loading checkout context on pages that don't need it
 */
export const CheckoutRouteWrapper: React.FC<CheckoutRouteWrapperProps> = ({ children }) => {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Use window.location.pathname since we're outside BrowserRouter
    const pathname = window.location.pathname;
    const isCheckoutRoute = pathname.startsWith('/checkout') || 
                           pathname.startsWith('/order-confirmation') ||
                           pathname.startsWith('/orders/');
    
    console.log('[CheckoutRouteWrapper] useEffect RUN - pathname:', pathname, 'isCheckoutRoute:', isCheckoutRoute);
    
    if (isCheckoutRoute) {
      // Load immediately for checkout routes
      console.log('[CheckoutRouteWrapper] Loading CheckoutProvider for checkout route');
      setShouldLoad(true);
    } else {
      // Defer loading for non-checkout routes (in case user navigates to checkout)
      const timer = setTimeout(() => {
        console.log('[CheckoutRouteWrapper] Deferred loading CheckoutProvider');
        setShouldLoad(true);
      }, 500); // Load after 500ms if not on checkout route
      return () => {
        console.log('[CheckoutRouteWrapper] useEffect CLEANUP');
        clearTimeout(timer);
      };
    }
  }, []); // Only run once on mount

  console.log('[CheckoutRouteWrapper] RENDER - shouldLoad:', shouldLoad);

  if (!shouldLoad) {
    console.log('[CheckoutRouteWrapper] RETURNING CHILDREN WITHOUT CHECKOUT PROVIDER');
    return <>{children}</>;
  }

  console.log('[CheckoutRouteWrapper] RETURNING CHILDREN WITH CHECKOUT PROVIDER');
  return (
    <CheckoutProvider>
      {children}
    </CheckoutProvider>
  );
};

