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
 * Extract high-value keywords from product data based on search query data
 * Prioritizes queries with high impressions/clicks from Google Search Console
 */
export const extractHighValueKeywords = (product: ProductWithDetails): string[] => {
  const keywords: string[] = [];
  const name = (product.name || '').toLowerCase();
  
  try {
    const categories = Array.isArray(product.categories) 
      ? product.categories.map((c: string) => c.toLowerCase())
      : (typeof product.categories === 'string' 
          ? JSON.parse(product.categories).map((c: string) => c.toLowerCase())
          : []);
    
    // DCS-related (high-performing queries: "dcs setup", "dcs cockpit")
    if (name.includes('dcs') || categories.some((c: string) => c.includes('dcs'))) {
      keywords.push('dcs setup', 'dcs cockpit', 'dcs flight sim');
    }
    
    // Helicopter (high-performing: "helicopter sim rig", "helicopter flight simulator")
    if (name.includes('helicopter') || name.includes('rotorcraft') || 
        categories.some((c: string) => c.includes('helicopter') || c.includes('rotorcraft'))) {
      keywords.push('helicopter sim rig', 'helicopter flight simulator');
    }
    
    // F-18/F-16 specific (high impressions: "f18 cockpit" has 2,493 impressions!)
    if (name.includes('f18') || name.includes('f-18') || name.includes('fa-18')) {
      keywords.push('f18 cockpit', 'f18 flight simulator', 'f-18 cockpit');
    }
    if (name.includes('f16') || name.includes('f-16')) {
      keywords.push('f16 cockpit', 'f16 flight simulator', 'f-16 cockpit');
    }
    
    // OpenWheeler (high-performing: "openwheeler" has 74 clicks, 20.79% CTR)
    if (name.includes('openwheeler') || name.includes('open wheeler')) {
      keywords.push('openwheeler', 'open wheeler');
    }
    
    // Space sim (high-performing: "space sim cockpit")
    if (name.includes('space') || categories.some((c: string) => c.includes('space'))) {
      keywords.push('space sim cockpit', 'space sim setup');
    }
  } catch (e) {
    // If parsing fails, continue with basic checks
  }
  
  return keywords;
};

/**
 * Generate SEO title for product
 * Optimized based on high-volume search queries from Google Search Console
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
    // Check if it's flight sim or racing based on categories/name
    const nameLower = productName.toLowerCase();
    const isFlightSim = nameLower.includes('flight') || 
                       (product.categories && (
                         Array.isArray(product.categories) 
                           ? product.categories.some((c: string) => c.toLowerCase().includes('flight'))
                           : product.categories.toLowerCase().includes('flight')
                       ));
    const isRacing = nameLower.includes('racing') || 
                     nameLower.includes('gen3') ||
                     (product.categories && (
                       Array.isArray(product.categories)
                         ? product.categories.some((c: string) => c.toLowerCase().includes('racing'))
                         : product.categories.toLowerCase().includes('racing')
                     ));
    
    // Use high-volume queries: "flight sim cockpit" (4,810 impressions) or "flight simulator cockpit" (5,008 impressions)
    if (isFlightSim) {
      return `${productName} | Flight Sim Cockpit | Complete System | SimFab`;
    } else if (isRacing) {
      // Use "rig" terminology (appears in queries like "sim racing rig")
      return `${productName} | Sim Racing Rig | Complete Cockpit | SimFab`;
    }
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
 * Optimized based on high-volume search queries from Google Search Console
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
  const highValueKeywords = extractHighValueKeywords(product);
  
  if (isCockpit) {
    const nameLower = productName.toLowerCase();
    const isFlightSim = nameLower.includes('flight') || 
                       (product.categories && (
                         Array.isArray(product.categories)
                           ? product.categories.some((c: string) => c.toLowerCase().includes('flight'))
                           : product.categories.toLowerCase().includes('flight')
                       ));
    const isRacing = nameLower.includes('racing') || 
                    nameLower.includes('gen3') ||
                    (product.categories && (
                      Array.isArray(product.categories)
                        ? product.categories.some((c: string) => c.toLowerCase().includes('racing'))
                        : product.categories.toLowerCase().includes('racing')
                    ));
    
    // Use high-volume query phrases: "flight sim cockpit" or "flight simulator cockpit"
    if (isFlightSim) {
      const brandText = brands.length > 0 
        ? ` Compatible with ${brands.slice(0, 3).join(', ')}, and all major flight sim brands.`
        : ' Compatible with all major flight sim brands.';
      const keywordText = highValueKeywords.length > 0 
        ? ` ${highValueKeywords[0]}.` 
        : '';
      return `Complete flight sim cockpit system. ${shortDesc || 'Includes seat, chassis, and mounting hardware. Modular design allows unlimited upgrades with add-on modules.'}${keywordText}${brandText}`;
    } else if (isRacing) {
      const brandText = brands.length > 0 
        ? ` Compatible with ${brands.slice(0, 3).join(', ')}, and all major racing wheel brands.`
        : ' Compatible with all major racing wheel brands.';
      return `Complete sim racing rig. ${shortDesc || 'Includes seat, chassis, and wheel mount. Modular design allows unlimited upgrades.'}${brandText}`;
    }
    
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
    // For accessories, check if it matches high-volume queries
    const nameLower = productName.toLowerCase();
    if (nameLower.includes('keyboard') && nameLower.includes('tray')) {
      return `${productName}. ${shortDesc || 'Articulating arm keyboard tray for flight sim and racing cockpits. Compatible with SimFab cockpits and most simulator setups.'}`;
    }
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
