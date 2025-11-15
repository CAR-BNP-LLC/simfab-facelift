import { ProductWithDetails } from '@/services/api';

/**
 * Get base URL for canonical URLs
 */
export const getBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    return 'https://simfab.com';
  }
  
  // In production, use the actual domain
  const hostname = window.location.hostname;
  if (hostname.includes('simfab.com')) {
    return `https://${hostname.replace(/^eu\./, '')}`;
  }
  
  // For development, use localhost
  return `${window.location.protocol}//${window.location.host}`;
};

/**
 * Generate canonical URL from path
 * Removes trailing slashes and query parameters
 */
export const getCanonicalUrl = (path: string): string => {
  const baseUrl = getBaseUrl();
  // Remove trailing slash and query parameters
  const cleanPath = path.replace(/\/$/, '').split('?')[0];
  return `${baseUrl}${cleanPath}`;
};

/**
 * Check if product is a base cockpit
 */
export const isBaseCockpit = (product: ProductWithDetails): boolean => {
  if (!product.categories) return false;
  
  try {
    const categories = typeof product.categories === 'string' 
      ? JSON.parse(product.categories) 
      : product.categories;
    
    if (Array.isArray(categories)) {
      return categories.some((cat: string) => 
        cat.toLowerCase().includes('cockpit') || 
        cat.toLowerCase() === 'flight-sim' ||
        cat.toLowerCase() === 'sim-racing'
      );
    }
  } catch (e) {
    // If parsing fails, check if categories string contains cockpit
    return product.categories.toLowerCase().includes('cockpit');
  }
  
  return false;
};

/**
 * Check if product is an add-on module (Flight Sim #1-13)
 */
export const isAddOnModule = (product: ProductWithDetails): boolean => {
  const name = product.name || '';
  return /Flight Sim #\d+/.test(name) || 
         /Flight Sim #\d+[A-Z]/.test(name) ||
         name.toLowerCase().includes('add-on') ||
         name.toLowerCase().includes('module');
};

/**
 * Extract compatible brands from product tags
 */
export const extractCompatibleBrands = (product: ProductWithDetails): string[] => {
  if (!product.tags) return [];
  
  try {
    const tags = typeof product.tags === 'string' 
      ? JSON.parse(product.tags) 
      : product.tags;
    
    if (Array.isArray(tags)) {
      // Filter for brand names (common brands from SEO plan)
      const brandKeywords = [
        'thrustmaster', 'logitech', 'moza', 'simagic', 'fanatec',
        'winwing', 'vkb', 'virpil', 'honeycomb', 'saitek',
        'ch products', 'realsim', 'simgears', 'mfg', 'komodo',
        'turtle beach', 'varjo', 'hori', 'red birds', 'buttkicker'
      ];
      
      return tags
        .filter((tag: string) => 
          brandKeywords.some(brand => tag.toLowerCase().includes(brand))
        )
        .slice(0, 5); // Limit to top 5
    }
  } catch (e) {
    // If parsing fails, return empty array
  }
  
  return [];
};

/**
 * Generate SEO title for product
 */
export const getProductSEOTitle = (product: ProductWithDetails): string => {
  // Use seo_title if available
  if (product.seo_title) {
    return product.seo_title;
  }
  
  const productName = product.name || 'Product';
  const isCockpit = isBaseCockpit(product);
  const isAddOn = isAddOnModule(product);
  
  if (isCockpit) {
    return `${productName} | Complete Modular Cockpit System | SimFab`;
  } else if (isAddOn) {
    const brands = extractCompatibleBrands(product);
    const brandText = brands.length > 0 ? ` | Compatible with ${brands.slice(0, 2).join(', ')}` : '';
    return `${productName} | Flight Sim Add-On Module${brandText} | SimFab`;
  } else {
    return `${productName} | Simulator Accessory | SimFab`;
  }
};

/**
 * Generate SEO description for product
 */
export const getProductSEODescription = (product: ProductWithDetails): string => {
  // Use seo_description if available
  if (product.seo_description) {
    return product.seo_description;
  }
  
  const productName = product.name || 'Product';
  const shortDesc = product.short_description || product.description || '';
  const isCockpit = isBaseCockpit(product);
  const isAddOn = isAddOnModule(product);
  const brands = extractCompatibleBrands(product);
  
  if (isCockpit) {
    const brandText = brands.length > 0 
      ? ` Compatible with ${brands.slice(0, 3).join(', ')}, and all major flight sim brands.`
      : ' Compatible with all major flight sim brands.';
    return `Complete ${productName.toLowerCase()} cockpit system. ${shortDesc || 'Modular design allows unlimited upgrades with add-on modules.'}${brandText}`;
  } else if (isAddOn) {
    const brandText = brands.length > 0 
      ? ` Compatible with ${brands.slice(0, 3).join(', ')}.`
      : '';
    return `${productName}. ${shortDesc || 'Add-on module for SimFab modular cockpits.'}${brandText} Fits all SimFab modular flight cockpits.`;
  } else {
    return `${productName}. ${shortDesc || 'Simulator accessory compatible with SimFab cockpits and most simulator setups.'}`;
  }
};

/**
 * Get absolute image URL
 */
export const getAbsoluteImageUrl = (imageUrl: string | null | undefined): string | undefined => {
  if (!imageUrl) return undefined;
  
  // If already absolute URL, return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // If relative URL, make it absolute
  const baseUrl = getBaseUrl();
  return `${baseUrl}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
};
