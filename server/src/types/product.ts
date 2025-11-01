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
  TEXT = 'text',
  DROPDOWN = 'dropdown',
  IMAGE = 'image',
  BOOLEAN = 'boolean'
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
  
  // Region support
  region: 'us' | 'eu'; // Region where product is available
  product_group_id: string | null; // UUID linking related products across regions
  
  // Pricing
  price_min: number | null;
  price_max: number | null;
  regular_price: number | null;
  sale_price: number | null;
  
  // Discount fields
  is_on_sale: boolean;
  sale_start_date: Date | null;
  sale_end_date: Date | null;
  sale_label: string | null;
  
  // Physical attributes
  weight_lbs: number | null;
  length_in: number | null;
  width_in: number | null;
  height_in: number | null;
  
  // Inventory (using actual database column names)
  stock: number; // Database uses 'stock' not 'stock_quantity'
  low_stock_amount: number; // Database uses 'low_stock_amount'
  in_stock: string; // Database uses string '1' or '0'
  is_bundle: boolean; // If true, this product contains other products
  
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

// Extended Product interface for queries that include images
export interface ProductWithImages extends Product {
  images: ProductImage[];
  review_count?: number;
  rating_average?: number;
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

export interface ProductVariation {
  id: number;
  product_id: number;
  variation_type: VariationType;
  name: string;
  description: string | null;
  is_required: boolean;
  tracks_stock: boolean; // If true, each option has separate stock
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
  
  // Stock tracking fields
  stock_quantity: number | null; // Stock available for this specific option
  low_stock_threshold: number | null;
  reserved_quantity: number; // Currently reserved in pending orders
  is_available: boolean | null; // For backwards compatibility
  
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
  variations: {
    text: (ProductVariation & { options: VariationOption[] })[];
    dropdown: (ProductVariation & { options: VariationOption[] })[];
    image: (ProductVariation & { options: VariationOption[] })[];
    boolean: (ProductVariation & { options: VariationOption[] })[];
  };
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
  region?: 'us' | 'eu'; // Filter by region (US or EU)
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
  products: ProductWithImages[];
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
  modelVariationId?: number;
  dropdownSelections?: Record<number, number>; // variationId -> optionId
  variations?: Record<number, number>; // variationId -> optionId (new variations system)
  bundleItems?: {
    selectedOptional?: number[]; // Array of optional bundle item IDs
    configurations?: Record<number, any>; // bundleItemId -> { variationId: optionId }
  };
}

export interface PriceBreakdown {
  basePrice: number;
  variationAdjustments: Array<{
    name: string;
    amount: number;
  }>;
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
    requiredBundleAdjustments?: number;
    optionalBundleTotal?: number;
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
  
  // Region support
  region?: 'us' | 'eu'; // Optional, defaults based on context
  product_group_id?: string; // Optional, used when creating product pairs
  
  // Pricing
  regular_price: number;
  sale_price?: number;
  sale_start_date?: Date;
  sale_end_date?: Date;
  
  // Discount fields
  is_on_sale?: boolean;
  sale_label?: string;
  
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
  tracks_stock?: boolean;
  options: Array<{
    option_name: string;
    option_value: string;
    price_adjustment?: number;
    image_url?: string;
    is_default?: boolean;
  }>;
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

// ============================================================================
// BUNDLE & STOCK TYPES
// ============================================================================

export interface ProductBundleItem {
  id: number;
  bundle_product_id: number;
  item_product_id: number;
  quantity: number;
  item_type: 'required' | 'optional';
  is_configurable: boolean;
  price_adjustment: number;
  display_name: string | null;
  description: string | null;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface VariationStockReservation {
  id: number;
  order_id: number;
  variation_option_id: number;
  quantity: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired';
  expires_at: Date;
  created_at: Date;
}

export interface StockCheckResult {
  available: boolean;
  availableQuantity: number;
  message?: string;
  variationStock?: Array<{
    productId?: number;
    productName?: string;
    variationName?: string;
    optionName?: string;
    available: number;
    required?: boolean;
  }>;
}

export interface BundleConfiguration {
  requiredItems: Array<{
    productId: number;
    productName: string;
    quantity: number;
    configuration?: Record<number, number>; // variationId -> optionId
  }>;
  optionalItems: Array<{
    productId: number;
    productName: string;
    quantity: number;
    priceAdjustment: number;
    selected: boolean;
  }>;
}

