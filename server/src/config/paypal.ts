import * as paypal from '@paypal/checkout-server-sdk';

// PayPal configuration
const getPayPalConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    clientId: isProduction 
      ? process.env.PAYPAL_CLIENT_ID_PROD 
      : process.env.PAYPAL_CLIENT_ID,
    clientSecret: isProduction 
      ? process.env.PAYPAL_CLIENT_SECRET_PROD 
      : process.env.PAYPAL_CLIENT_SECRET,
    mode: isProduction ? 'live' : 'sandbox',
    environment: isProduction ? 'production' : 'sandbox'
  };
};

// Initialize PayPal API client
const config = getPayPalConfig();
console.log('PayPal Config:', {
  environment: config.environment,
  clientId: config.clientId ? `${config.clientId.substring(0, 10)}...` : 'NOT SET',
  clientSecret: config.clientSecret ? 'SET' : 'NOT SET'
});

// Create PayPal environment
const getEnvironment = () => {
  if (config.environment === 'production') {
    return new paypal.core.LiveEnvironment(
      config.clientId!,
      config.clientSecret!
    );
  } else {
    return new paypal.core.SandboxEnvironment(
      config.clientId!,
      config.clientSecret!
    );
  }
};

export const paypalClient = new paypal.core.PayPalHttpClient(getEnvironment());

export const paypalConfig = getPayPalConfig();

// Export configuration for use in other files
export default {
  paypalClient,
  paypalConfig
};
