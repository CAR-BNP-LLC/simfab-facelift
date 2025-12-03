/**
 * Currency Utility
 * Handles region-specific currency formatting
 */

/**
 * Format currency based on region
 * @param amount - The amount to format
 * @param region - Region code ('us' or 'eu')
 * @param type - formatting type ('standard' or 'total')
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number | string, 
  region: 'us' | 'eu' = 'us', 
  type: 'standard' | 'total' = 'standard'
): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return region === 'eu' ? '€0.00' : '$0.00';
  }

  const formattedAmount = numericAmount.toFixed(2);

  if (region === 'eu') {
    const currencyString = `€${formattedAmount}`;
    return type === 'total' ? `${currencyString} (Tax Included)` : currencyString;
  }
  
  // Default to US
  return `$${formattedAmount}`;
}

