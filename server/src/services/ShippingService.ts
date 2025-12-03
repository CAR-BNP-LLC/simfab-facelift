/**
 * Shipping Service (Backend)
 * Handles shipping calculation for all destination types
 */

import { Pool } from 'pg';
import { FedExService } from './FedExService';
import { FedExAddress } from '../types/fedex';
import { ShippingMethod } from '../types/cart';
import { isEuropeanCountry } from '../utils/europeanCountries';

export interface ShippingCalculation {
  method: string;
  price: number | null; // null indicates quote required (no price to display)
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

export interface CartItem {
  productId: number;
  quantity: number;
  unitPrice: number;
}

export interface CalculateShippingRequest {
  country: string;
  state?: string;
  orderTotal: number;
  packageSize?: 'S' | 'M' | 'L'; // Optional - will be auto-determined if not provided
  cartItems?: CartItem[];
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
   * Calculate total weight in kg from cart items
   * Default weight for items without weight is 1 kg
   */
  private async calculateTotalWeightInKg(cartItems?: CartItem[]): Promise<number> {
    if (!cartItems || cartItems.length === 0) {
      return 0;
    }

    const client = await this.pool.connect();
    try {
      const productIds = cartItems.map(item => item.productId);
      
      const result = await client.query(
        `SELECT id, package_weight, package_weight_unit
         FROM products 
         WHERE id = ANY($1::int[])`,
        [productIds]
      );

      const productsMap = new Map(
        result.rows.map(row => [row.id, row])
      );

      let totalWeightKg = 0;

      for (const item of cartItems) {
        const product = productsMap.get(item.productId);
        let itemWeightKg = 1; // Default 1 kg

        if (product && product.package_weight) {
          if (product.package_weight_unit === 'kg') {
            itemWeightKg = parseFloat(product.package_weight);
          } else if (product.package_weight_unit === 'lb' || product.package_weight_unit === 'lbs') {
            itemWeightKg = parseFloat(product.package_weight) * 0.453592;
          } else {
             // Assume lbs if no unit or unknown unit, as per standard
             itemWeightKg = parseFloat(product.package_weight) * 0.453592;
          }
        }

        totalWeightKg += itemWeightKg * item.quantity;
      }

      return totalWeightKg;
    } catch (error) {
      console.error('Error calculating weight:', error);
      // Fallback: assume 1 kg per item
      return cartItems.reduce((total, item) => total + (1 * item.quantity), 0);
    } finally {
      client.release();
    }
  }

  /**
   * Calculate shipping for European countries based on weight
   */
  private async calculateEuropeanShipping(cartItems?: CartItem[]): Promise<ShippingCalculation[]> {
    const totalWeightKg = await this.calculateTotalWeightInKg(cartItems);
    let price = 0;

    if (totalWeightKg < 5) {
      price = 15;
    } else if (totalWeightKg < 15) {
      price = 40;
    } else if (totalWeightKg < 30) {
      price = 50;
    } else if (totalWeightKg < 60) {
      price = 70;
    } else {
      // >= 60 kg (includes >= 200 kg capped at same price)
      price = 100;
    }

    return [{
      method: 'europe_weight_based',
      price: price,
      estimatedDays: '',
      isAvailable: true,
      carrier: 'SimFab EU'
    }];
  }

  /**
   * Calculate shipping for international destinations using FedEx API
   */
  private async calculateInternational(
    destinationAddress: FedExAddress,
    packageSize: 'S' | 'M' | 'L',
    orderTotal: number,
    cartItems?: CartItem[]
  ): Promise<ShippingCalculation[]> {
    try {
      const fedExResult = await this.fedExService.getRates(destinationAddress, packageSize, orderTotal, cartItems);

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
            price: null, // Use null instead of 0 to indicate no price should be shown
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
            price: null, // Use null instead of 0 to indicate no price should be shown
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
          price: null, // Use null instead of 0 to indicate no price should be shown
          estimatedDays: 'Contact for quote',
          isAvailable: true,
          carrier: 'FedEx',
          fedexRateData: undefined,
          requiresManualQuote: true
        }];
      }

      if (!fedExResult.rates || fedExResult.rates.length === 0) {
        // No rates returned - show quote required
        return [{
          method: 'international_quote',
          price: null, // Use null instead of 0 to indicate no price should be shown
          estimatedDays: 'Contact for quote',
          isAvailable: true,
          carrier: 'FedEx',
          fedexRateData: undefined,
          requiresManualQuote: true
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
        price: null, // Use null instead of 0 to indicate no price should be shown
        estimatedDays: 'Contact for quote',
        isAvailable: true,
        carrier: 'FedEx',
        fedexRateData: undefined,
        requiresManualQuote: true
      }];
    }
  }

  /**
   * Determine package size from cart items based on product dimensions
   * Returns 'S', 'M', or 'L' based on largest dimension or total volume
   */
  async determinePackageSize(cartItems?: CartItem[]): Promise<'S' | 'M' | 'L'> {
    // Default to Medium if no cart items
    if (!cartItems || cartItems.length === 0) {
      return 'M';
    }

    const client = await this.pool.connect();
    try {
      const productIds = cartItems.map(item => item.productId);
      
      // Query product package dimensions
      const result = await client.query(
        `SELECT id, package_length, package_width, package_height, package_dimension_unit,
                package_weight, package_weight_unit
         FROM products 
         WHERE id = ANY($1::int[])`,
        [productIds]
      );

      const productsMap = new Map(
        result.rows.map(row => [row.id, row])
      );

      let maxLength = 0;
      let maxWidth = 0;
      let maxHeight = 0;
      let totalWeight = 0;

      // Calculate aggregate dimensions and weight from all items
      for (const item of cartItems) {
        const product = productsMap.get(item.productId);
        
        if (product && product.package_length && product.package_width && product.package_height) {
          // Convert dimensions to inches
          let lengthIn = product.package_length;
          let widthIn = product.package_width;
          let heightIn = product.package_height;
          
          if (product.package_dimension_unit === 'cm') {
            lengthIn = product.package_length / 2.54;
            widthIn = product.package_width / 2.54;
            heightIn = product.package_height / 2.54;
          }

          // Multiply by quantity for this item
          for (let i = 0; i < item.quantity; i++) {
            maxLength = Math.max(maxLength, lengthIn);
            maxWidth = Math.max(maxWidth, widthIn);
            maxHeight = Math.max(maxHeight, heightIn);
          }

          // Calculate weight
          if (product.package_weight) {
            let weightLbs = product.package_weight;
            if (product.package_weight_unit === 'kg') {
              weightLbs = product.package_weight * 2.20462;
            }
            totalWeight += weightLbs * item.quantity;
          }
        }
      }

      // If no dimensions found, default to Medium
      if (maxLength === 0 && maxWidth === 0 && maxHeight === 0) {
        return 'M';
      }

      // Determine package size based on largest dimension
      // Small: max dimension < 12 inches
      // Medium: max dimension 12-24 inches
      // Large: max dimension > 24 inches
      const maxDimension = Math.max(maxLength, maxWidth, maxHeight);
      
      if (maxDimension < 12) {
        return 'S';
      } else if (maxDimension <= 24) {
        return 'M';
      } else {
        return 'L';
      }
    } catch (error) {
      console.error('Error determining package size:', error);
      // Default to Medium on error
      return 'M';
    } finally {
      client.release();
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
    const { country, state, orderTotal, packageSize: providedPackageSize, shippingAddress, cartItems } = request;
    
    // Auto-determine package size if not provided
    let packageSize: 'S' | 'M' | 'L' = providedPackageSize || 'M';
    if (!providedPackageSize && cartItems && cartItems.length > 0) {
      packageSize = await this.determinePackageSize(cartItems);
    }

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

    // Europe (Weight based)
    if (isEuropeanCountry(country)) {
      return this.calculateEuropeanShipping(cartItems);
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

      return await this.calculateInternational(destinationAddress, packageSize, orderTotal, request.cartItems);
    }

    // Fallback if address not provided
    return [{
      method: 'international_quote',
      price: null, // Use null instead of 0 to indicate no price should be shown
      estimatedDays: 'Contact for quote',
      isAvailable: true,
      carrier: 'FedEx',
      requiresManualQuote: true
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
      cost: calculation.price ?? 0, // Use 0 if price is null, but we'll check requiresManualQuote in frontend
      estimatedDays,
      description: calculation.estimatedDays,
      requiresManualQuote: calculation.requiresManualQuote || false
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
      'europe_weight_based': 'Standard Shipping',
      'international_fedex': 'International Shipping (FedEx)',
      'international_quote': 'International Shipping - Quote Required'
    };

    return names[method] || 'Shipping';
  }
}

