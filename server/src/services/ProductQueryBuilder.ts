/**
 * Product Query Builder
 * Helper class for building complex product queries with filters, search, and pagination
 */

import { Pool } from 'pg';
import { ProductQueryOptions, ProductStatus } from '../types/product';

export class ProductQueryBuilder {
  private whereConditions: string[] = [];
  private params: any[] = [];
  private paramCounter: number = 1;
  private orderBy: string = 'p.created_at DESC';

  constructor(private pool: Pool) {}

  /**
   * Build complete product query with filters
   * VERSION: 2.0 - WITH IMAGES SUBQUERY
   */
  build(options: ProductQueryOptions = {}): {
    sql: string;
    params: any[];
    countSql: string;
    countParams: any[];
  } {
    this.reset();
    this.applyFilters(options);
    this.applySort(options);

    const baseQuery = `
      FROM products p
      WHERE ${this.whereConditions.length > 0 ? this.whereConditions.join(' AND ') : 'TRUE'}
    `;

    // Save params for count query BEFORE adding limit/offset
    const countParams = [...this.params];
    const countSql = `SELECT COUNT(*)::int as total ${baseQuery}`;

    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const sql = `
      SELECT 
        p.id, p.type, p.sku, p.gtin_upc_ean_isbn, p.name, p.slug,
        p.published, p.is_featured, p.visibility_in_catalog,
        p.short_description, p.description,
        p.date_sale_price_starts, p.date_sale_price_ends,
        p.tax_status, p.tax_class, p.in_stock, p.stock,
        p.low_stock_amount, p.backorders_allowed, p.sold_individually,
        p.weight_lbs, p.length_in, p.width_in, p.height_in,
        p.allow_customer_reviews, p.purchase_note,
        p.sale_price, p.regular_price, p.categories, p.tags,
        p.shipping_class, p.brands, p.created_at, p.updated_at,
        p.status, p.featured, p.price_min, p.price_max, p.meta_data,
        p.seo_title, p.seo_description,
        p.is_on_sale, p.sale_start_date, p.sale_end_date, p.sale_label,
        p.region, p.product_group_id, p.deleted_at,
        COALESCE(
          (SELECT json_agg(row_to_json(pi))
           FROM (SELECT * FROM product_images WHERE product_id = p.id ORDER BY sort_order) pi),
          '[]'::json
        ) as images,
        (SELECT COUNT(*)::int FROM product_reviews pr WHERE pr.product_id = p.id) as review_count,
        (SELECT COALESCE(AVG(pr.rating), 0) FROM product_reviews pr WHERE pr.product_id = p.id) as rating_average
      ${baseQuery}
      ORDER BY ${this.orderBy}
      LIMIT $${this.addParam(limit)} OFFSET $${this.addParam(offset)}
    `;

    return {
      sql,
      params: this.params,
      countSql,
      countParams
    };
  }

  /**
   * Build search query with full-text search
   */
  buildSearch(query: string, options: ProductQueryOptions = {}): {
    sql: string;
    params: any[];
    countSql: string;
    countParams: any[];
  } {
    this.reset();
    
    // Add search condition with full-text search
    // Reuse the same parameter for all ILIKE conditions
    const searchPattern = `%${query}%`;
    const searchParam = this.addParam(searchPattern);
    this.whereConditions.push(`(
      p.name ILIKE $${searchParam} OR
      p.description ILIKE $${searchParam} OR
      p.sku ILIKE $${searchParam} OR
      p.tags::text ILIKE $${searchParam}
    )`);

    // Always filter to active products for public search
    if (options.status !== ProductStatus.DRAFT) {
      this.whereConditions.push(`p.status = $${this.addParam('active')}`);
    }

    // Apply additional filters
    this.applyAdditionalFilters(options);

    const baseQuery = `
      FROM products p
      WHERE ${this.whereConditions.join(' AND ')}
    `;

    // Save params for count query BEFORE building ORDER BY
    // Reuse the searchParam for ORDER BY instead of creating new params
    const countParams = [...this.params];
    const countSql = `SELECT COUNT(*)::int as total ${baseQuery}`;

    // Sort by relevance for search - reuse existing searchParam instead of adding new params
    this.orderBy = `
      CASE 
        WHEN p.name ILIKE $${searchParam} THEN 1
        WHEN p.sku ILIKE $${searchParam} THEN 2
        ELSE 3
      END,
      p.featured DESC,
      p.name ASC
    `;

    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;

    const sql = `
      SELECT 
        p.id, p.type, p.sku, p.gtin_upc_ean_isbn, p.name, p.slug,
        p.published, p.is_featured, p.visibility_in_catalog,
        p.short_description, p.description,
        p.date_sale_price_starts, p.date_sale_price_ends,
        p.tax_status, p.tax_class, p.in_stock, p.stock,
        p.low_stock_amount, p.backorders_allowed, p.sold_individually,
        p.weight_lbs, p.length_in, p.width_in, p.height_in,
        p.allow_customer_reviews, p.purchase_note,
        p.sale_price, p.regular_price, p.categories, p.tags,
        p.shipping_class, p.brands, p.created_at, p.updated_at,
        p.status, p.featured, p.price_min, p.price_max, p.meta_data,
        p.seo_title, p.seo_description,
        p.is_on_sale, p.sale_start_date, p.sale_end_date, p.sale_label,
        COALESCE(
          (SELECT json_agg(row_to_json(pi))
           FROM (SELECT * FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) pi),
          '[]'::json
        ) as images
      ${baseQuery}
      ORDER BY ${this.orderBy}
      LIMIT $${this.addParam(limit)} OFFSET $${this.addParam(offset)}
    `;

    return {
      sql,
      params: this.params,
      countSql,
      countParams
    };
  }

  /**
   * Apply filters to query
   */
  private applyFilters(options: ProductQueryOptions): void {
    // Filter out soft-deleted products by default (unless includeDeleted is true)
    if (!options.includeDeleted) {
      this.whereConditions.push('p.deleted_at IS NULL');
    }

    // Status filter (default to active for public queries)
    // Allow admin to see all statuses if status is explicitly null/undefined
    if (options.status) {
      this.whereConditions.push(`p.status = $${this.addParam(options.status)}`);
    } else {
      // For public queries, only show active products
      this.whereConditions.push(`(p.status = $${this.addParam('active')} OR p.status IS NULL)`);
    }

    this.applyAdditionalFilters(options);
  }

  /**
   * Apply additional filters (used by both regular and search queries)
   */
  private applyAdditionalFilters(options: ProductQueryOptions): void {
    // Region filter - IMPORTANT: filters products by region (us or eu)
    if (options.region) {
      this.whereConditions.push(`p.region = $${this.addParam(options.region)}`);
    }

    // Category filter (categories stored as TEXT with JSON)
    if (options.category) {
      this.whereConditions.push(`p.categories::text LIKE $${this.addParam(`%"${options.category}"%`)}`);
    }

    // Price range filter
    if (options.minPrice !== undefined) {
      this.whereConditions.push(`p.regular_price >= $${this.addParam(options.minPrice)}`);
    }
    if (options.maxPrice !== undefined) {
      this.whereConditions.push(`p.regular_price <= $${this.addParam(options.maxPrice)}`);
    }

    // Stock filter (database uses 'stock' not 'stock_quantity')
    if (options.inStock !== undefined) {
      if (options.inStock) {
        this.whereConditions.push(`p.stock > 0`);
      } else {
        this.whereConditions.push(`p.stock = 0`);
      }
    }

    // Featured filter
    if (options.featured !== undefined) {
      this.whereConditions.push(`p.featured = $${this.addParam(options.featured)}`);
    }

    // Tags filter (tags stored as TEXT with JSON)
    if (options.tags && options.tags.length > 0) {
      const tagConditions = options.tags.map(tag => `p.tags LIKE $${this.addParam(`%${tag}%`)}`);
      this.whereConditions.push(`(${tagConditions.join(' OR ')})`);
    }

    // Search filter
    if (options.search) {
      const searchParam = this.addParam(`%${options.search}%`);
      this.whereConditions.push(`(
        p.name ILIKE $${searchParam} OR
        p.description ILIKE $${searchParam}
      )`);
    }
  }

  /**
   * Apply sorting
   */
  private applySort(options: ProductQueryOptions): void {
    const sortBy = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder || 'desc';
    const order = sortOrder.toUpperCase();

    switch (sortBy) {
      case 'name':
        this.orderBy = `p.name ${order}`;
        break;
      case 'price':
        this.orderBy = `p.regular_price ${order}`;
        break;
      case 'featured':
        this.orderBy = `p.featured DESC, p.created_at DESC`;
        break;
      case 'rating':
        this.orderBy = `(SELECT COALESCE(AVG(pr.rating), 0) FROM product_reviews pr WHERE pr.product_id = p.id) ${order}`;
        break;
      case 'created_at':
      default:
        this.orderBy = `p.created_at ${order}`;
        break;
    }
  }

  /**
   * Add parameter and return its index
   */
  private addParam(value: any): number {
    this.params.push(value);
    return this.paramCounter++;
  }

  /**
   * Reset query builder state
   */
  private reset(): void {
    this.whereConditions = [];
    this.params = [];
    this.paramCounter = 1;
    this.orderBy = 'p.created_at DESC';
  }

  /**
   * Get featured products
   * Filters by region and ensures only one product per group is returned
   */
  buildFeaturedQuery(limit: number = 6, region?: 'us' | 'eu'): { sql: string; params: any[] } {
    this.reset();
    
    const regionFilter = region ? `AND p.region = $${this.addParam(region)}` : '';
    
    // Filter by region to ensure only products for current region are shown
    // DISTINCT ON ensures only one product per product_group_id (in case of edge cases)
    // If product_group_id is NULL, each product is distinct
    const sql = `
      SELECT DISTINCT ON (COALESCE(p.product_group_id::text, p.id::text))
        p.id, p.type, p.sku, p.gtin_upc_ean_isbn, p.name, p.slug,
        p.published, p.is_featured, p.visibility_in_catalog,
        p.short_description, p.description,
        p.date_sale_price_starts, p.date_sale_price_ends,
        p.tax_status, p.tax_class, p.in_stock, p.stock,
        p.low_stock_amount, p.backorders_allowed, p.sold_individually,
        p.weight_lbs, p.length_in, p.width_in, p.height_in,
        p.allow_customer_reviews, p.purchase_note,
        p.sale_price, p.regular_price, p.categories, p.tags,
        p.shipping_class, p.brands, p.created_at, p.updated_at,
        p.status, p.featured, p.price_min, p.price_max, p.meta_data,
        p.seo_title, p.seo_description,
        p.region, p.product_group_id,
        COALESCE(
          (SELECT json_agg(row_to_json(pi))
           FROM (SELECT * FROM product_images WHERE product_id = p.id ORDER BY sort_order) pi),
          '[]'::json
        ) as images,
        (SELECT COUNT(*)::int FROM product_reviews pr WHERE pr.product_id = p.id) as review_count,
        (SELECT COALESCE(AVG(pr.rating), 0) FROM product_reviews pr WHERE pr.product_id = p.id) as rating_average
      FROM products p
      WHERE p.status = $${this.addParam('active')}
        AND p.featured = $${this.addParam(true)}
        AND p.deleted_at IS NULL
        ${regionFilter}
      ORDER BY COALESCE(p.product_group_id::text, p.id::text), p.created_at DESC
      LIMIT $${this.addParam(limit)}
    `;

    return { sql, params: this.params };
  }

  /**
   * Get product categories with counts
   */
  buildCategoriesQuery(region?: 'us' | 'eu'): { sql: string; params: any[] } {
    this.reset();
    
    const regionFilter = region ? `AND region = $${this.addParam(region)}` : '';
    
    // For now, return hardcoded categories since parsing TEXT JSON is complex
    // This will be improved when we migrate to proper JSONB
    const sql = `
      SELECT 'flight-sim' as category, COUNT(*)::int as count
      FROM products WHERE status = 'active' AND deleted_at IS NULL AND categories::text LIKE '%"flight-sim"%' ${regionFilter}
      UNION ALL
      SELECT 'sim-racing' as category, COUNT(*)::int as count
      FROM products WHERE status = 'active' AND deleted_at IS NULL AND categories::text LIKE '%"sim-racing"%' ${regionFilter}
      UNION ALL
      SELECT 'cockpits' as category, COUNT(*)::int as count
      FROM products WHERE status = 'active' AND deleted_at IS NULL AND categories::text LIKE '%"cockpits"%' ${regionFilter}
      UNION ALL
      SELECT 'monitor-stands' as category, COUNT(*)::int as count
      FROM products WHERE status = 'active' AND deleted_at IS NULL AND categories::text LIKE '%"monitor-stands"%' ${regionFilter}
      UNION ALL
      SELECT 'accessories' as category, COUNT(*)::int as count
      FROM products WHERE status = 'active' AND deleted_at IS NULL AND categories::text LIKE '%"accessories"%' ${regionFilter}
      UNION ALL
      SELECT 'conversion-kits' as category, COUNT(*)::int as count
      FROM products WHERE status = 'active' AND deleted_at IS NULL AND categories::text LIKE '%"conversion-kits"%' ${regionFilter}
      UNION ALL
      SELECT 'services' as category, COUNT(*)::int as count
      FROM products WHERE status = 'active' AND deleted_at IS NULL AND categories::text LIKE '%"services"%' ${regionFilter}
      UNION ALL
      SELECT 'individual-parts' as category, COUNT(*)::int as count
      FROM products WHERE status = 'active' AND deleted_at IS NULL AND categories::text LIKE '%"individual-parts"%' ${regionFilter}
      UNION ALL
      SELECT 'racing-flight-seats' as category, COUNT(*)::int as count
      FROM products WHERE status = 'active' AND deleted_at IS NULL AND categories::text LIKE '%"racing-flight-seats"%' ${regionFilter}
      UNION ALL
      SELECT 'refurbished' as category, COUNT(*)::int as count
      FROM products WHERE status = 'active' AND deleted_at IS NULL AND categories::text LIKE '%"refurbished"%' ${regionFilter}
      ORDER BY count DESC
    `;

    return { sql, params: this.params };
  }

  /**
   * Get price range for active products
   */
  buildPriceRangeQuery(category?: string): { sql: string; params: any[] } {
    this.reset();
    
    this.whereConditions.push(`p.status = $${this.addParam('active')}`);
    this.whereConditions.push(`p.regular_price IS NOT NULL`);
    
    if (category) {
      this.whereConditions.push(`p.categories LIKE $${this.addParam(`%${category}%`)}`);
    }

    const sql = `
      SELECT 
        MIN(p.regular_price) as min_price,
        MAX(p.regular_price) as max_price
      FROM products p
      WHERE ${this.whereConditions.join(' AND ')}
    `;

    return { sql, params: this.params };
  }
}

