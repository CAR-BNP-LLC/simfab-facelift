/**
 * CSV Import/Export Types
 * Types for CSV product import and export functionality
 */

import { Product } from './product';

// CSV Row Structure
export interface CSVProductRow {
  // Required fields
  sku: string;
  name: string;
  regular_price: string; // CSV reads as string, convert to number

  // Optional base fields
  slug?: string;
  type?: string;
  status?: string;
  description?: string;
  short_description?: string;
  featured?: string; // 'true'/'false'
  is_bundle?: string; // 'true'/'false'
  sale_price?: string;
  is_on_sale?: string; // 'true'/'false'
  sale_start_date?: string;
  sale_end_date?: string;
  sale_label?: string;
  price_min?: string;
  price_max?: string;
  stock?: string;
  in_stock?: string; // '1' or '0'
  low_stock_amount?: string;
  weight_lbs?: string;
  length_in?: string;
  width_in?: string;
  height_in?: string;
  tax_class?: string;
  shipping_class?: string;
  categories?: string; // pipe-delimited
  tags?: string; // pipe-delimited
  seo_title?: string;
  seo_description?: string;
  meta_data?: string; // JSON string
  gtin_upc_ean_isbn?: string;
  published?: string;
  is_featured?: string; // legacy
  visibility_in_catalog?: string;
  date_sale_price_starts?: string;
  date_sale_price_ends?: string;
  tax_status?: string;
  backorders_allowed?: string;
  sold_individually?: string;
  allow_customer_reviews?: string;
  purchase_note?: string;
  images?: string; // legacy
  brands?: string;
  region?: string; // 'us' | 'eu'
  product_group_id?: string; // UUID

  // JSON fields
  product_images?: string; // JSON array string
  product_variations?: string; // JSON array string
  product_bundle_items?: string; // JSON array string
  product_faqs?: string; // JSON array string
  assembly_manuals?: string; // JSON array string
  product_additional_info?: string; // JSON array string
}

// Parsed Product Data
export interface ParsedProductData {
  product: Partial<Product>;
  images?: ProductImageData[];
  variations?: ProductVariationData[];
  bundleItems?: ProductBundleItemData[];
  faqs?: ProductFAQData[];
  assemblyManuals?: AssemblyManualData[];
  additionalInfo?: ProductAdditionalInfoData[];
}

// Related Data Structures
export interface ProductImageData {
  image_url: string;
  alt_text?: string;
  is_primary?: boolean;
  sort_order?: number;
}

export interface ProductVariationData {
  variation_type: 'model' | 'dropdown' | 'radio' | 'select' | 'text' | 'image' | 'boolean';
  name: string;
  description?: string;
  is_required?: boolean;
  tracks_stock?: boolean;
  sort_order?: number;
  options: VariationOptionData[];
}

export interface VariationOptionData {
  option_name: string;
  option_value: string;
  price_adjustment?: number;
  image_url?: string;
  is_default?: boolean;
  is_available?: boolean;
  sort_order?: number;
  stock_quantity?: number | null;
  low_stock_threshold?: number;
  reserved_quantity?: number;
}

export interface ProductBundleItemData {
  item_sku: string;
  quantity?: number;
  item_type: 'required' | 'optional';
  is_configurable?: boolean;
  price_adjustment?: number;
  display_name?: string;
  description?: string;
  sort_order?: number;
}

export interface ProductFAQData {
  question: string;
  answer: string;
  sort_order?: number;
}

export interface AssemblyManualData {
  name: string;
  description?: string;
  file_url: string;
  file_type?: 'pdf' | 'doc' | 'docx' | 'txt' | 'zip';
  file_size?: number;
  image_url?: string;
  sort_order?: number;
}

export interface ProductAdditionalInfoData {
  title: string;
  description?: string;
  content_type?: 'text' | 'images' | 'mixed' | 'html';
  content_data?: Record<string, any>;
  sort_order?: number;
}

// Import Result
export interface ImportResult {
  success: boolean;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
  warnings: ImportWarning[];
}

export interface ImportError {
  row: number;
  sku?: string;
  field?: string;
  message: string;
  severity: 'critical' | 'warning';
}

export interface ImportWarning {
  row: number;
  sku?: string;
  message: string;
}

// Import Options
export interface ImportOptions {
  mode: 'create' | 'update' | 'skip_duplicates';
  dryRun?: boolean;
  validateOnly?: boolean;
}

