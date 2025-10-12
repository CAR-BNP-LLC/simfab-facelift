/**
 * Product Management Types
 * Complete type definitions for products, variations, add-ons, and configurations
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum ProductType {
  SIMPLE = 'simple',
  VARIABLE = 'variable',
  CONFIGURABLE = 'configurable'
}

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft'
}

export enum VariationType {
  MODEL = 'model',
  DROPDOWN = 'dropdown',
  COLOR = 'color'
}

export enum ContentType {
  TEXT = 'text',
  IMAGES = 'images',
  MIXED = 'mixed'
}

// ============================================================================
// CORE PRODUCT TYPES
// ============================================================================

export interface Product {
  id: number;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  type: ProductType;
  status: ProductStatus;
  featured: boolean;
  
  // Pricing
  price_min: number | null;
  price_max: number | null;
  regular_price: number | null;
  sale_price: number | null;
  
  // Physical attributes
  weight_lbs: number | null;
  length_in: number | null;
  width_in: number | null;
  height_in: number | null;
  
  // Inventory (using actual database column names)
  stock: number; // Database uses 'stock' not 'stock_quantity'
  low_stock_amount: number; // Database uses 'low_stock_amount'
  in_stock: string; // Database uses string '1' or '0'
  
  // Shipping
  tax_class: string | null;
  shipping_class: string | null;
  
  // Metadata
  categories: string | null; // Database stores as JSON string
  tags: string | null; // Database stores as JSON string
  meta_data: Record<string, any> | null;
  
  // SEO
  seo_title: string | null;
  seo_description: string | null;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

export interface ProductImage {
  id: number;
  product_id: number;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: Date;
}

export interface ProductColor {
  id: number;
  product_id: number;
  color_name: string;
  color_code: string | null;
  color_image_url: string | null;
  is_available: boolean;
  sort_order: number;
  created_at: Date;
}

export interface ProductVariation {
  id: number;
  product_id: number;
  variation_type: VariationType;
  name: string;
  description: string | null;
  is_required: boolean;
  sort_order: number;
  created_at: Date;
}

export interface VariationOption {
  id: number;
  variation_id: number;
  option_name: string;
  option_value: string;
  price_adjustment: number;
  image_url: string | null;
  is_default: boolean;
  sort_order: number;
  created_at: Date;
}

export interface ProductAddon {
  id: number;
  product_id: number;
  name: string;
  description: string | null;
  base_price: number | null;
  price_range_min: number | null;
  price_range_max: number | null;
  is_required: boolean;
  has_options: boolean;
  sort_order: number;
  created_at: Date;
}

export interface AddonOption {
  id: number;
  addon_id: number;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
  created_at: Date;
}

export interface ProductFAQ {
  id: number;
  product_id: number;
  question: string;
  answer: string;
  sort_order: number;
  created_at: Date;
}

export interface AssemblyManual {
  id: number;
  product_id: number;
  name: string;
  description: string | null;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  image_url: string | null;
  sort_order: number;
  created_at: Date;
}

export interface ProductAdditionalInfo {
  id: number;
  product_id: number;
  title: string;
  description: string | null;
  content_type: ContentType;
  content_data: Record<string, any> | null;
  sort_order: number;
  created_at: Date;
}

// ============================================================================
// COMPOSITE TYPES (Product with Relations)
// ============================================================================

export interface ProductWithDetails extends Product {
  images: ProductImage[];
  colors: ProductColor[];
  variations: {
    model: (ProductVariation & { options: VariationOption[] })[];
    dropdown: (ProductVariation & { options: VariationOption[] })[];
  };
  addons: (ProductAddon & { options: AddonOption[] })[];
  faqs: ProductFAQ[];
  assemblyManuals: AssemblyManual[];
  additionalInfo: ProductAdditionalInfo[];
  rating?: {
    average: number;
    count: number;
  };
}

// ============================================================================
// QUERY & FILTER TYPES
// ============================================================================

export interface ProductFilters {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
  status?: ProductStatus;
  tags?: string[];
}

export interface ProductSortOptions {
  sortBy?: 'name' | 'price' | 'created_at' | 'featured' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

export interface ProductQueryOptions extends ProductFilters, ProductSortOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedProducts {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  filters?: {
    categories: { id: string; name: string; count: number }[];
    priceRange: { min: number; max: number };
  };
}

// ============================================================================
// PRICE CALCULATION TYPES
// ============================================================================

export interface ProductConfiguration {
  colorId?: number;
  modelVariationId?: number;
  dropdownSelections?: Record<number, number>; // variationId -> optionId
  addons?: Array<{
    addonId: number;
    optionId?: number;
  }>;
}

export interface PriceBreakdown {
  basePrice: number;
  colorAdjustment?: number;
  variationAdjustments: Array<{
    name: string;
    amount: number;
  }>;
  addonsTotal: number;
  subtotal: number;
  quantity: number;
  total: number;
  currency: string;
}

export interface PriceCalculation {
  pricing: PriceBreakdown;
  breakdown: {
    base: number;
    variations: number;
    addons: number;
  };
}

// ============================================================================
// CREATE/UPDATE TYPES (DTOs)
// ============================================================================

export interface CreateProductDto {
  sku: string;
  name: string;
  slug?: string;
  description?: string;
  short_description?: string;
  type: ProductType;
  status?: ProductStatus;
  featured?: boolean;
  
  // Pricing
  regular_price: number;
  sale_price?: number;
  sale_start_date?: Date;
  sale_end_date?: Date;
  
  // Physical
  weight_lbs?: number;
  length_in?: number;
  width_in?: number;
  height_in?: number;
  
  // Inventory
  stock_quantity?: number;
  low_stock_threshold?: number;
  manage_stock?: boolean;
  allow_backorders?: boolean;
  
  // Shipping
  requires_shipping?: boolean;
  tax_class?: string;
  shipping_class?: string;
  
  // Metadata
  categories?: string[];
  tags?: string[];
  meta_data?: Record<string, any>;
  
  // SEO
  seo_title?: string;
  seo_description?: string;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  id: number;
}

export interface CreateVariationDto {
  product_id: number;
  variation_type: VariationType;
  name: string;
  description?: string;
  is_required?: boolean;
  sort_order?: number;
  options: Array<{
    option_name: string;
    option_value: string;
    price_adjustment?: number;
    image_url?: string;
    is_default?: boolean;
  }>;
}

export interface CreateAddonDto {
  product_id: number;
  name: string;
  description?: string;
  base_price?: number;
  price_range_min?: number;
  price_range_max?: number;
  is_required?: boolean;
  has_options?: boolean;
  sort_order?: number;
  options?: Array<{
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    is_available?: boolean;
  }>;
}

export interface CreateColorDto {
  product_id: number;
  color_name: string;
  color_code?: string;
  color_image_url?: string;
  is_available?: boolean;
  sort_order?: number;
}

// ============================================================================
// SEARCH TYPES
// ============================================================================

export interface ProductSearchResult extends Product {
  matchScore: number;
  matchedFields: string[];
}

export interface SearchResults {
  query: string;
  results: ProductSearchResult[];
  suggestions: string[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================================
// ADMIN TYPES
// ============================================================================

export interface ProductListItem extends Product {
  imageUrl?: string;
  categoryNames?: string[];
  salesCount?: number;
  revenue?: number;
}

export interface BulkUpdateProducts {
  productIds: number[];
  updates: Partial<UpdateProductDto>;
}

