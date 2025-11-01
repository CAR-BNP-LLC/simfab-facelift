/**
 * Shipping Service (Backend)
 * Handles shipping calculation for all destination types
 */

import { Pool } from 'pg';
import { FedExService } from './FedExService';
import { FedExAddress } from '../types/fedex';
import { ShippingMethod } from '../types/cart';

export interface ShippingCalculation {
  method: string;
  price: number;
  estimatedDays: string;
  isAvailable: boolean;
  carrier?: string;
  serviceType?: string;
  requiresManualQuote?: boolean;
  quoteReason?: string;
  fedexRateData?: {
    listRate: number;
    negotiatedRate?: number;
    hasNegotiatedRate: boolean;
    discountPercent?: number;
  };
}

export interface CalculateShippingRequest {
  country: string;
  state?: string;
  orderTotal: number;
  packageSize: 'S' | 'M' | 'L';
}

export class ShippingService {
  private pool: Pool;
  private fedExService: FedExService;

  constructor(pool: Pool) {
    this.pool = pool;
    this.fedExService = new FedExService(pool);
  }

  /**
   * Calculate shipping for US domestic (excluding Alaska & Hawaii)
   */
  private calculateUSDomestic(orderTotal: number): ShippingCalculation[] {
    const results: ShippingCalculation[] = [];

    if (orderTotal >= 50) {
      results.push({
        method: 'us_free',
        price: 0,
        estimatedDays: '5-7 business days',
        isAvailable: true,
        carrier: 'USPS'
      });
    } else {
      results.push({
        method: 'us_standard',
        price: 9.99,
        estimatedDays: '5-7 business days',
        isAvailable: true,
        carrier: 'USPS'
      });
    }

    return results;
  }

  /**
   * Calculate shipping for US territories (Alaska & Hawaii)
   */
  private calculateUSTerritories(packageSize: 'S' | 'M' | 'L'): ShippingCalculation[] {
    const territoryPricing = {
      'S': 30,
      'M': 50,
      'L': 150
    };

    return [{
      method: `us_territories_${packageSize.toLowerCase()}`,
      price: territoryPricing[packageSize],
      estimatedDays: '7-10 business days',
      isAvailable: true,
      carrier: 'USPS'
    }];
  }

  /**
   * Calculate shipping for Canada
   */
  private calculateCanada(packageSize: 'S' | 'M' | 'L'): ShippingCalculation[] {
    const canadaPricing = {
      'S': 35,
      'M': 100,
      'L': 200
    };

    return [{
      method: `canada_${packageSize.toLowerCase()}`,
      price: canadaPricing[packageSize],
      estimatedDays: '7-14 business days',
      isAvailable: true,
      carrier: 'USPS'
    }];
  }

  /**
   * Calculate shipping for international destinations using FedEx API
   */
  private async calculateInternational(
    destinationAddress: FedExAddress,
    packageSize: 'S' | 'M' | 'L',
    orderTotal: number
  ): Promise<ShippingCalculation[]> {
    try {
      const fedExResult = await this.fedExService.getRates(destinationAddress, packageSize, orderTotal);

      // Check for specific errors that mean we need a quote
      if (!fedExResult.success) {
        const errorCode = fedExResult.error?.code;
        console.log(`⚠️ FedEx rate request failed: ${errorCode} - ${fedExResult.error?.message}`);
        
        // These errors mean we need a real account number - show quote required
        if (errorCode === 'ACCOUNT.NUMBER.MISMATCH' || 
            errorCode === 'RATE.ACCOUNTNUMBER.REQUIRED' ||
            errorCode === 'CONFIG_ERROR') {
          console.log('ℹ️ FedEx account number not configured or not linked. Showing quote required option.');
          return [{
            method: 'international_quote',
            price: 0,
            estimatedDays: 'Contact for quote',
            isAvailable: true,
            carrier: 'FedEx',
            fedexRateData: undefined,
            requiresManualQuote: true,
            quoteReason: 'FedEx account number required. Please contact support for shipping quote.'
          }];
        }
        
        // Postal code not found - sandbox limitation or invalid format
        if (errorCode === 'ENTERED.ZIPCODE.NOTFOUND' || errorCode === 'INVALID.ADDRESS') {
          console.log('ℹ️ FedEx postal code/address not found. This may be a sandbox limitation. Showing quote required option.');
          return [{
            method: 'international_quote',
            price: 0,
            estimatedDays: 'Contact for quote',
            isAvailable: true,
            carrier: 'FedEx',
            fedexRateData: undefined,
            requiresManualQuote: true,
            quoteReason: 'Address not recognized. Please contact support for shipping quote.'
          }];
        }
        
        // Other errors - still show quote required
        return [{
          method: 'international_quote',
          price: 0,
          estimatedDays: 'Contact for quote',
          isAvailable: true,
          carrier: 'FedEx',
          fedexRateData: undefined
        }];
      }

      if (!fedExResult.rates || fedExResult.rates.length === 0) {
        // No rates returned - show quote required
        return [{
          method: 'international_quote',
          price: 0,
          estimatedDays: 'Contact for quote',
          isAvailable: true,
          carrier: 'FedEx',
          fedexRateData: undefined
        }];
      }

      const rate = fedExResult.rates[0];
      
      // Calculate discount percentage if charging 40% of list rate
      const discountPercent = rate.hasNegotiatedRate 
        ? undefined // No discount when negotiated rate is available
        : 60; // 60% discount = charging 40% of list rate

      return [{
        method: 'international_fedex',
        price: rate.appliedRate,
        estimatedDays: rate.transitTime || '7-14 business days',
        isAvailable: true,
        carrier: 'FedEx',
        serviceType: rate.serviceType,
        fedexRateData: {
          listRate: rate.listRate,
          negotiatedRate: rate.negotiatedRate,
          hasNegotiatedRate: rate.hasNegotiatedRate,
          discountPercent
        }
      }];
    } catch (error) {
      console.error('FedEx rate calculation failed:', error);
      // Return quote required option on error
      return [{
        method: 'international_quote',
        price: 0,
        estimatedDays: 'Contact for quote',
        isAvailable: true,
        carrier: 'FedEx',
        fedexRateData: undefined
      }];
    }
  }

  /**
   * Calculate shipping based on destination
   */
  async calculateShipping(request: CalculateShippingRequest & {
    shippingAddress?: {
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state?: string;
      postalCode: string;
      country: string;
    };
  }): Promise<ShippingCalculation[]> {
    const { country, state, orderTotal, packageSize, shippingAddress } = request;

    // US Domestic (excluding Alaska & Hawaii)
    if (country === 'US' && state && !['AK', 'HI'].includes(state)) {
      return this.calculateUSDomestic(orderTotal);
    }

    // US Territories (Alaska & Hawaii)
    if (country === 'US' && state && ['AK', 'HI'].includes(state)) {
      return this.calculateUSTerritories(packageSize);
    }

    // Canada
    if (country === 'CA') {
      return this.calculateCanada(packageSize);
    }

    // International - Use FedEx API
    if (shippingAddress) {
      // For international addresses, FedEx may not require state field
      // Some countries (like Bulgaria) don't have states
      const destinationAddress: FedExAddress = {
        streetLines: [
          shippingAddress.addressLine1,
          ...(shippingAddress.addressLine2 ? [shippingAddress.addressLine2] : [])
        ],
        city: shippingAddress.city,
        // Only include state if country is US, CA, or other countries that use states
        // For most international addresses, omit state field
        stateOrProvinceCode: (shippingAddress.country === 'US' || shippingAddress.country === 'CA') 
          ? shippingAddress.state || undefined 
          : undefined,
        postalCode: shippingAddress.postalCode,
        countryCode: shippingAddress.country
      };

      return await this.calculateInternational(destinationAddress, packageSize, orderTotal);
    }

    // Fallback if address not provided
    return [{
      method: 'international_quote',
      price: 0,
      estimatedDays: 'Contact for quote',
      isAvailable: true,
      carrier: 'FedEx'
    }];
  }

  /**
   * Convert ShippingCalculation to ShippingMethod format for API responses
   */
  static toShippingMethod(calculation: ShippingCalculation): ShippingMethod {
    // Parse estimated days to extract min/max
    const daysMatch = calculation.estimatedDays.match(/(\d+)-(\d+)/);
    const estimatedDays = daysMatch 
      ? { min: parseInt(daysMatch[1]), max: parseInt(daysMatch[2]) }
      : { min: 7, max: 14 }; // Default fallback

    return {
      id: calculation.method,
      name: this.getShippingMethodName(calculation.method),
      carrier: calculation.carrier || 'Unknown',
      serviceCode: calculation.serviceType || calculation.method,
      cost: calculation.price,
      estimatedDays,
      description: calculation.estimatedDays
    };
  }

  /**
   * Get human-readable shipping method name
   */
  private static getShippingMethodName(method: string): string {
    const names: Record<string, string> = {
      'us_free': 'Free Shipping',
      'us_standard': 'Standard Shipping',
      'us_territories_s': 'Alaska/Hawaii - Small Package',
      'us_territories_m': 'Alaska/Hawaii - Medium Package',
      'us_territories_l': 'Alaska/Hawaii - Large Package',
      'canada_s': 'Canada - Small Package',
      'canada_m': 'Canada - Medium Package',
      'canada_l': 'Canada - Large Package',
      'international_fedex': 'International Shipping (FedEx)',
      'international_quote': 'International Shipping - Quote Required'
    };

    return names[method] || 'Shipping';
  }
}

