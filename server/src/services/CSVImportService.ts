/**
 * CSV Import Service
 * Handles importing products from CSV with all relationships
 */

import { Pool } from 'pg';
import csv from 'csv-parser';
import { Readable } from 'stream';
import {
  CSVProductRow,
  ParsedProductData,
  ImportResult,
  ImportError,
  ImportWarning,
  ImportOptions,
  ProductImageData,
  ProductVariationData,
  VariationOptionData,
  ProductBundleItemData,
  ProductFAQData,
  AssemblyManualData,
  ProductAdditionalInfoData
} from '../types/csv';
import { ProductService } from './ProductService';
import { ProductVariationService } from './ProductVariationService';
import { ProductImageService } from './ProductImageService';
import { BundleService } from './BundleService';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { ProductStatus } from '../types/product';

export class CSVImportService {
  private productService: ProductService;
  private variationService: ProductVariationService;
  private imageService: ProductImageService;
  private bundleService: BundleService;

  // Valid category slugs (as used in the database and frontend)
  private readonly VALID_CATEGORIES = [
    'flight-sim',
    'sim-racing',
    'cockpits',
    'monitor-stands',
    'accessories',
    'conversion-kits',
    'services',
    'individual-parts',
    'racing-flight-seats',
    'refurbished'
  ];

  constructor(private pool: Pool) {
    this.productService = new ProductService(pool);
    this.variationService = new ProductVariationService(pool);
    this.imageService = new ProductImageService(pool);
    this.bundleService = new BundleService(pool);
  }

  /**
   * Parse CSV file content
   */
  async parseCSV(csvContent: string): Promise<CSVProductRow[]> {
    return new Promise((resolve, reject) => {
      const results: CSVProductRow[] = [];
      const stream = Readable.from([csvContent]);

      stream
        .pipe(csv())
        .on('data', (row: CSVProductRow) => {
          results.push(row);
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Validate category slug
   * Returns an ImportError if invalid, null if valid
   */
  private validateCategory(categories: string, rowNumber: number): ImportError | null {
    if (!categories || categories.trim() === '') {
      return null; // Empty is allowed (optional field)
    }

    let category: string | null = null;
    const trimmed = categories.trim();

    // Parse category (handle both JSON array and plain string)
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        category = String(parsed[0]);
      } else if (typeof parsed === 'string') {
        category = parsed;
      }
    } catch {
      // Not valid JSON, treat as plain string
      category = trimmed;
    }

    if (!category) {
      return null; // Empty after parsing is allowed
    }

    const normalizedCategory = category.trim().toLowerCase();
    if (!this.VALID_CATEGORIES.includes(normalizedCategory)) {
      return {
        row: rowNumber,
        field: 'categories',
        message: `Invalid category: "${category}". Expected one of: ${this.VALID_CATEGORIES.join(', ')}`,
        severity: 'warning' // Warning, not critical - allow import to proceed
      };
    }

    return null; // Valid category
  }

  /**
   * Validate CSV row
   */
  validateRow(row: CSVProductRow, rowNumber: number): { isValid: boolean; errors: ImportError[] } {
    const errors: ImportError[] = [];

    // Required fields
    if (!row.sku || row.sku.trim() === '') {
      errors.push({
        row: rowNumber,
        field: 'sku',
        message: 'SKU is required',
        severity: 'critical'
      });
    }

    if (!row.name || row.name.trim() === '') {
      errors.push({
        row: rowNumber,
        field: 'name',
        message: 'Name is required',
        severity: 'critical'
      });
    }

    if (!row.regular_price || isNaN(parseFloat(row.regular_price))) {
      errors.push({
        row: rowNumber,
        field: 'regular_price',
        message: 'Regular price is required and must be a valid number',
        severity: 'critical'
      });
    }

    // Validate category
    if (row.categories) {
      const categoryValidation = this.validateCategory(row.categories, rowNumber);
      if (categoryValidation) {
        errors.push(categoryValidation);
      }
    }

    // Validate JSON fields
    if (row.product_images) {
      try {
        const images = JSON.parse(row.product_images);
        if (!Array.isArray(images)) {
          errors.push({
            row: rowNumber,
            field: 'product_images',
            message: 'product_images must be a JSON array',
            severity: 'critical'
          });
        }
      } catch (e) {
        errors.push({
          row: rowNumber,
          field: 'product_images',
          message: `Invalid JSON in product_images: ${e instanceof Error ? e.message : 'Unknown error'}`,
          severity: 'critical'
        });
      }
    }

    if (row.product_variations) {
      try {
        const variations = JSON.parse(row.product_variations);
        if (!Array.isArray(variations)) {
          errors.push({
            row: rowNumber,
            field: 'product_variations',
            message: 'product_variations must be a JSON array',
            severity: 'critical'
          });
        } else {
          // Validate each variation
          variations.forEach((variation: any, varIndex: number) => {
            const variationType = variation.variation_type;
            const options = variation.options || [];
            
            // Check: dropdown variations should not have image_url in options
            if (variationType === 'dropdown') {
              const optionsWithImages = options.filter((opt: any) => 
                opt.image_url && opt.image_url.trim()
              );
              
              if (optionsWithImages.length > 0) {
                errors.push({
                  row: rowNumber,
                  field: 'product_variations',
                  message: `Variation "${variation.name || `#${varIndex + 1}`}" is type "dropdown" but has image_url in ${optionsWithImages.length} option(s). Will be automatically converted to type "image".`,
                  severity: 'warning'
                });
              }
            }
            
            // Check: image variations should have image_url in at least some options
            if (variationType === 'image') {
              const optionsWithImages = options.filter((opt: any) => 
                opt.image_url && opt.image_url.trim()
              );
              
              if (optionsWithImages.length === 0) {
                errors.push({
                  row: rowNumber,
                  field: 'product_variations',
                  message: `Variation "${variation.name || `#${varIndex + 1}`}" is type "image" but no options have image_url. Image variations should have image URLs in their options.`,
                  severity: 'warning'
                });
              }
            }
          });
        }
      } catch (e) {
        errors.push({
          row: rowNumber,
          field: 'product_variations',
          message: `Invalid JSON in product_variations: ${e instanceof Error ? e.message : 'Unknown error'}`,
          severity: 'critical'
        });
      }
    }

    if (row.product_bundle_items) {
      try {
        const bundles = JSON.parse(row.product_bundle_items);
        if (!Array.isArray(bundles)) {
          errors.push({
            row: rowNumber,
            field: 'product_bundle_items',
            message: 'product_bundle_items must be a JSON array',
            severity: 'critical'
          });
        }
      } catch (e) {
        errors.push({
          row: rowNumber,
          field: 'product_bundle_items',
          message: `Invalid JSON in product_bundle_items: ${e instanceof Error ? e.message : 'Unknown error'}`,
          severity: 'critical'
        });
      }
    }

    // Validate other JSON fields similarly
    ['product_faqs', 'assembly_manuals', 'product_additional_info'].forEach(field => {
      const value = (row as any)[field];
      if (value) {
        try {
          const parsed = JSON.parse(value);
          if (!Array.isArray(parsed)) {
            errors.push({
              row: rowNumber,
              field,
              message: `${field} must be a JSON array`,
              severity: 'critical'
            });
          }
        } catch (e) {
          errors.push({
            row: rowNumber,
            field,
            message: `Invalid JSON in ${field}: ${e instanceof Error ? e.message : 'Unknown error'}`,
            severity: 'critical'
          });
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Parse row into structured data
   */
  parseRow(row: CSVProductRow): ParsedProductData {
    const product: Partial<any> = {
      sku: row.sku.trim(),
      name: row.name.trim(),
      regular_price: parseFloat(row.regular_price)
    };

    // Optional fields
    if (row.slug) product.slug = row.slug.trim();
    if (row.type) product.type = row.type.trim();
    if (row.status) product.status = row.status.trim() as ProductStatus;
    if (row.description) product.description = row.description.trim();
    if (row.short_description) product.short_description = row.short_description.trim();
    if (row.featured) product.featured = row.featured.toLowerCase() === 'true';
    if (row.is_bundle) product.is_bundle = row.is_bundle.toLowerCase() === 'true';
    if (row.sale_price) {
      const parsed = parseFloat(row.sale_price);
      if (!isNaN(parsed)) product.sale_price = parsed;
    }
    if (row.is_on_sale) product.is_on_sale = row.is_on_sale.toLowerCase() === 'true';
    if (row.sale_start_date) product.sale_start_date = new Date(row.sale_start_date);
    if (row.sale_end_date) product.sale_end_date = new Date(row.sale_end_date);
    if (row.sale_label) product.sale_label = row.sale_label.trim();
    if (row.price_min) {
      const parsed = parseFloat(row.price_min);
      if (!isNaN(parsed)) product.price_min = parsed;
    }
    if (row.price_max) {
      const parsed = parseFloat(row.price_max);
      if (!isNaN(parsed)) product.price_max = parsed;
    }
    if (row.stock) {
      const parsed = parseInt(row.stock, 10);
      if (!isNaN(parsed)) product.stock_quantity = parsed;
    }
    if (row.in_stock) product.in_stock = row.in_stock;
    if (row.low_stock_amount) {
      const parsed = parseInt(row.low_stock_amount, 10);
      if (!isNaN(parsed)) product.low_stock_threshold = parsed;
    }
    if (row.weight_lbs) {
      const parsed = parseFloat(row.weight_lbs);
      if (!isNaN(parsed)) product.weight_lbs = parsed;
    }
    if (row.length_in) {
      const parsed = parseFloat(row.length_in);
      if (!isNaN(parsed)) product.length_in = parsed;
    }
    if (row.width_in) {
      const parsed = parseFloat(row.width_in);
      if (!isNaN(parsed)) product.width_in = parsed;
    }
    if (row.height_in) {
      const parsed = parseFloat(row.height_in);
      if (!isNaN(parsed)) product.height_in = parsed;
    }
    if (row.package_weight) {
      const parsed = parseFloat(row.package_weight);
      if (!isNaN(parsed)) product.package_weight = parsed;
    }
    if (row.package_weight_unit) {
      const unit = row.package_weight_unit.trim().toLowerCase();
      if (unit === 'kg' || unit === 'lbs') {
        product.package_weight_unit = unit as 'kg' | 'lbs';
      }
    }
    if (row.package_length) {
      const parsed = parseFloat(row.package_length);
      if (!isNaN(parsed)) product.package_length = parsed;
    }
    if (row.package_width) {
      const parsed = parseFloat(row.package_width);
      if (!isNaN(parsed)) product.package_width = parsed;
    }
    if (row.package_height) {
      const parsed = parseFloat(row.package_height);
      if (!isNaN(parsed)) product.package_height = parsed;
    }
    if (row.package_dimension_unit) {
      const unit = row.package_dimension_unit.trim().toLowerCase();
      if (unit === 'cm' || unit === 'in') {
        product.package_dimension_unit = unit as 'cm' | 'in';
      }
    }
    if (row.tariff_code) {
      product.tariff_code = row.tariff_code.trim() || null;
    }
    if (row.tax_class) product.tax_class = row.tax_class.trim();
    if (row.shipping_class) product.shipping_class = row.shipping_class.trim();
    // Product can only be in one category, store as single-item array
    // Handle both old format (JSON array string like "[""category""]") and new format (plain string)
    if (row.categories) {
      let category: string | null = null;
      const trimmed = row.categories.trim();
      
      if (trimmed) {
        // Try to parse as JSON array (old export format)
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed) && parsed.length > 0) {
            category = String(parsed[0]);
          } else if (typeof parsed === 'string') {
            category = parsed;
          }
        } catch {
          // Not valid JSON, treat as plain string (new format)
          category = trimmed;
        }
      }
      
      if (category) {
        // Validate category slug
        const normalizedCategory = category.trim().toLowerCase();
        if (!this.VALID_CATEGORIES.includes(normalizedCategory)) {
          // Log warning but don't fail import - allow it to proceed for debugging
          console.warn(
            `⚠️  [Row ${row.sku || 'unknown'}] Invalid category: "${category}"` +
            `\n   Expected one of: ${this.VALID_CATEGORIES.join(', ')}` +
            `\n   Received: "${category}"` +
            `\n   This category will be stored but may not work correctly in the frontend.`
          );
        }
        // Store as single-item array (database expects JSON array)
        // Store the category as-is (even if invalid) to help with debugging
        (product as any).categories = [category];
      }
    }
    // Tags: Handle both JSON array format (from old exports) and pipe-delimited format
    if (row.tags) {
      const trimmed = row.tags.trim();
      if (trimmed) {
        try {
          // Try to parse as JSON array first (old export format)
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            product.tags = parsed.filter(t => t && typeof t === 'string').map(t => String(t).trim()).filter(t => t);
          } else if (typeof parsed === 'string') {
            product.tags = parsed.split('|').map(t => t.trim()).filter(t => t);
          }
        } catch {
          // Not valid JSON, treat as pipe-delimited string (new format)
          product.tags = trimmed.split('|').map(t => t.trim()).filter(t => t);
        }
      }
    }
    if (row.seo_title) product.seo_title = row.seo_title.trim();
    if (row.seo_description) product.seo_description = row.seo_description.trim();
    if (row.meta_data) {
      try {
        product.meta_data = JSON.parse(row.meta_data);
      } catch (e) {
        // Invalid JSON, will be caught in validation
      }
    }
    if (row.gtin_upc_ean_isbn) product.gtin_upc_ean_isbn = row.gtin_upc_ean_isbn.trim();
    if (row.published) product.published = row.published.trim();
    if (row.visibility_in_catalog) product.visibility_in_catalog = row.visibility_in_catalog.trim();
    if (row.date_sale_price_starts) product.date_sale_price_starts = row.date_sale_price_starts.trim();
    if (row.date_sale_price_ends) product.date_sale_price_ends = row.date_sale_price_ends.trim();
    if (row.tax_status) product.tax_status = row.tax_status.trim();
    if (row.backorders_allowed) product.backorders_allowed = row.backorders_allowed.trim();
    if (row.sold_individually) product.sold_individually = row.sold_individually.trim();
    if (row.allow_customer_reviews) product.allow_customer_reviews = row.allow_customer_reviews.trim();
    if (row.purchase_note) product.purchase_note = row.purchase_note.trim();
    if (row.brands) product.brands = row.brands.trim();
    if (row.region) {
      const region = row.region.trim().toLowerCase();
      if (region === 'us' || region === 'eu') {
        (product as any).region = region;
      }
    }
    // Only set product_group_id if explicitly provided AND not empty
    // When importing, if a product is single-region, product_group_id should be null
    // We'll validate that the group actually has products in both regions elsewhere
    if (row.product_group_id) {
      const groupId = row.product_group_id.trim();
      if (groupId && groupId.toLowerCase() !== 'null' && groupId.toLowerCase() !== '') {
        (product as any).product_group_id = groupId;
      } else {
        // Explicitly set to null for single-region products
        (product as any).product_group_id = null;
      }
    } else {
      // No product_group_id in CSV = single-region product
      (product as any).product_group_id = null;
    }

    const parsed: ParsedProductData = { product };

    // Parse JSON fields
    if (row.product_images) {
      try {
        parsed.images = JSON.parse(row.product_images) as ProductImageData[];
      } catch (e) {
        // Already validated
      }
    }

    if (row.product_variations) {
      try {
        const variations = JSON.parse(row.product_variations) as ProductVariationData[];
        
        // Clean up: convert dropdown variations with images to image variations
        const cleanedVariations = variations.map(variation => {
          if (variation.variation_type === 'dropdown' && variation.options) {
            // Check if any option has an image URL
            const hasImages = variation.options.some((opt: any) => 
              opt.image_url && opt.image_url.trim()
            );
            
            // If dropdown has images, convert to image type
            if (hasImages) {
              variation.variation_type = 'image';
            }
          }
          return variation;
        });
        
        parsed.variations = cleanedVariations;
      } catch (e) {
        // Already validated
      }
    }

    if (row.product_bundle_items) {
      try {
        parsed.bundleItems = JSON.parse(row.product_bundle_items) as ProductBundleItemData[];
      } catch (e) {
        // Already validated
      }
    }

    if (row.product_faqs) {
      try {
        parsed.faqs = JSON.parse(row.product_faqs) as ProductFAQData[];
      } catch (e) {
        // Already validated
      }
    }

    if (row.assembly_manuals) {
      try {
        parsed.assemblyManuals = JSON.parse(row.assembly_manuals) as AssemblyManualData[];
      } catch (e) {
        // Already validated
      }
    }

    if (row.product_additional_info) {
      try {
        parsed.additionalInfo = JSON.parse(row.product_additional_info) as ProductAdditionalInfoData[];
      } catch (e) {
        // Already validated
      }
    }

    return parsed;
  }

  /**
   * Import products from CSV
   */
  async importProducts(csvContent: string, options: ImportOptions = { mode: 'create' }): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      warnings: []
    };

    try {
      // Parse CSV
      const rows = await this.parseCSV(csvContent);
      result.total = rows.length;

      // Validate all rows first
      const validationErrors: ImportError[] = [];
      rows.forEach((row, index) => {
        const validation = this.validateRow(row, index + 1);
        if (!validation.isValid) {
          validationErrors.push(...validation.errors);
        }
      });

      // If validateOnly, return validation results without importing
      if (options.validateOnly) {
        result.errors = validationErrors;
        result.success = validationErrors.length === 0;
        return result;
      }

      // Parse rows into structured data
      const parsedData: Array<{ rowNumber: number; data: ParsedProductData; errors: ImportError[] }> = [];
      rows.forEach((row, index) => {
        const validation = this.validateRow(row, index + 1);
        if (validation.isValid) {
          parsedData.push({
            rowNumber: index + 1,
            data: this.parseRow(row),
            errors: []
          });
        } else {
          parsedData.push({
            rowNumber: index + 1,
            data: { product: { sku: row.sku } },
            errors: validation.errors
          });
        }
      });

      // Build SKU map for bundle resolution (key: "sku:region" to handle same SKU in different regions)
      const skuToProductId = new Map<string, number>();

      // Pass 1: Create/Update products
      for (const { rowNumber, data, errors } of parsedData) {
        if (errors.length > 0) {
          result.errors.push(...errors);
          result.skipped++;
          continue;
        }

        try {
          const product = data.product;

          // Check if product exists by SKU AND region (SKU is unique per region)
          const productRegion = (product as any).region || 'us';
          const existing = await this.pool.query('SELECT id FROM products WHERE sku = $1 AND region = $2', [product.sku, productRegion]);

          if (existing.rows.length > 0) {
            if (options.mode === 'skip_duplicates') {
              result.skipped++;
              if (!options.dryRun) {
                // Use "sku:region" as key for region-aware lookups
                skuToProductId.set(`${product.sku!}:${productRegion}`, existing.rows[0].id);
              }
              continue;
            } else if (options.mode === 'update') {
              // Update existing product - convert null to undefined
              if (!options.dryRun) {
                const updateData: any = {};
                Object.keys(product).forEach(key => {
                  const value = (product as any)[key];
                  updateData[key] = value === null ? undefined : value;
                });
                const updated = await this.productService.updateProduct(existing.rows[0].id, updateData);
                skuToProductId.set(`${product.sku!}:${productRegion}`, updated.id);
              }
              result.updated++;
            } else {
              // Create mode - skip duplicates silently (no error)
              result.skipped++;
              if (!options.dryRun) {
                // Still add to map for bundle resolution
                skuToProductId.set(`${product.sku!}:${productRegion}`, existing.rows[0].id);
              }
              continue;
            }
          } else {
            // Create new product
            if (!options.dryRun) {
              const created = await this.productService.createProduct({
                ...product,
                sku: product.sku!,
                name: product.name!,
                regular_price: product.regular_price!,
                type: product.type || 'simple',
                status: product.status || ProductStatus.ACTIVE,
                region: (product as any).region || 'us' // Default to US region
              } as any);
              skuToProductId.set(`${product.sku!}:${productRegion}`, created.id);
            }
            result.created++;
          }
        } catch (error) {
          result.errors.push({
            row: rowNumber,
            sku: data.product.sku,
            message: error instanceof Error ? error.message : 'Unknown error creating product',
            severity: 'critical'
          });
          result.skipped++;
        }
      }

      if (options.dryRun) {
        return result;
      }

      // Pass 2: Create relationships
      for (const { rowNumber, data, errors } of parsedData) {
        if (errors.length > 0) continue;

        const productRegion = (data.product as any).region || 'us';
        const productId = skuToProductId.get(`${data.product.sku!}:${productRegion}`);
        if (!productId) continue;

        try {
          // Skip all relationship creation in dry run mode
          if (options.dryRun) {
            continue;
          }

          // Create images
          if (data.images && data.images.length > 0) {
            for (const image of data.images) {
              await this.imageService.addImage(
                productId,
                image.image_url,
                image.alt_text,
                image.is_primary
              );
            }
          }

          // Create variations
          if (data.variations && data.variations.length > 0) {
            for (const variation of data.variations) {
              // Map old variation types to new ones (migration 017)
              let variationType = variation.variation_type;
              if (variationType === 'model') variationType = 'image';
              if (variationType === 'radio') variationType = 'boolean';
              if (variationType === 'select') variationType = 'dropdown';
              
              // Validate and convert sort_order
              const sortOrder = typeof variation.sort_order === 'number' && !isNaN(variation.sort_order)
                ? variation.sort_order
                : (variation.sort_order ? parseInt(String(variation.sort_order), 10) : 0);
              const validatedSortOrder = !isNaN(sortOrder) ? sortOrder : 0;

              const createdVariation = await this.variationService.createVariation({
                product_id: productId,
                variation_type: variationType as any,
                name: variation.name,
                description: variation.description || undefined,
                is_required: variation.is_required ?? true,
                tracks_stock: variation.tracks_stock || false,
                sort_order: validatedSortOrder,
                options: variation.options.map(opt => {
                  // Validate and convert price_adjustment
                  let priceAdj = 0;
                  if (opt.price_adjustment !== undefined && opt.price_adjustment !== null) {
                    const parsed = typeof opt.price_adjustment === 'number'
                      ? opt.price_adjustment
                      : parseFloat(String(opt.price_adjustment));
                    if (!isNaN(parsed)) priceAdj = parsed;
                  }
                  
                  return {
                    option_name: opt.option_name,
                    option_value: opt.option_value,
                    price_adjustment: priceAdj,
                    image_url: opt.image_url || undefined,
                    is_default: opt.is_default || false
                  };
                })
              });

              // Update option stock fields if provided
              if (variation.options && variation.options.length > 0) {
                const variationOptions = await this.pool.query(
                  'SELECT id, option_name FROM variation_options WHERE variation_id = $1 ORDER BY sort_order',
                  [createdVariation.id]
                );

                for (let i = 0; i < variation.options.length && i < variationOptions.rows.length; i++) {
                  const csvOption = variation.options[i];
                  const dbOption = variationOptions.rows[i];
                  
                  if (csvOption.stock_quantity !== undefined || csvOption.low_stock_threshold !== undefined || csvOption.reserved_quantity !== undefined) {
                    const updateFields: string[] = [];
                    const updateValues: any[] = [];
                    let paramCounter = 1;

                    if (csvOption.stock_quantity !== undefined && csvOption.stock_quantity !== null) {
                      const parsed = typeof csvOption.stock_quantity === 'number'
                        ? csvOption.stock_quantity
                        : parseInt(String(csvOption.stock_quantity), 10);
                      if (!isNaN(parsed)) {
                        updateFields.push(`stock_quantity = $${paramCounter++}`);
                        updateValues.push(parsed);
                      }
                    }
                    if (csvOption.low_stock_threshold !== undefined && csvOption.low_stock_threshold !== null) {
                      const parsed = typeof csvOption.low_stock_threshold === 'number'
                        ? csvOption.low_stock_threshold
                        : parseInt(String(csvOption.low_stock_threshold), 10);
                      if (!isNaN(parsed)) {
                        updateFields.push(`low_stock_threshold = $${paramCounter++}`);
                        updateValues.push(parsed);
                      }
                    }
                    if (csvOption.reserved_quantity !== undefined && csvOption.reserved_quantity !== null) {
                      const parsed = typeof csvOption.reserved_quantity === 'number'
                        ? csvOption.reserved_quantity
                        : parseInt(String(csvOption.reserved_quantity), 10);
                      if (!isNaN(parsed)) {
                        updateFields.push(`reserved_quantity = $${paramCounter++}`);
                        updateValues.push(parsed);
                      }
                    }
                    if (csvOption.is_available !== undefined && csvOption.is_available !== null) {
                      updateFields.push(`is_available = $${paramCounter++}`);
                      updateValues.push(csvOption.is_available);
                    }

                    if (updateFields.length > 0) {
                      updateValues.push(dbOption.id);
                      await this.pool.query(
                        `UPDATE variation_options SET ${updateFields.join(', ')} WHERE id = $${paramCounter}`,
                        updateValues
                      );
                    }
                  }
                }
              }
            }
          }

          // Create bundle items
          if (data.bundleItems && data.bundleItems.length > 0) {
            // Resolve bundle items - use same region as the parent product
            const parentRegion = (data.product as any).region || 'us';
            for (const bundleItem of data.bundleItems) {
              // First try to find in same region as parent product
              let itemProductId: number | undefined = skuToProductId.get(`${bundleItem.item_sku}:${parentRegion}`);
              // Fallback: try to find in any region (for cross-region bundles, if needed)
              if (!itemProductId) {
                // Try to find the item by querying database (might be in different region or not yet imported)
                const itemProduct = await this.pool.query(
                  'SELECT id FROM products WHERE sku = $1 AND region = $2',
                  [bundleItem.item_sku, parentRegion]
                );
                if (itemProduct.rows.length > 0) {
                  itemProductId = itemProduct.rows[0].id;
                  if (itemProductId !== undefined) {
                    skuToProductId.set(`${bundleItem.item_sku}:${parentRegion}`, itemProductId);
                  }
                }
              }
              if (!itemProductId) {
                result.errors.push({
                  row: rowNumber,
                  sku: data.product.sku,
                  field: 'product_bundle_items',
                  message: `Bundle item SKU "${bundleItem.item_sku}" not found in region "${parentRegion}"`,
                  severity: 'critical'
                });
                continue;
              }

              // Validate and convert quantity
              let quantity = 1;
              if (bundleItem.quantity !== undefined && bundleItem.quantity !== null) {
                const parsed = typeof bundleItem.quantity === 'number'
                  ? bundleItem.quantity
                  : parseInt(String(bundleItem.quantity), 10);
                if (!isNaN(parsed) && parsed > 0) quantity = parsed;
              }

              // Validate and convert price_adjustment
              let priceAdjustment = 0;
              if (bundleItem.price_adjustment !== undefined && bundleItem.price_adjustment !== null) {
                const parsed = typeof bundleItem.price_adjustment === 'number'
                  ? bundleItem.price_adjustment
                  : parseFloat(String(bundleItem.price_adjustment));
                if (!isNaN(parsed)) priceAdjustment = parsed;
              }

              await this.bundleService.addBundleItem(productId, itemProductId, {
                quantity,
                item_type: bundleItem.item_type,
                is_configurable: bundleItem.is_configurable || false,
                price_adjustment: priceAdjustment,
                display_name: bundleItem.display_name,
                description: bundleItem.description
              });
            }
          }

          // Create FAQs
          if (data.faqs && data.faqs.length > 0) {
            for (const faq of data.faqs) {
              const sortOrder = typeof faq.sort_order === 'number' && !isNaN(faq.sort_order)
                ? faq.sort_order
                : (faq.sort_order ? parseInt(String(faq.sort_order), 10) : 0);
              const validatedSortOrder = !isNaN(sortOrder) ? sortOrder : 0;
              
              await this.pool.query(
                'INSERT INTO product_faqs (product_id, question, answer, sort_order) VALUES ($1, $2, $3, $4)',
                [productId, faq.question, faq.answer, validatedSortOrder]
              );
            }
          }

          // Create assembly manuals
          if (data.assemblyManuals && data.assemblyManuals.length > 0) {
            for (const manual of data.assemblyManuals) {
              // Validate file_size and sort_order
              const fileSize = manual.file_size !== undefined && manual.file_size !== null
                ? (typeof manual.file_size === 'number' && !isNaN(manual.file_size)
                  ? manual.file_size
                  : (parseInt(String(manual.file_size), 10) || null))
                : null;
              const fileSizeValid = fileSize !== null && !isNaN(fileSize) ? fileSize : null;
              
              const sortOrder = typeof manual.sort_order === 'number' && !isNaN(manual.sort_order)
                ? manual.sort_order
                : (manual.sort_order ? parseInt(String(manual.sort_order), 10) : 0);
              const validatedSortOrder = !isNaN(sortOrder) ? sortOrder : 0;

              await this.pool.query(
                `INSERT INTO assembly_manuals (product_id, name, description, file_url, file_type, file_size, image_url, sort_order)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                  productId,
                  manual.name,
                  manual.description || null,
                  manual.file_url,
                  manual.file_type || null,
                  fileSizeValid,
                  manual.image_url || null,
                  validatedSortOrder
                ]
              );
            }
          }

          // Create additional info
          if (data.additionalInfo && data.additionalInfo.length > 0) {
            for (const info of data.additionalInfo) {
              const sortOrder = typeof info.sort_order === 'number' && !isNaN(info.sort_order)
                ? info.sort_order
                : (info.sort_order ? parseInt(String(info.sort_order), 10) : 0);
              const validatedSortOrder = !isNaN(sortOrder) ? sortOrder : 0;

              await this.pool.query(
                `INSERT INTO product_additional_info (product_id, title, description, content_type, content_data, sort_order)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                  productId,
                  info.title,
                  info.description || null,
                  info.content_type || 'text',
                  JSON.stringify(info.content_data || {}),
                  validatedSortOrder
                ]
              );
            }
          }
        } catch (error) {
          result.errors.push({
            row: rowNumber,
            sku: data.product.sku,
            message: error instanceof Error ? error.message : 'Unknown error creating relationships',
            severity: 'critical'
          });
        }
      }

      result.success = result.errors.filter(e => e.severity === 'critical').length === 0;
      return result;
    } catch (error) {
      result.success = false;
      result.errors.push({
        row: 0,
        message: error instanceof Error ? error.message : 'Unknown error during import',
        severity: 'critical'
      });
      return result;
    }
  }
}

