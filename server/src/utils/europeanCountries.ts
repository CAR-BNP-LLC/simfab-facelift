/**
 * European Countries Utility
 * Determines if a country code belongs to a European country
 * Includes EU member states, EEA countries, and other European countries
 */

/**
 * Check if a country code (ISO 2-letter) is a European country
 * @param countryCode - ISO 2-letter country code (e.g., 'DE', 'US', 'GB')
 * @returns true if the country is in Europe, false otherwise
 */
export function isEuropeanCountry(countryCode: string): boolean {
  if (!countryCode || typeof countryCode !== 'string') {
    return false;
  }

  const normalizedCode = countryCode.toUpperCase().trim();

  // EU 27 member states
  const euCountries = [
    'AT', // Austria
    'BE', // Belgium
    'BG', // Bulgaria
    'HR', // Croatia
    'CY', // Cyprus
    'CZ', // Czech Republic
    'DK', // Denmark
    'EE', // Estonia
    'FI', // Finland
    'FR', // France
    'DE', // Germany
    'GR', // Greece
    'HU', // Hungary
    'IE', // Ireland
    'IT', // Italy
    'LV', // Latvia
    'LT', // Lithuania
    'LU', // Luxembourg
    'MT', // Malta
    'NL', // Netherlands
    'PL', // Poland
    'PT', // Portugal
    'RO', // Romania
    'SK', // Slovakia
    'SI', // Slovenia
    'ES', // Spain
    'SE', // Sweden
  ];

  // EEA countries (European Economic Area)
  const eeaCountries = [
    'IS', // Iceland
    'LI', // Liechtenstein
    'NO', // Norway
  ];

  // Other European countries
  const otherEuropeanCountries = [
    'GB', // United Kingdom
    'CH', // Switzerland
    'AL', // Albania
    'AD', // Andorra
    'BY', // Belarus
    'BA', // Bosnia and Herzegovina
    'XK', // Kosovo
    'MD', // Moldova
    'MC', // Monaco
    'ME', // Montenegro
    'MK', // North Macedonia
    'RU', // Russia
    'SM', // San Marino
    'RS', // Serbia
    'TR', // Turkey
    'UA', // Ukraine
    'VA', // Vatican City
  ];

  // Combine all European countries
  const allEuropeanCountries = [
    ...euCountries,
    ...eeaCountries,
    ...otherEuropeanCountries,
  ];

  return allEuropeanCountries.includes(normalizedCode);
}

