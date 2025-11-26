/**
 * FedEx API Types
 * Type definitions for FedEx Rates and Transit Times API
 */

export interface FedExAddress {
  streetLines: string[];
  city: string;
  stateOrProvinceCode?: string;
  postalCode: string;
  countryCode: string;
}

export interface FedExPackageDimensions {
  length: number;
  width: number;
  height: number;
  units: 'IN' | 'CM';
}

export interface FedExWeight {
  value: number;
  units: 'LB' | 'KG';
}

export interface FedExRateRequest {
  accountNumber?: {
    value: string;
  };
  rateRequestControlParameters: {
    returnTransitTimes: boolean;
    rateRequestType: string[];
  };
  requestedShipment: {
    shipper: {
      address: FedExAddress;
    };
    recipient: {
      address: FedExAddress;
    };
    serviceType?: string;
    packagingType: string;
    pickupType: string;
    blockInsightVisibility?: boolean;
    shippingChargesPayment?: {
      paymentType: string;
      payor: {
        responsibleParty?: {
          accountNumber: string;
        };
      };
    };
    rateRequestType: string[];
    requestedPackageLineItems: Array<{
      weight: FedExWeight;
      dimensions?: FedExPackageDimensions;
      declaredValue?: {
        amount: number;
        currency: string;
      };
    }>;
  };
}

export interface FedExRateResponse {
  transactionId: string;
  customerTransactionId: string;
  output: {
    rateReplyDetails: Array<{
      serviceType: string;
      serviceName: string;
      ratedShipmentDetails: Array<{
        ratedWeightMethod: string;
        totalDiscounts: number;
        totalBaseCharge: number;
        totalNetCharge: number;
        totalNetChargeWithDutiesAndTaxes: number;
        totalDutiesAndTaxes: number;
        shipmentRateDetail: {
          rateZone: string;
          totalBillingWeight: FedExWeight;
          totalBaseCharge: number;
          totalFreightDiscounts: number;
          totalSurcharges: number;
          totalNetCharge: number;
          totalRebates: number;
          totalTaxes: number;
          totalNetFedExCharge: number;
          totalDutiesAndTaxes: number;
          rateScale: string;
          ratedWeightMethod: string;
          pricingCode: string;
          totalNetChargeWithDutiesAndTaxes: number;
          currency: string;
        };
      }>;
      commit: {
        commodityName: string;
      };
      deliveryDayOfWeek?: string;
      transitTime?: string;
      customerMessages?: Array<{
        code: string;
        message: string;
      }>;
    }>;
    alerts?: Array<{
      code: string;
      message: string;
    }>;
  };
}

export interface FedExRateResult {
  success: boolean;
  error?: {
    code: string;
    message: string;
  };
  rates?: {
    serviceType: string;
    serviceName: string;
    listRate: number; // Standard published rate
    negotiatedRate?: number; // Account-specific negotiated rate
    appliedRate: number; // Rate to charge customer (negotiated if available, or 40% of list)
    hasNegotiatedRate: boolean; // Whether "last-minute deal" is available
    currency: string;
    transitTime?: string;
    deliveryDayOfWeek?: string;
  }[];
  rawResponse?: FedExRateResponse;
}

export interface FedExConfig {
  apiKey: string;
  apiSecret: string;
  accountNumber: string; // Can be empty for LIST-only rates
  meterNumber?: string;
  shipFromAddress: FedExAddress;
  environment: 'sandbox' | 'production';
}

export interface PackageSizeMapping {
  size: 'S' | 'M' | 'L';
  weight: number; // in lbs
  dimensions: {
    length: number;
    width: number;
    height: number;
  }; // in inches
}

