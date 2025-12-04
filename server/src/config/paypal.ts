import * as paypal from '@paypal/checkout-server-sdk';
import { Pool } from 'pg';
import { RegionSettingsService } from '../services/RegionSettingsService';

// Get PayPal configuration for a specific region from database
// NOTE: PayPal credentials are now stored in the database (region_settings table)
// Environment variables are deprecated and no longer used
export const getPayPalConfigForRegion = async (
  pool: Pool,
  region: 'us' | 'eu'
): Promise<{
  clientId: string;
  clientSecret: string;
  mode: string;
  environment: string;
}> => {
  const regionSettingsService = new RegionSettingsService(pool);
  
  // Get PayPal settings from database
  const paypalClientId = await regionSettingsService.getSetting(region, 'paypal_client_id');
  const paypalClientSecret = await regionSettingsService.getSetting(region, 'paypal_client_secret');
  
  if (!paypalClientId || !paypalClientSecret) {
    throw new Error(`PayPal credentials not configured for region: ${region}. Please configure them in the admin dashboard.`);
  }
  
  // Determine environment based on PAYPAL_MODE or NODE_ENV
  const explicitMode = process.env.PAYPAL_MODE;
  const isProduction = explicitMode 
    ? explicitMode === 'live' || explicitMode === 'production'
    : process.env.NODE_ENV === 'production';
  
  return {
    clientId: paypalClientId,
    clientSecret: paypalClientSecret,
    mode: isProduction ? 'live' : 'sandbox',
    environment: isProduction ? 'production' : 'sandbox'
  };
};

// Create PayPal client for a specific region
export const getPayPalClientForRegion = async (
  pool: Pool,
  region: 'us' | 'eu'
): Promise<paypal.core.PayPalHttpClient> => {
  const config = await getPayPalConfigForRegion(pool, region);
  
  if (!config.clientId || !config.clientSecret) {
    throw new Error(`PayPal credentials not configured for region: ${region}`);
  }
  
  let environment: paypal.core.LiveEnvironment | paypal.core.SandboxEnvironment;
  if (config.environment === 'production') {
    environment = new paypal.core.LiveEnvironment(
      config.clientId,
      config.clientSecret
    );
  } else {
    environment = new paypal.core.SandboxEnvironment(
      config.clientId,
      config.clientSecret
    );
  }
  
  return new paypal.core.PayPalHttpClient(environment);
};

// NOTE: Legacy paypalClient and paypalConfig exports have been removed.
// All PayPal operations must now use getPayPalClientForRegion() with a region parameter.
// PayPal credentials are stored in the database (region_settings table) and can be
// configured through the admin dashboard.

// Export configuration for use in other files
export default {
  getPayPalClientForRegion,
  getPayPalConfigForRegion
};
