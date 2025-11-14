import { useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const [shouldLoad, setShouldLoad] = useState(false);

  // Check if we're on a checkout-related route
  const isCheckoutRoute = location.pathname.startsWith('/checkout') || 
                          location.pathname.startsWith('/order-confirmation') ||
                          location.pathname.startsWith('/orders/');

  useEffect(() => {
    console.log('[CheckoutRouteWrapper] useEffect RUN - isCheckoutRoute:', isCheckoutRoute);
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
  }, [isCheckoutRoute]);

  console.log('[CheckoutRouteWrapper] RENDER - shouldLoad:', shouldLoad, 'isCheckoutRoute:', isCheckoutRoute);

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

