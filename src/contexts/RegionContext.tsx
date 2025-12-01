/**
 * Region Context
 * Global region state management (US vs EU)
 */

import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, ReactNode } from 'react';
import { setRegionGetter as setApiRegionGetter, regionSettingsAPI } from '@/services/api';

type Region = 'us' | 'eu';

interface RegionContextType {
  region: Region;
  setRegion: (region: Region) => void;
  toggleRegion: () => void;
  restrictionsEnabled: boolean;
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

const REGION_STORAGE_KEY = 'simfab_region';
const OLD_SITE_URL = 'https://simfab.com';

export const RegionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [restrictionsEnabled, setRestrictionsEnabled] = useState(false);
  
  // Initialize region from hostname, localStorage, query param, or default to 'eu'
  const [region, setRegionState] = useState<Region>(() => {
    // 1. Check hostname first (production - highest priority)
    const hostname = window.location.hostname;
    if (hostname === 'simfab.eu' || hostname.endsWith('.simfab.eu') || hostname.startsWith('eu.') || hostname.includes('.eu.')) {
      return 'eu';
    }
    
    // 2. Check localStorage
    const stored = localStorage.getItem(REGION_STORAGE_KEY);
    if (stored === 'us' || stored === 'eu') {
      return stored;
    }
    
    // 3. Check query param (for initial load)
    const urlParams = new URLSearchParams(window.location.search);
    const queryRegion = urlParams.get('region');
    if (queryRegion === 'eu' || queryRegion === 'us') {
      return queryRegion;
    }
    
    // 4. Default to EU (changed from US for EU-only deployment)
    return 'eu';
  });

  // Use ref to always have the latest region value for the getter function
  // Initialize ref with initial region value
  const regionRef = useRef(region);

  // Fetch region restrictions on mount
  useEffect(() => {
    const fetchRestrictions = async () => {
      try {
        const response = await regionSettingsAPI.getPublicSettings('eu');
        if (response.success && response.data.settings) {
          const restrictions = response.data.settings.region_restrictions_enabled === true;
          setRestrictionsEnabled(restrictions);
        }
      } catch (error) {
        console.error('Failed to fetch region restrictions:', error);
        // Default to false if fetch fails
        setRestrictionsEnabled(false);
      }
    };
    
    fetchRestrictions();
  }, []);

  // Register getter IMMEDIATELY (synchronously) before first paint
  // This ensures API requests made during initial render use the correct region
  // useLayoutEffect runs synchronously before browser paint, before any child effects
  useLayoutEffect(() => {
    regionRef.current = region;
    setApiRegionGetter(() => regionRef.current);
    localStorage.setItem(REGION_STORAGE_KEY, region);
  }, []); // Run only once on mount

  // Save to localStorage and register with api.ts whenever region changes
  const hasInitialized = useRef(false);
  useEffect(() => {
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

  const setRegion = useCallback((newRegion: Region) => {
    // Check if restrictions are enabled and user is trying to switch to US
    if (restrictionsEnabled && newRegion === 'us') {
      // Redirect to old site, preserving current path
      const currentPath = window.location.pathname + window.location.search;
      const redirectUrl = `${OLD_SITE_URL}${currentPath}`;
      window.location.href = redirectUrl;
      return;
    }
    
    // Update ref synchronously BEFORE state update
    regionRef.current = newRegion;
    setApiRegionGetter(() => regionRef.current);
    setRegionState(newRegion);
  }, [restrictionsEnabled]);

  const toggleRegion = useCallback(() => {
    setRegionState(current => {
      const newRegion = current === 'us' ? 'eu' : 'us';
      
      // Check if restrictions are enabled and user is trying to switch to US
      if (restrictionsEnabled && newRegion === 'us') {
        // Redirect to old site, preserving current path
        const currentPath = window.location.pathname + window.location.search;
        const redirectUrl = `${OLD_SITE_URL}${currentPath}`;
        window.location.href = redirectUrl;
        return current; // Return current region since we're redirecting
      }
      
      // Update ref synchronously BEFORE state update
      regionRef.current = newRegion;
      setApiRegionGetter(() => regionRef.current);
      
      return newRegion;
    });
  }, [restrictionsEnabled]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => {
    return {
      region,
      setRegion,
      toggleRegion,
      restrictionsEnabled
    };
  }, [region, setRegion, toggleRegion, restrictionsEnabled]);

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

