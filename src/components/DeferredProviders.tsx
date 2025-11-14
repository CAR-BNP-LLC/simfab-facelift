import { useState, useEffect, ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { RegionSettingsProvider } from '@/contexts/RegionSettingsContext';

interface DeferredProvidersProps {
  children: ReactNode;
}

/**
 * DeferredProviders - Loads non-critical contexts after initial render
 * This prevents stack overflow on iOS Safari by allowing the UI to render first
 */
export const DeferredProviders: React.FC<DeferredProvidersProps> = ({ children }) => {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    console.log('[DeferredProviders] useEffect RUN - deferring context load');
    // Defer loading contexts to allow initial render to complete
    const timer = setTimeout(() => {
      console.log('[DeferredProviders] setTimeout CALLBACK - loading deferred contexts');
      setShouldLoad(true);
    }, 0); // Use 0ms to load on next tick, allowing initial render to complete
    return () => {
      console.log('[DeferredProviders] useEffect CLEANUP');
      clearTimeout(timer);
    };
  }, []);

  console.log('[DeferredProviders] RENDER - shouldLoad:', shouldLoad);

  // Render children without contexts initially to allow UI to render
  if (!shouldLoad) {
    console.log('[DeferredProviders] RETURNING CHILDREN WITHOUT CONTEXTS');
    return <>{children}</>;
  }

  // Load all deferred contexts after initial render
  console.log('[DeferredProviders] RETURNING CHILDREN WITH CONTEXTS');
  return (
    <RegionSettingsProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            {children}
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </RegionSettingsProvider>
  );
};

