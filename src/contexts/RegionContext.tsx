/**
 * Region Context
 * Global region state management (US vs EU)
 */

import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useRef, useMemo, ReactNode } from 'react';
import { setRegionGetter as setApiRegionGetter } from '@/services/api';

type Region = 'us' | 'eu';

interface RegionContextType {
  region: Region;
  setRegion: (region: Region) => void;
  toggleRegion: () => void;
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

const REGION_STORAGE_KEY = 'simfab_region';

export const RegionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  console.log('[RegionProvider] RENDER');
  // Initialize region from localStorage, hostname, or default to 'us'
  const [region, setRegionState] = useState<Region>(() => {
    console.log('[RegionProvider] INITIAL STATE');
    // 1. Check localStorage first
    const stored = localStorage.getItem(REGION_STORAGE_KEY);
    if (stored === 'us' || stored === 'eu') {
      return stored;
    }
    
    // 2. Check hostname (production)
    const hostname = window.location.hostname;
    if (hostname.startsWith('eu.') || hostname.includes('.eu.')) {
      return 'eu';
    }
    
    // 3. Check query param (for initial load)
    const urlParams = new URLSearchParams(window.location.search);
    const queryRegion = urlParams.get('region');
    if (queryRegion === 'eu' || queryRegion === 'us') {
      return queryRegion;
    }
    
    // 4. Default to US
    return 'us';
  });

  // Use ref to always have the latest region value for the getter function
  // Initialize ref with initial region value
  const regionRef = useRef(region);

  // Register getter IMMEDIATELY (synchronously) before first paint
  // This ensures API requests made during initial render use the correct region
  // useLayoutEffect runs synchronously before browser paint, before any child effects
  useLayoutEffect(() => {
    console.log('[RegionProvider] useLayoutEffect RUN');
    regionRef.current = region;
    setApiRegionGetter(() => regionRef.current);
    localStorage.setItem(REGION_STORAGE_KEY, region);
  }, []); // Run only once on mount

  // Save to localStorage and register with api.ts whenever region changes
  const hasInitialized = useRef(false);
  useEffect(() => {
    console.log('[RegionProvider] useEffect RUN - region:', region);
    // Update ref FIRST (synchronously, before any other effects run)
    regionRef.current = region;
    
    // Register getter function that reads from ref (always current)
    setApiRegionGetter(() => regionRef.current);
    
    localStorage.setItem(REGION_STORAGE_KEY, region);
    
    // Only update URL if region actually changed (not on initial mount)
    if (hasInitialized.current) {
      // Update query param (optional, for URL clarity)
      const url = new URL(window.location.href);
      const currentRegion = url.searchParams.get('region');
      if (currentRegion !== region) {
        url.searchParams.set('region', region);
        window.history.replaceState({}, '', url.toString());
      }
    } else {
      hasInitialized.current = true;
    }
  }, [region]);

  const setRegion = (newRegion: Region) => {
    // Update ref synchronously BEFORE state update
    regionRef.current = newRegion;
    setApiRegionGetter(() => regionRef.current);
    setRegionState(newRegion);
  };

  const toggleRegion = () => {
    setRegionState(current => {
      const newRegion = current === 'us' ? 'eu' : 'us';
      // Update ref synchronously BEFORE state update
      regionRef.current = newRegion;
      setApiRegionGetter(() => regionRef.current);
      
      return newRegion;
    });
  };

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => {
    console.log('[RegionProvider] useMemo RUN - region:', region);
    return {
      region,
      setRegion,
      toggleRegion
    };
  }, [region]);

  console.log('[RegionProvider] RETURNING PROVIDER');
  return (
    <RegionContext.Provider value={contextValue}>
      {children}
    </RegionContext.Provider>
  );
};

export const useRegion = (): RegionContextType => {
  const context = useContext(RegionContext);
  if (!context) {
    throw new Error('useRegion must be used within RegionProvider');
  }
  return context;
};

