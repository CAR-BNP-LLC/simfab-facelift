/**
 * Region Context
 * Global region state management (US vs EU)
 */

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
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
  // Initialize region from localStorage, hostname, or default to 'us'
  const [region, setRegionState] = useState<Region>(() => {
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

  // Save to localStorage and register with api.ts whenever region changes
  useEffect(() => {
    // Update ref FIRST (synchronously, before any other effects run)
    regionRef.current = region;
    
    // Register getter function that reads from ref (always current)
    setApiRegionGetter(() => regionRef.current);
    
    localStorage.setItem(REGION_STORAGE_KEY, region);
    
    console.log('📍 RegionContext: Updated region to', region, 'ref=', regionRef.current, 'and registered with api.ts');
    
    // Update query param (optional, for URL clarity)
    const url = new URL(window.location.href);
    url.searchParams.set('region', region);
    window.history.replaceState({}, '', url.toString());
  }, [region]);
  
  // Also register on mount to ensure it's set immediately
  useEffect(() => {
    regionRef.current = region; // Ensure ref is initialized
    setApiRegionGetter(() => regionRef.current);
    console.log('📍 RegionContext: Initial region set to', region);
  }, []);

  const setRegion = (newRegion: Region) => {
    // Update ref synchronously BEFORE state update
    regionRef.current = newRegion;
    setApiRegionGetter(() => regionRef.current);
    setRegionState(newRegion);
  };

  const toggleRegion = () => {
    setRegionState(current => {
      const newRegion = current === 'us' ? 'eu' : 'us';
      console.log('🌐 RegionContext: Toggling from', current, 'to', newRegion);
      
      // Update ref synchronously BEFORE state update
      regionRef.current = newRegion;
      setApiRegionGetter(() => regionRef.current);
      
      return newRegion;
    });
  };

  return (
    <RegionContext.Provider value={{ region, setRegion, toggleRegion }}>
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

