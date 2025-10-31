/**
 * Centralized Price Calculator
 * 
 * This utility provides a single source of truth for price calculations
 * across the entire application. It handles:
 * - Base product price
 * - Native variations of main product
 * - Required bundle items (variation price changes only)
 * - Optional bundle items (base price + variation changes)
 * - Required/optional addons
 */

export interface PriceCalculationInput {
  // Base product data
  basePrice: number;
  
  // Native variations
  variationAdjustments: number;
  
  // Required bundle items (only variation adjustments, no base price)
  requiredBundleAdjustments: number;
  
  // Optional bundle items (base price + variation adjustments)
  optionalBundleItems: Array<{
    basePrice: number;
    variationAdjustments: number;
  }>;
  
  // Addons (both required and optional)
  addonsTotal: number;
  
  // Quantity
  quantity?: number;
}

export interface PriceCalculationResult {
  basePrice: number;
  variationAdjustments: number;
  requiredBundleAdjustments: number;
  optionalBundleAdjustments: number;
  optionalBundleBasePrice: number;
  addonsTotal: number;
  subtotal: number;
  quantity: number;
  total: number;
  breakdown: {
    base: number;
    variations: number;
    requiredBundleAdjustments: number;
    optionalBundleAdjustments: number;
    optionalBundleBasePrice: number;
    addons: number;
  };
}

/**
 * Calculate total price from all components
 */
export function calculateTotalPrice(input: PriceCalculationInput): PriceCalculationResult {
  const quantity = input.quantity || 1;
  
  // Calculate optional bundle totals
  const optionalBundleBasePrice = input.optionalBundleItems.reduce(
    (sum, item) => sum + item.basePrice, 
    0
  );
  
  const optionalBundleAdjustments = input.optionalBundleItems.reduce(
    (sum, item) => sum + item.variationAdjustments, 
    0
  );
  
  // Calculate subtotal (before quantity)
  const subtotal = 
    input.basePrice + 
    input.variationAdjustments + 
    input.requiredBundleAdjustments + 
    optionalBundleBasePrice + 
    optionalBundleAdjustments + 
    input.addonsTotal;
  
  // Calculate final total
  const total = subtotal * quantity;
  
  return {
    basePrice: input.basePrice,
    variationAdjustments: input.variationAdjustments,
    requiredBundleAdjustments: input.requiredBundleAdjustments,
    optionalBundleAdjustments,
    optionalBundleBasePrice,
    addonsTotal: input.addonsTotal,
    subtotal: Math.round(subtotal * 100) / 100,
    quantity,
    total: Math.round(total * 100) / 100,
    breakdown: {
      base: input.basePrice,
      variations: input.variationAdjustments,
      requiredBundleAdjustments: input.requiredBundleAdjustments,
      optionalBundleAdjustments,
      optionalBundleBasePrice,
      addons: input.addonsTotal
    }
  };
}

/**
 * Helper to format price breakdown for display
 */
export function formatPriceBreakdown(result: PriceCalculationResult): {
  label: string;
  value: number;
  type: 'base' | 'adjustment' | 'total';
}[] {
  const breakdown = [];
  
  // Base price
  breakdown.push({
    label: 'Base Price',
    value: result.basePrice,
    type: 'base'
  });
  
  // Variations
  if (result.variationAdjustments !== 0) {
    breakdown.push({
      label: 'Product Variations',
      value: result.variationAdjustments,
      type: 'adjustment'
    });
  }
  
  // Required bundle adjustments
  if (result.requiredBundleAdjustments !== 0) {
    breakdown.push({
      label: 'Required Items Adjustments',
      value: result.requiredBundleAdjustments,
      type: 'adjustment'
    });
  }
  
  // Optional bundle base prices
  if (result.optionalBundleBasePrice > 0) {
    breakdown.push({
      label: 'Optional Items',
      value: result.optionalBundleBasePrice,
      type: 'base'
    });
  }
  
  // Optional bundle adjustments
  if (result.optionalBundleAdjustments !== 0) {
    breakdown.push({
      label: 'Optional Items Variations',
      value: result.optionalBundleAdjustments,
      type: 'adjustment'
    });
  }
  
  // Addons
  if (result.addonsTotal > 0) {
    breakdown.push({
      label: 'Addons',
      value: result.addonsTotal,
      type: 'base'
    });
  }
  
  return breakdown;
}





