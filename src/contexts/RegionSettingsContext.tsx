/**
 * Region Settings Context
 * Provides region-specific settings to all components
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRegion } from './RegionContext';
import { regionSettingsAPI } from '@/services/api';

interface ContactInfo {
  email: string;
  phone: string;
  phone_display: string;
}

interface RegionSettingsContextType {
  settings: Record<string, any>;
  contactInfo: ContactInfo;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const RegionSettingsContext = createContext<RegionSettingsContextType | undefined>(undefined);

export const RegionSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { region } = useRegion();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    email: '',
    phone: '',
    phone_display: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both public settings and contact info
      const [settingsResponse, contactResponse] = await Promise.all([
        regionSettingsAPI.getPublicSettings(region),
        regionSettingsAPI.getContactInfo(region)
      ]);

      if (settingsResponse.success) {
        setSettings(settingsResponse.data.settings);
      }

      if (contactResponse.success) {
        setContactInfo(contactResponse.data);
      }
    } catch (err) {
      console.error('Failed to fetch region settings:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch settings'));
      
      // Set fallback values
      setContactInfo({
        email: region === 'eu' ? 'info@simfab.eu' : 'info@simfab.com',
        phone: region === 'eu' ? '+49-XXX-XXXXXXX' : '1-888-299-2746',
        phone_display: region === 'eu' 
          ? 'EU Support: +49-XXX-XXXXXXX' 
          : 'Toll free for USA & Canada: 1-888-299-2746'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [region]);

  return (
    <RegionSettingsContext.Provider
      value={{
        settings,
        contactInfo,
        loading,
        error,
        refresh: fetchSettings
      }}
    >
      {children}
    </RegionSettingsContext.Provider>
  );
};

export const useRegionSettings = (): RegionSettingsContextType => {
  const context = useContext(RegionSettingsContext);
  if (context === undefined) {
    throw new Error('useRegionSettings must be used within a RegionSettingsProvider');
  }
  return context;
};

