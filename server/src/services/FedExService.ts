/**
 * FedEx Service
 * Handles integration with FedEx Rates and Transit Times API
 */

import { Pool } from 'pg';
import { 
  FedExRateRequest, 
  FedExRateResponse, 
  FedExRateResult,
  FedExAddress,
  FedExConfig,
  PackageSizeMapping
} from '../types/fedex';

export class FedExService {
  private pool: Pool;
  private config: FedExConfig | null = null;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(pool: Pool) {
    this.pool = pool;
    // Load config asynchronously - it will be ready before first API call
    this.loadConfig().catch(error => {
      console.error('Failed to load FedEx config:', error);
    });
  }

  /**
   * Get warehouse address from database, env var, or default
   */
  private async getWarehouseAddress(region: 'us' | 'eu' = 'us'): Promise<FedExAddress> {
    // Try database first
    try {
      const result = await this.pool.query(
        `SELECT setting_value FROM region_settings 
         WHERE region = $1 AND setting_key = 'fedex_warehouse_address'`,
        [region]
      );

      if (result.rows.length > 0 && result.rows[0].setting_value) {
        const addressJson = result.rows[0].setting_value;
        try {
          const address = typeof addressJson === 'string' ? JSON.parse(addressJson) : addressJson;
          if (address && address.streetLines && address.city && address.postalCode && address.countryCode) {
            console.log(`✅ Using warehouse address from database for region: ${region}`);
            return address as FedExAddress;
          }
        } catch (parseError) {
          console.warn('Failed to parse warehouse address from database:', parseError);
        }
      }
    } catch (error) {
      console.warn('Failed to load warehouse address from database:', error);
    }

    // Fallback to environment variable
    try {
      const addressJson = process.env.FEDEX_SHIP_FROM_ADDRESS;
      if (addressJson) {
        const address = JSON.parse(addressJson);
        console.log('✅ Using warehouse address from environment variable');
        return address as FedExAddress;
      }
    } catch (error) {
      console.warn('Failed to parse FEDEX_SHIP_FROM_ADDRESS:', error);
    }

    // Fallback to hardcoded default
    console.warn('⚠️ Using hardcoded default warehouse address. Please configure in admin dashboard or environment variable.');
    return {
      streetLines: ['123 Business St'],
      city: 'Miami',
      stateOrProvinceCode: 'FL',
      postalCode: '33101',
      countryCode: 'US'
    };
  }

  /**
   * Load FedEx configuration from environment variables
   */
  private async loadConfig(): Promise<void> {
    const apiKey = process.env.FEDEX_API_KEY;
    const apiSecret = process.env.FEDEX_API_SECRET;
    const accountNumber = process.env.FEDEX_ACCOUNT_NUMBER;
    const meterNumber = process.env.FEDEX_METER_NUMBER;
    const environment = (process.env.FEDEX_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';

    console.log('🔍 FedEx Config Check:', {
      apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING',
      apiSecret: apiSecret ? 'SET' : 'MISSING',
      accountNumber: accountNumber || 'MISSING',
      environment
    });

    if (!apiKey || !apiSecret) {
      console.warn('❌ FedEx API credentials (API Key/Secret) not configured. International shipping will not work.');
      console.warn('   Please set FEDEX_API_KEY and FEDEX_API_SECRET in your .env file');
      return;
    }

    // Account number is optional for LIST rates, but required for ACCOUNT rates
    if (!accountNumber) {
      console.warn('FedEx Account Number not configured. Only LIST rates will be available (no negotiated rates).');
    }

    // Get ship-from address (default to 'us' region, will be updated per request if needed)
    const shipFromAddress = await this.getWarehouseAddress('us');

    this.config = {
      apiKey,
      apiSecret,
      accountNumber: accountNumber || '', // Allow empty for LIST-only rates
      meterNumber,
      shipFromAddress,
      environment
    };
  }

  /**
   * Get OAuth 2.0 access token from FedEx API
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.accessToken && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
      return this.accessToken;
    }

    if (!this.config) {
      throw new Error('FedEx API not configured');
    }

    const baseUrl = this.config.environment === 'sandbox'
      ? 'https://apis-sandbox.fedex.com'
      : 'https://apis.fedex.com';

    try {
      const response = await fetch(`${baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.config.apiKey,
          client_secret: this.config.apiSecret
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FedEx OAuth failed: ${response.status} ${errorText}`);
      }

      const data = await response.json() as { access_token: string; expires_in?: number };
      
      if (!data.access_token) {
        throw new Error('FedEx OAuth response missing access_token');
      }
      
      this.accessToken = data.access_token;
      
      // Set expiration (usually expires in 3600 seconds, use 3500 for safety)
      const expiresIn = data.expires_in || 3500;
      this.tokenExpiresAt = new Date(Date.now() + (expiresIn - 100) * 1000);

      return this.accessToken;
    } catch (error) {
      console.error('FedEx OAuth token request failed:', error);
      throw error;
    }
  }

  /**
   * Map package size to dimensions and weight for FedEx API
   */
  private getPackageSizeMapping(size: 'S' | 'M' | 'L'): PackageSizeMapping {
    const mappings: Record<'S' | 'M' | 'L', PackageSizeMapping> = {
      'S': {
        size: 'S',
        weight: 5.0,
        dimensions: { length: 12, width: 9, height: 2 }
      },
      'M': {
        size: 'M',
        weight: 20.0,
        dimensions: { length: 18, width: 12, height: 6 }
      },
      'L': {
        size: 'L',
        weight: 50.0,
        dimensions: { length: 30, width: 20, height: 12 }
      }
    };

    return mappings[size] || mappings['M'];
  }

  /**
   * Check if rate is cached and still valid
   */
  private async getCachedRate(
    destinationCountry: string,
    destinationPostalCode: string,
    packageSize: 'S' | 'M' | 'L',
    destinationState?: string
  ): Promise<FedExRateResult | null> {
    const cacheKey = this.generateCacheKey(
      destinationCountry,
      destinationPostalCode,
      packageSize,
      destinationState
    );

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT fedex_list_rate, fedex_negotiated_rate, fedex_rate_data, expires_at 
         FROM fedex_rate_cache 
         WHERE cache_key = $1 AND expires_at > NOW()`,
        [cacheKey]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const cached = result.rows[0];
      const rateData = cached.fedex_rate_data as any;

      if (!rateData || !rateData.rates || rateData.rates.length === 0) {
        return null;
      }

      const rate = rateData.rates[0];
      return {
        success: true,
        rates: [{
          serviceType: rate.serviceType || 'STANDARD',
          serviceName: rate.serviceName || 'FedEx Standard',
          listRate: parseFloat(cached.fedex_list_rate || '0'),
          negotiatedRate: cached.fedex_negotiated_rate ? parseFloat(cached.fedex_negotiated_rate) : undefined,
          appliedRate: cached.fedex_negotiated_rate 
            ? parseFloat(cached.fedex_negotiated_rate)
            : parseFloat(cached.fedex_list_rate) * 0.4, // 40% of list rate
          hasNegotiatedRate: !!cached.fedex_negotiated_rate,
          currency: rate.currency || 'USD',
          transitTime: rate.transitTime,
          deliveryDayOfWeek: rate.deliveryDayOfWeek
        }]
      };
    } finally {
      client.release();
    }
  }

  /**
   * Cache rate result for future use
   */
  private async cacheRate(
    destinationCountry: string,
    destinationPostalCode: string,
    packageSize: 'S' | 'M' | 'L',
    rateResult: FedExRateResult,
    destinationState?: string
  ): Promise<void> {
    if (!rateResult.success || !rateResult.rates || rateResult.rates.length === 0) {
      return;
    }

    const rate = rateResult.rates[0];
    const cacheKey = this.generateCacheKey(
      destinationCountry,
      destinationPostalCode,
      packageSize,
      destinationState
    );

    // Cache for 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO fedex_rate_cache 
         (cache_key, destination_country, destination_state, destination_postal_code, 
          package_size, package_weight, fedex_list_rate, fedex_negotiated_rate, fedex_rate_data, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (cache_key) 
         DO UPDATE SET 
           fedex_list_rate = EXCLUDED.fedex_list_rate,
           fedex_negotiated_rate = EXCLUDED.fedex_negotiated_rate,
           fedex_rate_data = EXCLUDED.fedex_rate_data,
           expires_at = EXCLUDED.expires_at`,
        [
          cacheKey,
          destinationCountry,
          destinationState || null,
          destinationPostalCode,
          packageSize,
          this.getPackageSizeMapping(packageSize).weight,
          rate.listRate,
          rate.negotiatedRate || null,
          JSON.stringify(rateResult),
          expiresAt
        ]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Generate cache key for rate lookup
   */
  private generateCacheKey(
    destinationCountry: string,
    destinationPostalCode: string,
    packageSize: 'S' | 'M' | 'L',
    destinationState?: string
  ): string {
    const parts = [
      destinationCountry,
      destinationState || '',
      destinationPostalCode,
      packageSize
    ];
    return parts.join('|');
  }

  /**
   * Build package line items from cart items
   */
  private async buildPackageLineItems(
    cartItems?: Array<{ productId: number; quantity: number; unitPrice: number }>,
    packageSize: 'S' | 'M' | 'L' = 'M'
  ): Promise<Array<{
    weight: { value: number; units: string };
    dimensions: { length: number; width: number; height: number; units: string };
  }>> {
    // If no cart items, use package size mapping
    if (!cartItems || cartItems.length === 0) {
      const mapping = this.getPackageSizeMapping(packageSize);
      return [{
        weight: { value: mapping.weight, units: 'LB' },
        dimensions: {
          length: mapping.dimensions.length,
          width: mapping.dimensions.width,
          height: mapping.dimensions.height,
          units: 'IN'
        }
      }];
    }

    // Query product package data from database
    const productIds = cartItems.map(item => item.productId);
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        `SELECT id, package_weight, package_weight_unit, package_length, package_width, package_height, package_dimension_unit, name
         FROM products 
         WHERE id = ANY($1::int[])`,
        [productIds]
      );

      const productsMap = new Map(
        result.rows.map(row => [row.id, row])
      );

      const packageLineItems: Array<{
        weight: { value: number; units: string };
        dimensions: { length: number; width: number; height: number; units: string };
      }> = [];

      // Create one package per item (repeat for quantity > 1)
      for (const item of cartItems) {
        const product = productsMap.get(item.productId);
        
        if (product && product.package_weight && product.package_length && product.package_width && product.package_height) {
          // Convert weight to lbs
          let weightLbs = product.package_weight;
          if (product.package_weight_unit === 'kg') {
            weightLbs = product.package_weight * 2.20462;
          }

          // Convert dimensions to inches
          let lengthIn = product.package_length;
          let widthIn = product.package_width;
          let heightIn = product.package_height;
          if (product.package_dimension_unit === 'cm') {
            lengthIn = product.package_length / 2.54;
            widthIn = product.package_width / 2.54;
            heightIn = product.package_height / 2.54;
          }

          // Create one package per quantity
          for (let i = 0; i < item.quantity; i++) {
            packageLineItems.push({
              weight: { value: weightLbs, units: 'LB' },
              dimensions: {
                length: lengthIn,
                width: widthIn,
                height: heightIn,
                units: 'IN'
              }
            });
          }
        } else {
          // Fallback to package size mapping if product data missing
          console.warn(`Product ${item.productId} missing package dimensions, using packageSize mapping`);
          const mapping = this.getPackageSizeMapping(packageSize);
          for (let i = 0; i < item.quantity; i++) {
            packageLineItems.push({
              weight: { value: mapping.weight, units: 'LB' },
              dimensions: {
                length: mapping.dimensions.length,
                width: mapping.dimensions.width,
                height: mapping.dimensions.height,
                units: 'IN'
              }
            });
          }
        }
      }

      if (packageLineItems.length === 0) {
        const mapping = this.getPackageSizeMapping(packageSize);
        return [{
          weight: { value: mapping.weight, units: 'LB' },
          dimensions: {
            length: mapping.dimensions.length,
            width: mapping.dimensions.width,
            height: mapping.dimensions.height,
            units: 'IN'
          }
        }];
      }

      return packageLineItems;
    } finally {
      client.release();
    }
  }

  /**
   * Build customs commodities from cart items
   */
  private async buildCustomsCommodities(
    cartItems?: Array<{ productId: number; quantity: number; unitPrice: number }>,
    packageSize: 'S' | 'M' | 'L' = 'M'
  ): Promise<Array<{
    description: string;
    quantity: number;
    weight: { value: number; units: string };
    unitPrice: { amount: number; currency: string };
    customsValue: { amount: number; currency: string };
    tariffCode?: string;
  }>> {
    // If no cart items, use default
    if (!cartItems || cartItems.length === 0) {
      const mapping = this.getPackageSizeMapping(packageSize);
      return [{
        description: 'Industrial Equipment',
        quantity: 1,
        weight: { value: mapping.weight, units: 'LB' },
        unitPrice: { amount: 0, currency: 'USD' },
        customsValue: { amount: 0, currency: 'USD' }
      }];
    }

    // Query product data from database
    const productIds = cartItems.map(item => item.productId);
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        `SELECT id, package_weight, package_weight_unit, name, tariff_code
         FROM products 
         WHERE id = ANY($1::int[])`,
        [productIds]
      );

      const productsMap = new Map(
        result.rows.map(row => [row.id, row])
      );

      const commodities: Array<{
        description: string;
        quantity: number;
        weight: { value: number; units: string };
        unitPrice: { amount: number; currency: string };
        customsValue: { amount: number; currency: string };
        tariffCode?: string;
      }> = [];

      for (const item of cartItems) {
        const product = productsMap.get(item.productId);
        const productName = product?.name || `Product ${item.productId}`;
        
        // Convert weight to lbs
        let weightLbs = product?.package_weight || this.getPackageSizeMapping(packageSize).weight;
        if (product?.package_weight_unit === 'kg') {
          weightLbs = product.package_weight * 2.20462;
        }

        commodities.push({
          description: productName,
          quantity: item.quantity,
          weight: { value: weightLbs, units: 'LB' },
          unitPrice: { amount: item.unitPrice, currency: 'USD' },
          customsValue: { amount: item.unitPrice * item.quantity, currency: 'USD' },
          tariffCode: product?.tariff_code || undefined
        });
      }

      return commodities;
    } finally {
      client.release();
    }
  }

  /**
   * Get shipping rates from FedEx API
   */
  async getRates(
    destinationAddress: FedExAddress,
    packageSize: 'S' | 'M' | 'L',
    orderValue: number = 100.00,
    cartItems?: Array<{ productId: number; quantity: number; unitPrice: number }>
  ): Promise<FedExRateResult> {
    console.log('🚀 FedEx getRates called:', { destinationAddress, packageSize });
    
    if (!this.config) {
      console.error('❌ FedEx API not configured');
      return {
        success: false,
        error: {
          code: 'CONFIG_ERROR',
          message: 'FedEx API not configured'
        }
      };
    }
    
    console.log('✅ FedEx config loaded:', {
      hasApiKey: !!this.config.apiKey,
      hasApiSecret: !!this.config.apiSecret,
      hasAccountNumber: !!this.config.accountNumber,
      environment: this.config.environment
    });

    // Only use cache if we don't have cart items (static package size)
    // When we have cart items, package count and dimensions vary, so we can't cache
    let cached: FedExRateResult | null = null;
    if (!cartItems || cartItems.length === 0) {
      cached = await this.getCachedRate(
        destinationAddress.countryCode,
        destinationAddress.postalCode,
        packageSize,
        destinationAddress.stateOrProvinceCode
      );

      if (cached) {
        console.log('✅ Using cached rate (no cart items, static package size)');
        return cached;
      }
    } else {
      console.log('⚠️ Skipping cache - cart items provided, package count/dimensions vary');
    }

    try {
      // Get access token
      const accessToken = await this.getAccessToken();
      console.log('✅ FedEx access token obtained');

      // Build package line items from cart items or use package size mapping
      const packageLineItems = await this.buildPackageLineItems(cartItems, packageSize);
      console.log(`📦 Built ${packageLineItems.length} package line items from ${cartItems?.length || 0} cart items`);
      if (cartItems && cartItems.length > 0) {
        const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        console.log(`📊 Cart items breakdown: ${cartItems.map(i => `Product ${i.productId} x${i.quantity}`).join(', ')} (Total quantity: ${totalQuantity})`);
        console.log(`📦 Package breakdown: ${packageLineItems.length} packages (expected: ${totalQuantity})`);
        if (packageLineItems.length > 0) {
          console.log(`📏 First package: ${packageLineItems[0].weight.value}${packageLineItems[0].weight.units}, ${packageLineItems[0].dimensions.length}x${packageLineItems[0].dimensions.width}x${packageLineItems[0].dimensions.height} ${packageLineItems[0].dimensions.units}`);
        }
      }

      // Check if account number is a placeholder (not a real account)
      const isPlaceholderAccount = !this.config.accountNumber || 
                                   this.config.accountNumber === 'your_fedex_account_number' ||
                                   this.config.accountNumber === '123456789';
      
      // For sandbox, FedEx requires accountNumber field even for LIST rates
      // The account number must be linked to your API credentials in Developer Portal
      // If you haven't added an account to your project, try these:
      // 1. Go to developer.fedex.com → Your Project → Add Account
      // 2. Or contact FedEx Developer Support for a test account number
      const accountNumberForRequest = isPlaceholderAccount 
        ? '604510073' // Common FedEx sandbox test account - may need to be added to your project
        : this.config.accountNumber;
      
      console.log(`🔑 Using account number: ${accountNumberForRequest} (${isPlaceholderAccount ? 'test/placeholder' : 'real'})`);
      
      // Build rate request according to FedEx API v1 format
      // FedEx expects 'recipient' (singular) not 'recipients' (plural)
      // Note: accountNumber field is REQUIRED even for LIST-only rates
      const isInternational = destinationAddress.countryCode !== 'US';
      
      // Determine region for warehouse address (default to 'us', could be enhanced to detect from destination)
      const region: 'us' | 'eu' = 'us';
      const shipFromAddress = await this.getWarehouseAddress(region);
      
      const rateRequest: any = {
        accountNumber: {
          value: accountNumberForRequest
        },
        requestedShipment: {
          shipper: {
            address: shipFromAddress
          },
          recipient: {
            address: destinationAddress
          },
          serviceType: undefined, // Let FedEx return all available services
          packagingType: 'YOUR_PACKAGING',
          pickupType: 'USE_SCHEDULED_PICKUP',
          blockInsightVisibility: false,
          rateRequestType: isPlaceholderAccount ? ['LIST'] : ['ACCOUNT', 'LIST'],
          requestedPackageLineItems: packageLineItems
        },
        rateRequestControlParameters: {
          returnTransitTimes: true,
          rateRequestType: isPlaceholderAccount ? ['LIST'] : ['ACCOUNT', 'LIST']
        }
      };

      // Add customs clearance details for international shipments
      if (isInternational) {
        const commodities = await this.buildCustomsCommodities(cartItems, packageSize);
        const totalCustomsValue = commodities.reduce((sum, c) => sum + c.customsValue.amount, 0);
        
        rateRequest.requestedShipment.customsClearanceDetail = {
          dutiesPayment: {
            paymentType: 'SENDER'
          },
          customsValue: {
            amount: totalCustomsValue || orderValue,
            currency: 'USD'
          },
          commodities: commodities
        };
      }

      // Only add payment info if we have a real account number (not placeholder)
      if (!isPlaceholderAccount && this.config.accountNumber) {
        rateRequest.requestedShipment.shippingChargesPayment = {
          paymentType: 'SENDER',
          payor: {
            responsibleParty: {
              accountNumber: {
                value: this.config.accountNumber
              }
            }
          }
        };
      }

      // Make API request
      const baseUrl = this.config.environment === 'sandbox'
        ? 'https://apis-sandbox.fedex.com'
        : 'https://apis.fedex.com';

      console.log('📦 FedEx Rate Request:', JSON.stringify(rateRequest, null, 2));
      
      const response = await fetch(`${baseUrl}/rate/v1/rates/quotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-locale': 'en_US'
        },
        body: JSON.stringify(rateRequest)
      });

      console.log(`📦 FedEx API Response Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ FedEx API error:', errorText);
        return {
          success: false,
          error: {
            code: 'API_ERROR',
            message: `FedEx API returned ${response.status}: ${errorText.substring(0, 200)}`
          }
        };
      }

      const data = await response.json() as FedExRateResponse;
      console.log('📦 FedEx API Response:', JSON.stringify(data, null, 2));

      // Parse response
      console.log('📦 Parsing FedEx response...');
      
      if (!data.output) {
        console.error('❌ No output in FedEx response');
        return {
          success: false,
          error: {
            code: 'NO_OUTPUT',
            message: 'No output in FedEx API response'
          },
          rawResponse: data
        };
      }

      // Check for alerts/errors in response
      // Only treat ERROR type alerts as failures; NOTE and WARNING are informational
      if (data.output.alerts && data.output.alerts.length > 0) {
        const errorAlerts = data.output.alerts.filter((a: any) => a.alertType === 'ERROR');
        const warningAlerts = data.output.alerts.filter((a: any) => a.alertType === 'WARNING');
        const noteAlerts = data.output.alerts.filter((a: any) => a.alertType === 'NOTE');
        
        // Log all alerts for debugging
        if (errorAlerts.length > 0) {
          console.error('❌ FedEx API ERROR alerts:', errorAlerts);
        }
        if (warningAlerts.length > 0) {
          console.warn('⚠️ FedEx API WARNING alerts:', warningAlerts);
        }
        if (noteAlerts.length > 0) {
          console.log('ℹ️ FedEx API NOTE alerts:', noteAlerts);
        }
        
        // Only fail on ERROR type alerts
        if (errorAlerts.length > 0) {
          const alertMessages = errorAlerts.map((a: any) => `${a.code}: ${a.message}`).join('; ');
          return {
            success: false,
            error: {
              code: 'API_ALERT',
              message: alertMessages
            },
            rawResponse: data
          };
        }
        
        // Log warnings but continue processing
        if (warningAlerts.length > 0) {
          console.warn('⚠️ FedEx API warnings (continuing):', warningAlerts.map((a: any) => `${a.code}: ${a.message}`).join('; '));
        }
      }

      if (!data.output.rateReplyDetails || data.output.rateReplyDetails.length === 0) {
        console.error('❌ No rate reply details in FedEx response');
        return {
          success: false,
          error: {
            code: 'NO_RATES',
            message: 'No rates returned from FedEx API'
          },
          rawResponse: data
        };
      }

      console.log(`✅ Found ${data.output.rateReplyDetails.length} rate reply details`);

      // Extract rate details
      const rateDetail = data.output.rateReplyDetails[0];
      console.log('📦 Rate detail:', JSON.stringify(rateDetail, null, 2));
      
      const ratedShipment = rateDetail.ratedShipmentDetails?.[0];

      if (!ratedShipment) {
        console.error('❌ No rated shipment details');
        return {
          success: false,
          error: {
            code: 'NO_RATE_DETAILS',
            message: 'No rated shipment details in FedEx response'
          },
          rawResponse: data
        };
      }

      console.log('📦 Rated shipment:', JSON.stringify(ratedShipment, null, 2));

      const shipmentRateDetail = ratedShipment.shipmentRateDetail;
      
      if (!shipmentRateDetail) {
        console.error('❌ No shipment rate detail');
        return {
          success: false,
          error: {
            code: 'NO_SHIPMENT_RATE_DETAIL',
            message: 'No shipment rate detail in FedEx response'
          },
          rawResponse: data
        };
      }

      // Extract rates from the response
      // FedEx returns different rate types based on rateRequestType
      // For LIST rates: totalBaseCharge is the list rate
      // For ACCOUNT rates: totalNetCharge is the negotiated rate
      
      // Use the top-level totalBaseCharge and totalNetCharge from ratedShipment
      // These are more reliable than the nested shipmentRateDetail values
      const baseCharge = ratedShipment.totalBaseCharge || shipmentRateDetail.totalBaseCharge || 0;
      const netCharge = ratedShipment.totalNetCharge || shipmentRateDetail.totalNetCharge || shipmentRateDetail.totalNetFedExCharge || 0;
      
      // List rate is always the base charge
      const listRate = baseCharge || netCharge || 0;
      
      // Check if we got a negotiated rate (account-specific rate)
      // Negotiated rate is lower than list rate when ACCOUNT rate type is requested
      const hasNegotiatedRate = netCharge > 0 && netCharge < baseCharge && baseCharge > 0;
      const negotiatedRate = hasNegotiatedRate ? netCharge : undefined;
      
      const rateRequestTypes = this.config.accountNumber ? ['ACCOUNT', 'LIST'] : ['LIST'];
      
      console.log('💰 Rate extraction:', {
        baseCharge,
        netCharge,
        listRate,
        hasNegotiatedRate,
        negotiatedRate,
        rateRequestTypes
      });

      // Calculate applied rate: negotiated if available, otherwise 40% of list rate
      const appliedRate = negotiatedRate || (listRate > 0 ? listRate * 0.4 : 0);
      
      console.log('💰 Final rates:', {
        baseCharge,
        netCharge,
        listRate,
        negotiatedRate: negotiatedRate || 'none',
        appliedRate,
        discount: negotiatedRate ? '0%' : '60% (40% of list)'
      });

      // Validate we have a valid rate
      if (appliedRate === 0 || listRate === 0) {
        console.error('❌ Invalid rate returned from FedEx: appliedRate or listRate is 0');
        return {
          success: false,
          error: {
            code: 'INVALID_RATE',
            message: 'FedEx API returned invalid rate (0). This may be a sandbox limitation.'
          },
          rawResponse: data
        };
      }

      const result: FedExRateResult = {
        success: true,
        rates: [{
          serviceType: rateDetail.serviceType || 'STANDARD',
          serviceName: rateDetail.serviceName || 'FedEx Standard',
          listRate,
          negotiatedRate,
          appliedRate,
          hasNegotiatedRate: !!negotiatedRate,
          currency: shipmentRateDetail?.currency || 'USD',
          transitTime: rateDetail.transitTime,
          deliveryDayOfWeek: rateDetail.deliveryDayOfWeek
        }],
        rawResponse: data
      };

      // Only cache if we don't have cart items (static package size)
      // When we have cart items, package count and dimensions vary, so we can't cache
      if (!cartItems || cartItems.length === 0) {
        await this.cacheRate(
          destinationAddress.countryCode,
          destinationAddress.postalCode,
          packageSize,
          result,
          destinationAddress.stateOrProvinceCode
        );
      } else {
        console.log('⚠️ Not caching rate - cart items provided, package count/dimensions vary');
      }

      return result;
    } catch (error) {
      console.error('FedEx rate request failed:', error);
      return {
        success: false,
        error: {
          code: 'REQUEST_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      };
    }
  }
}

