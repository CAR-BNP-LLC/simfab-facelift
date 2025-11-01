/**
 * Currency utility functions
 * Returns the appropriate currency symbol based on product region
 */

/**
 * Get currency symbol based on product region
 * @param region - Product region ('us' | 'eu')
 * @returns Currency symbol ('$' for US, '€' for EU)
 */
export function getCurrencySymbol(region?: 'us' | 'eu' | string | null): string {
  if (!region) return '$'; // Default to USD
  return region.toLowerCase() === 'eu' ? '€' : '$';
}

/**
 * Format price with currency symbol based on product region
 * @param price - Price value
 * @param region - Product region ('us' | 'eu')
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted price string with currency symbol
 */
export function formatPrice(price: number | string | null | undefined, region?: 'us' | 'eu' | string | null, decimals: number = 2): string {
  const currency = getCurrencySymbol(region);
  const priceValue = typeof price === 'string' ? parseFloat(price) : (price || 0);
  return `${currency}${priceValue.toFixed(decimals)}`;
}

