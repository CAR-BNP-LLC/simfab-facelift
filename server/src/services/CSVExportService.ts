/**
 * CSV Export Service
 * Handles exporting products to CSV with all relationships
 */

import { Pool } from 'pg';
import { ProductService } from './ProductService';
import { ProductWithDetails } from '../types/product';
import {
  ProductImageData,
  ProductVariationData,
  VariationOptionData,
  ProductBundleItemData,
  ProductFAQData,
  AssemblyManualData,
  ProductAdditionalInfoData
} from '../types/csv';

export class CSVExportService {
  private productService: ProductService;

  constructor(private pool: Pool) {
    this.productService = new ProductService(pool);
  }

  /**
   * Export products to CSV format
   */
  async exportProducts(options: {
    status?: string;
    category?: string;
    region?: 'us' | 'eu';
  } = {}): Promise<string> {
    // Build query for products
    let sql = `
      SELECT 
        p.id, p.sku, p.name, p.slug, p.type, p.status,
        p.description, p.short_description, p.featured, p.is_bundle,
        p.regular_price, p.sale_price, p.is_on_sale,
        p.sale_start_date, p.sale_end_date, p.sale_label,
        p.price_min, p.price_max,
        p.stock, p.in_stock, p.low_stock_amount,
        p.weight_lbs, p.length_in, p.width_in, p.height_in,
        p.tax_class, p.shipping_class,
        p.categories, p.tags,
        p.seo_title, p.seo_description, p.meta_data,
        p.gtin_upc_ean_isbn, p.published,
        p.visibility_in_catalog, p.date_sale_price_starts, p.date_sale_price_ends,
        p.tax_status, p.backorders_allowed, p.sold_individually,
        p.allow_customer_reviews, p.purchase_note, p.brands,
        p.region, p.product_group_id
      FROM products p
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCounter = 1;

    if (options.status) {
      sql += ` AND p.status = $${paramCounter++}`;
      params.push(options.status);
    }

    if (options.category) {
      sql += ` AND p.categories::text LIKE $${paramCounter++}`;
      params.push(`%${options.category}%`);
    }

    if (options.region) {
      sql += ` AND p.region = $${paramCounter++}`;
      params.push(options.region);
    }

    sql += ` ORDER BY p.sku`;

    const productsResult = await this.pool.query(sql, params);
    const products = productsResult.rows;

    // Get all related data for each product
    const csvRows: any[] = [];

    for (const product of products) {
      // Validate product ID - handle NaN values and string "NaN"
      let productId: number;
      
      if (product.id === null || product.id === undefined) {
        console.error(`Missing product ID for product: ${product.sku || 'unknown'}`);
        continue;
      }
      
      if (typeof product.id === 'number') {
        if (isNaN(product.id)) {
          console.error(`Product ID is NaN (number) for product: ${product.sku || 'unknown'}`);
          continue;
        }
        productId = product.id;
      } else {
        const strId = String(product.id).trim();
        if (strId === '' || strId.toLowerCase() === 'nan') {
          console.error(`Product ID is invalid string "${strId}" for product: ${product.sku || 'unknown'}`);
          continue;
        }
        productId = parseInt(strId, 10);
      }
      
      if (isNaN(productId) || productId <= 0 || !Number.isInteger(productId)) {
        console.error(`Invalid product ID after validation for product: ${product.sku || 'unknown'}, id: ${product.id}, parsed: ${productId}`);
        continue;
      }

      // Get product details with relationships
      let productDetails: ProductWithDetails;
      try {
        productDetails = await this.productService.getProductById(productId);
      } catch (error) {
        console.error(`Error getting product ${productId}:`, error);
        continue;
      }

      // Build CSV row
      const row: any = {
        sku: this.escapeCSV(product.sku || ''),
        name: this.escapeCSV(product.name || ''),
        slug: this.escapeCSV(product.slug || ''),
        type: this.escapeCSV(product.type || ''),
        status: this.escapeCSV(product.status || ''),
        description: this.escapeCSV(product.description || ''),
        short_description: this.escapeCSV(product.short_description || ''),
        featured: product.featured ? 'true' : 'false',
        is_bundle: product.is_bundle ? 'true' : 'false',
        regular_price: product.regular_price || '',
        sale_price: product.sale_price || '',
        is_on_sale: product.is_on_sale ? 'true' : 'false',
        sale_start_date: product.sale_start_date ? new Date(product.sale_start_date).toISOString() : '',
        sale_end_date: product.sale_end_date ? new Date(product.sale_end_date).toISOString() : '',
        sale_label: this.escapeCSV(product.sale_label || ''),
        price_min: product.price_min || '',
        price_max: product.price_max || '',
        stock: product.stock || 0,
        in_stock: product.in_stock || '0',
        low_stock_amount: product.low_stock_amount || '',
        weight_lbs: product.weight_lbs || '',
        length_in: product.length_in || '',
        width_in: product.width_in || '',
        height_in: product.height_in || '',
        tax_class: this.escapeCSV(product.tax_class || ''),
        shipping_class: this.escapeCSV(product.shipping_class || ''),
        // Categories stored as JSON array in DB, but product can only have one category
        // Extract first category from array
        categories: (() => {
          if (!product.categories) return '';
          try {
            const cats = typeof product.categories === 'string' 
              ? JSON.parse(product.categories) 
              : product.categories;
            if (Array.isArray(cats) && cats.length > 0) {
              return this.escapeCSV(cats[0]);
            }
            return typeof cats === 'string' ? this.escapeCSV(cats) : '';
          } catch {
            // If not valid JSON, treat as string
            return this.escapeCSV(String(product.categories));
          }
        })(),
        // Tags stored as JSON array string in DB, parse and join with pipe
        tags: (() => {
          if (!product.tags) return '';
          try {
            const tags = typeof product.tags === 'string' 
              ? JSON.parse(product.tags) 
              : product.tags;
            if (Array.isArray(tags) && tags.length > 0) {
              return this.escapeCSV(tags.join('|'));
            }
            return typeof tags === 'string' ? this.escapeCSV(tags) : '';
          } catch {
            // If not valid JSON, treat as pipe-delimited string
            return this.escapeCSV(String(product.tags));
          }
        })(),
        seo_title: this.escapeCSV(product.seo_title || ''),
        seo_description: this.escapeCSV(product.seo_description || ''),
        meta_data: product.meta_data ? JSON.stringify(product.meta_data) : '',
        gtin_upc_ean_isbn: this.escapeCSV(product.gtin_upc_ean_isbn || ''),
        published: this.escapeCSV(product.published || ''),
        visibility_in_catalog: this.escapeCSV(product.visibility_in_catalog || ''),
        date_sale_price_starts: this.escapeCSV(product.date_sale_price_starts || ''),
        date_sale_price_ends: this.escapeCSV(product.date_sale_price_ends || ''),
        tax_status: this.escapeCSV(product.tax_status || ''),
        backorders_allowed: this.escapeCSV(product.backorders_allowed || ''),
        sold_individually: this.escapeCSV(product.sold_individually || ''),
        allow_customer_reviews: this.escapeCSV(product.allow_customer_reviews || ''),
        purchase_note: this.escapeCSV(product.purchase_note || ''),
        brands: this.escapeCSV(product.brands || ''),
        region: product.region || 'us',
        product_group_id: product.product_group_id || ''
      };

      // Export images
      if (productDetails.images && productDetails.images.length > 0) {
        const images: ProductImageData[] = productDetails.images.map(img => ({
          image_url: img.image_url,
          alt_text: img.alt_text || undefined,
          is_primary: img.is_primary,
          sort_order: img.sort_order
        }));
        row.product_images = JSON.stringify(images);
      } else {
        row.product_images = '';
      }

      // Export variations
      if (productDetails.variations) {
        const variations: ProductVariationData[] = [];
        
        // Combine all variation types
        const allVariations = [
          ...(productDetails.variations.text || []),
          ...(productDetails.variations.dropdown || []),
          ...(productDetails.variations.image || []),
          ...(productDetails.variations.boolean || [])
        ];

        for (const variation of allVariations) {
          const options: VariationOptionData[] = (variation.options || []).map(opt => ({
            option_name: opt.option_name,
            option_value: opt.option_value,
            price_adjustment: opt.price_adjustment,
            image_url: opt.image_url || undefined,
            is_default: opt.is_default,
            is_available: opt.is_available ?? true,
            sort_order: opt.sort_order,
            stock_quantity: opt.stock_quantity ?? undefined,
            low_stock_threshold: opt.low_stock_threshold ?? undefined,
            reserved_quantity: opt.reserved_quantity ?? 0
          }));

          variations.push({
            variation_type: variation.variation_type,
            name: variation.name,
            description: variation.description || undefined,
            is_required: variation.is_required,
            tracks_stock: variation.tracks_stock,
            sort_order: variation.sort_order,
            options
          });
        }

        if (variations.length > 0) {
          row.product_variations = JSON.stringify(variations);
        } else {
          row.product_variations = '';
        }
      } else {
        row.product_variations = '';
      }

      // Export bundle items (need to get SKUs)
      if (product.is_bundle && !isNaN(productId) && productId > 0) {
        try {
          const bundleItemsResult = await this.pool.query(
            `SELECT bi.*, p.sku as item_sku
             FROM product_bundle_items bi
             JOIN products p ON p.id = bi.item_product_id
             WHERE bi.bundle_product_id = $1
             ORDER BY bi.sort_order`,
            [productId]
          );

          if (bundleItemsResult.rows.length > 0) {
            const bundleItems: ProductBundleItemData[] = bundleItemsResult.rows.map(item => ({
              item_sku: item.item_sku,
              quantity: item.quantity,
              item_type: item.item_type,
              is_configurable: item.is_configurable,
              price_adjustment: parseFloat(item.price_adjustment) || 0,
              display_name: item.display_name || undefined,
              description: item.description || undefined,
              sort_order: item.sort_order
            }));
            row.product_bundle_items = JSON.stringify(bundleItems);
          } else {
            row.product_bundle_items = '';
          }
        } catch (error) {
          console.error(`Error fetching bundle items for product ${productId}:`, error);
          row.product_bundle_items = '';
        }
      } else {
        row.product_bundle_items = '';
      }

      // Export FAQs
      if (productDetails.faqs && productDetails.faqs.length > 0) {
        const faqs: ProductFAQData[] = productDetails.faqs.map(faq => ({
          question: faq.question,
          answer: faq.answer,
          sort_order: faq.sort_order
        }));
        row.product_faqs = JSON.stringify(faqs);
      } else {
        row.product_faqs = '';
      }

      // Export assembly manuals
      if (productDetails.assemblyManuals && productDetails.assemblyManuals.length > 0) {
        const manuals: AssemblyManualData[] = productDetails.assemblyManuals.map(manual => ({
          name: manual.name,
          description: manual.description || undefined,
          file_url: manual.file_url,
          file_type: (manual.file_type as any) || undefined,
          file_size: manual.file_size || undefined,
          image_url: manual.image_url || undefined,
          sort_order: manual.sort_order
        }));
        row.assembly_manuals = JSON.stringify(manuals);
      } else {
        row.assembly_manuals = '';
      }

      // Export additional info
      if (productDetails.additionalInfo && productDetails.additionalInfo.length > 0) {
        const additionalInfo: ProductAdditionalInfoData[] = productDetails.additionalInfo.map(info => ({
          title: info.title,
          description: info.description || undefined,
          content_type: info.content_type,
          content_data: info.content_data || {},
          sort_order: info.sort_order
        }));
        row.product_additional_info = JSON.stringify(additionalInfo);
      } else {
        row.product_additional_info = '';
      }

      csvRows.push(row);
    }

    // Generate CSV
    return this.generateCSV(csvRows);
  }

  /**
   * Escape CSV value
   */
  private escapeCSV(value: string): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Generate CSV string from rows
   */
  private generateCSV(rows: any[]): string {
    if (rows.length === 0) return '';

    // Get all unique keys from all rows
    const allKeys = new Set<string>();
    rows.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key));
    });

    const headers = Array.from(allKeys).sort((a, b) => {
      // Put required fields first
      const required = ['sku', 'name', 'regular_price'];
      const aIndex = required.indexOf(a);
      const bIndex = required.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });

    // Generate header row
    const headerRow = headers.map(h => this.escapeCSV(h)).join(',');

    // Generate data rows
    const dataRows = rows.map(row => {
      return headers.map(h => this.escapeCSV(String(row[h] || ''))).join(',');
    });

    return [headerRow, ...dataRows].join('\n');
  }
}

