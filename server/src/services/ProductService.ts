/**
 * Product Service
 * Core service for product CRUD operations
 */

import { Pool } from 'pg';
import { 
  Product, 
  ProductWithImages,
  ProductWithDetails, 
  CreateProductDto, 
  UpdateProductDto,
  ProductQueryOptions,
  PaginatedProducts,
  ProductStatus
} from '../types/product';
import { ProductQueryBuilder } from './ProductQueryBuilder';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';

export class ProductService {
  private queryBuilder: ProductQueryBuilder;

  constructor(private pool: Pool) {
    this.queryBuilder = new ProductQueryBuilder(pool);
  }

  /**
   * Get all products with filters and pagination
   * VERSION: 2.0 - FIXED FILTERING AND IMAGES
   */
  async getProducts(options: ProductQueryOptions = {}): Promise<PaginatedProducts> {
    try {
      
      const { sql, params, countSql, countParams } = this.queryBuilder.build(options);


      // Execute queries in parallel
      const [productsResult, countResult] = await Promise.all([
        this.pool.query(sql, params),
        this.pool.query(countSql, countParams)
      ]);

      const products = productsResult.rows;
      const total = countResult.rows[0]?.total || 0;
      const page = options.page || 1;
      const limit = options.limit || 20;
      const totalPages = Math.ceil(total / limit);

      // Get filter metadata if requested
      let filters;
      if (options.category || !options.search) {
        const categoriesQuery = this.queryBuilder.buildCategoriesQuery(options.region);
        const priceRangeQuery = this.queryBuilder.buildPriceRangeQuery(options.category);
        
        const [categoriesResult, priceRangeResult] = await Promise.all([
          this.pool.query(categoriesQuery.sql, categoriesQuery.params),
          this.pool.query(priceRangeQuery.sql, priceRangeQuery.params)
        ]);

        filters = {
          categories: categoriesResult.rows.map((row: any) => ({
            id: row.category,
            name: this.formatCategoryName(row.category),
            count: row.count
          })),
          priceRange: {
            min: priceRangeResult.rows[0]?.min_price || 0,
            max: priceRangeResult.rows[0]?.max_price || 10000
          }
        };
      }

      return {
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1
        },
        filters
      };
    } catch (error) {
      console.error('Error getting products:', error);
      throw error;
    }
  }

  /**
   * Get product by ID with all details
   * Optionally filter by region if provided
   */
  async getProductById(id: number | string, region?: 'us' | 'eu'): Promise<ProductWithDetails> {
    // Validate and convert ID
    let productId: number;
    if (typeof id === 'number') {
      if (isNaN(id) || id <= 0 || !Number.isInteger(id)) {
        throw new Error(`Invalid product ID: ${id}`);
      }
      productId = id;
    } else {
      const strId = String(id).trim();
      if (strId === '' || strId.toLowerCase() === 'nan') {
        throw new Error(`Invalid product ID: "${strId}"`);
      }
      productId = parseInt(strId, 10);
      if (isNaN(productId) || productId <= 0 || !Number.isInteger(productId)) {
        throw new Error(`Invalid product ID: "${strId}"`);
      }
    }
    try {
      const regionFilter = region ? `AND p.region = $2` : '';
      const params = region ? [productId, region] : [productId];
      
      const sql = `
        SELECT 
          p.*,
          COALESCE(
            (SELECT json_agg(pi ORDER BY pi.sort_order)
             FROM product_images pi
             WHERE pi.product_id = p.id),
            '[]'::json
          ) as images,
          (SELECT COUNT(*)::int FROM product_reviews pr WHERE pr.product_id = p.id) as review_count,
          (SELECT COALESCE(AVG(pr.rating), 0) FROM product_reviews pr WHERE pr.product_id = p.id) as rating_average
        FROM products p
        WHERE p.id = $1 ${regionFilter}
      `;

      const result = await this.pool.query(sql, params);

      if (result.rows.length === 0) {
        throw new NotFoundError('Product', { productId });
      }

      const product = result.rows[0];

      // Get variations with options
      const variations = await this.getProductVariations(productId);

      // Get FAQs
      const faqs = await this.getProductFAQs(productId);

      // Get description components
      const descriptionComponents = await this.getProductDescriptionComponents(productId);

      // Get assembly manuals
      const assemblyManuals = await this.getAssemblyManuals(productId);

      // Get additional info
      const additionalInfo = await this.getAdditionalInfo(productId);

      return {
        ...product,
        variations,
        faqs,
        descriptionComponents,
        assemblyManuals,
        additionalInfo,
        rating: {
          average: parseFloat(product.rating_average) || 0,
          count: product.review_count || 0
        }
      };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.error('Error getting product by ID:', error);
      throw error;
    }
  }

  /**
   * Get product by slug
   * @param slug - Product slug
   * @param region - Region filter ('us' | 'eu'). If provided, only returns products from that region.
   */
  async getProductBySlug(slug: string, region?: 'us' | 'eu'): Promise<ProductWithDetails> {
    try {
      let sql = 'SELECT id FROM products WHERE slug = $1 AND status = $2';
      const params: any[] = [slug, ProductStatus.ACTIVE];
      
      // Filter by region if provided
      if (region) {
        sql += ' AND region = $3';
        params.push(region);
      }
      
      const result = await this.pool.query(sql, params);

      if (result.rows.length === 0) {
        throw new NotFoundError('Product', { slug, region });
      }

      return this.getProductById(result.rows[0].id, region);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.error('Error getting product by slug:', error);
      throw error;
    }
  }

  /**
   * Create new product
   */
  async createProduct(data: CreateProductDto): Promise<Product> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Generate slug if not provided
      const slug = data.slug || this.generateSlug(data.name);

      // Use actual database column names
      // Default region to 'us' if not provided
      const region = data.region || 'us';

      // Check for duplicate SKU in the same region (SKU is unique per region)
      const skuCheck = await client.query('SELECT id FROM products WHERE sku = $1 AND region = $2', [data.sku, region]);
      if (skuCheck.rows.length > 0) {
        throw new ConflictError(`Product with SKU "${data.sku}" already exists in ${region.toUpperCase()} region`, 'SKU_EXISTS');
      }

      // Check for duplicate slug in the same region (slug is unique per region)
      const slugCheck = await client.query('SELECT id FROM products WHERE slug = $1 AND region = $2', [slug, region]);
      if (slugCheck.rows.length > 0) {
        throw new ConflictError(`Product with slug "${slug}" already exists in ${region.toUpperCase()} region`, 'DUPLICATE_ENTRY');
      }
      // Only set product_group_id if explicitly provided (for multi-region products)
      // Single-region products should have product_group_id = NULL
      // This prevents orphaned product_group_ids from showing as "linked" when no paired product exists
      const productGroupId = data.product_group_id !== undefined && data.product_group_id !== null && data.product_group_id !== ''
        ? data.product_group_id 
        : null;
      
      const sql = `
        INSERT INTO products (
          sku, name, slug, description, short_description, type, status, featured,
          regular_price, sale_price,
          weight_lbs, length_in, width_in, height_in,
          stock, low_stock_amount, in_stock,
          tax_class, shipping_class,
          categories, tags, meta_data,
          seo_title, seo_description,
          region, product_group_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17,
          $18, $19,
          $20, $21, $22,
          $23, $24,
          $25, $26
        )
        RETURNING *
      `;

      const stockQty = data.stock_quantity || 0;
      const values = [
        data.sku,
        data.name,
        slug,
        data.description || null,
        data.short_description || null,
        data.type,
        data.status || ProductStatus.DRAFT,
        data.featured || false,
        data.regular_price,
        data.sale_price || null,
        data.weight_lbs || null,
        data.length_in || null,
        data.width_in || null,
        data.height_in || null,
        stockQty,
        data.low_stock_threshold || 5,
        stockQty > 0 ? '1' : '0',
        data.tax_class || null,
        data.shipping_class || null,
        data.categories ? JSON.stringify(data.categories) : null,
        data.tags ? JSON.stringify(data.tags) : null,
        data.meta_data ? JSON.stringify(data.meta_data) : null,
        data.seo_title || data.name,
        data.seo_description || data.short_description || null,
        region,
        productGroupId
      ];

      const result = await client.query(sql, values);
      await client.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof ConflictError) throw error;
      console.error('Error creating product:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update product
   * If product is part of a group, syncs shared fields to the paired product automatically
   */
  async updateProduct(id: number, data: Partial<UpdateProductDto>): Promise<Product> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get product info to check if it's part of a group
      const productResult = await client.query(
        'SELECT id, region, product_group_id FROM products WHERE id = $1', 
        [id]
      );
      
      if (productResult.rows.length === 0) {
        throw new NotFoundError('Product', { productId: id });
      }

      const currentProduct = productResult.rows[0];
      const hasGroup = currentProduct.product_group_id !== null;
      
      // If product is in a group, find the paired product (opposite region)
      let pairedProductId: number | null = null;
      if (hasGroup) {
        const oppositeRegion = currentProduct.region === 'us' ? 'eu' : 'us';
        const pairedResult = await client.query(
          'SELECT id FROM products WHERE product_group_id = $1 AND region = $2 AND id != $3',
          [currentProduct.product_group_id, oppositeRegion, id]
        );
        if (pairedResult.rows.length > 0) {
          pairedProductId = pairedResult.rows[0].id;
        }
      }

      // Fields that should be synced to paired product (everything except stock, pricing, and SKU)
      const sharedFields = [
        'name', 'slug', 'description', 'short_description', 'type', 'status', 'featured',
        'weight_lbs', 'length_in', 'width_in', 'height_in',
        'tax_class', 'shipping_class', 'categories', 'tags', 'meta_data',
        'seo_title', 'seo_description'
      ];

      // Fields that are region-specific (should NOT be synced)
      // Pricing is region-specific because US uses USD and EU uses EUR
      const regionSpecificFields = [
        'stock', 'stock_quantity', 'low_stock_amount', 'low_stock_threshold', 'in_stock', 'sku', 'region',
        'regular_price', 'sale_price', 'is_on_sale', 'sale_start_date', 'sale_end_date', 'sale_label'
      ];

      // Build dynamic update query for the main product
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCounter = 1;

      // Helper to add field to update
      const addField = (field: string, value: any) => {
        if (value !== undefined) {
          updateFields.push(`${field} = $${paramCounter}`);
          values.push(value);
          paramCounter++;
        }
      };
      
      // Helper to force add field (even if null)
      const forceAddField = (field: string, value: any) => {
        updateFields.push(`${field} = $${paramCounter}`);
        values.push(value);
        paramCounter++;
      };

      // Track which shared fields are being updated (for syncing)
      const sharedFieldsToSync: Record<string, any> = {};

      // Add all possible fields (using actual database columns)
      if (data.name !== undefined) {
        addField('name', data.name);
        if (hasGroup) sharedFieldsToSync['name'] = data.name;
      }
      if (data.slug !== undefined) {
        addField('slug', data.slug);
        if (hasGroup) sharedFieldsToSync['slug'] = data.slug;
      }
      if (data.description !== undefined) {
        addField('description', data.description);
        if (hasGroup) sharedFieldsToSync['description'] = data.description;
      }
      if (data.short_description !== undefined) {
        addField('short_description', data.short_description);
        if (hasGroup) sharedFieldsToSync['short_description'] = data.short_description;
      }
      if (data.type !== undefined) {
        addField('type', data.type);
        if (hasGroup) sharedFieldsToSync['type'] = data.type;
      }
      if (data.status !== undefined) {
        addField('status', data.status);
        if (hasGroup) sharedFieldsToSync['status'] = data.status;
      }
      if (data.featured !== undefined) {
        addField('featured', data.featured);
        if (hasGroup) sharedFieldsToSync['featured'] = data.featured;
      }
      // Pricing fields - region-specific (USD for US, EUR for EU), NOT synced
      if (data.regular_price !== undefined) {
        addField('regular_price', data.regular_price);
        // Do NOT sync prices - they are region-specific
      }
      if (data.sale_price !== undefined) {
        addField('sale_price', data.sale_price);
        // Do NOT sync prices - they are region-specific
      }
      
      // Discount fields - region-specific (sale can be active in one region but not the other)
      if (data.is_on_sale !== undefined) {
        forceAddField('is_on_sale', data.is_on_sale);
        // Do NOT sync sale status - it's region-specific
      }
      if ('sale_start_date' in data) {
        forceAddField('sale_start_date', data.sale_start_date);
        // Do NOT sync sale dates - they are region-specific
      }
      if ('sale_end_date' in data) {
        forceAddField('sale_end_date', data.sale_end_date);
        // Do NOT sync sale dates - they are region-specific
      }
      if ('sale_label' in data) {
        forceAddField('sale_label', data.sale_label);
        // Do NOT sync sale label - it's region-specific
      }
      
      if (data.weight_lbs !== undefined) {
        addField('weight_lbs', data.weight_lbs);
        if (hasGroup) sharedFieldsToSync['weight_lbs'] = data.weight_lbs;
      }
      if (data.length_in !== undefined) {
        addField('length_in', data.length_in);
        if (hasGroup) sharedFieldsToSync['length_in'] = data.length_in;
      }
      if (data.width_in !== undefined) {
        addField('width_in', data.width_in);
        if (hasGroup) sharedFieldsToSync['width_in'] = data.width_in;
      }
      if (data.height_in !== undefined) {
        addField('height_in', data.height_in);
        if (hasGroup) sharedFieldsToSync['height_in'] = data.height_in;
      }
      
      // Stock fields - NOT synced (region-specific)
      addField('stock', data.stock_quantity);
      addField('low_stock_amount', data.low_stock_threshold);
      
      if (data.tax_class !== undefined) {
        addField('tax_class', data.tax_class);
        if (hasGroup) sharedFieldsToSync['tax_class'] = data.tax_class;
      }
      if (data.shipping_class !== undefined) {
        addField('shipping_class', data.shipping_class);
        if (hasGroup) sharedFieldsToSync['shipping_class'] = data.shipping_class;
      }
      
      if (data.categories) {
        const categoriesJson = JSON.stringify(data.categories);
        addField('categories', categoriesJson);
        if (hasGroup) sharedFieldsToSync['categories'] = categoriesJson;
      }
      if (data.tags) {
        const tagsJson = JSON.stringify(data.tags);
        addField('tags', tagsJson);
        if (hasGroup) sharedFieldsToSync['tags'] = tagsJson;
      }
      if (data.meta_data) {
        const metaDataJson = JSON.stringify(data.meta_data);
        addField('meta_data', metaDataJson);
        if (hasGroup) sharedFieldsToSync['meta_data'] = metaDataJson;
      }
      
      if (data.seo_title !== undefined) {
        addField('seo_title', data.seo_title);
        if (hasGroup) sharedFieldsToSync['seo_title'] = data.seo_title;
      }
      if (data.seo_description !== undefined) {
        addField('seo_description', data.seo_description);
        if (hasGroup) sharedFieldsToSync['seo_description'] = data.seo_description;
      }
      
      // Region support (these shouldn't change, but handle if needed)
      addField('region', data.region);
      addField('product_group_id', data.product_group_id);
      
      // Update in_stock based on stock quantity (region-specific, not synced)
      if (data.stock_quantity !== undefined) {
        addField('in_stock', data.stock_quantity > 0 ? '1' : '0');
      }

      if (updateFields.length === 0) {
        throw new ValidationError('No fields to update');
      }

      // Always update updated_at
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      // Update the main product
      const sql = `
        UPDATE products
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING *
      `;

      values.push(id);
      const result = await client.query(sql, values);
      const updatedProduct = result.rows[0];

      // If product is in a group and we have shared fields to sync, update the paired product
      if (hasGroup && pairedProductId && Object.keys(sharedFieldsToSync).length > 0) {
        const syncFields: string[] = [];
        const syncValues: any[] = [];
        let syncParamCounter = 1;

        // Build sync update for paired product
        if ('name' in sharedFieldsToSync) {
          syncFields.push(`name = $${syncParamCounter++}`);
          syncValues.push(sharedFieldsToSync.name);
        }
        if ('slug' in sharedFieldsToSync) {
          syncFields.push(`slug = $${syncParamCounter++}`);
          syncValues.push(sharedFieldsToSync.slug);
        }
        if ('description' in sharedFieldsToSync) {
          syncFields.push(`description = $${syncParamCounter++}`);
          syncValues.push(sharedFieldsToSync.description);
        }
        if ('short_description' in sharedFieldsToSync) {
          syncFields.push(`short_description = $${syncParamCounter++}`);
          syncValues.push(sharedFieldsToSync.short_description);
        }
        if ('type' in sharedFieldsToSync) {
          syncFields.push(`type = $${syncParamCounter++}`);
          syncValues.push(sharedFieldsToSync.type);
        }
        if ('status' in sharedFieldsToSync) {
          syncFields.push(`status = $${syncParamCounter++}`);
          syncValues.push(sharedFieldsToSync.status);
        }
        if ('featured' in sharedFieldsToSync) {
          syncFields.push(`featured = $${syncParamCounter++}`);
          syncValues.push(sharedFieldsToSync.featured);
        }
        if ('regular_price' in sharedFieldsToSync) {
          syncFields.push(`regular_price = $${syncParamCounter++}`);
          syncValues.push(sharedFieldsToSync.regular_price);
        }
        if ('sale_price' in sharedFieldsToSync) {
          syncFields.push(`sale_price = $${syncParamCounter++}`);
          syncValues.push(sharedFieldsToSync.sale_price);
        }
        if ('is_on_sale' in sharedFieldsToSync) {
          syncFields.push(`is_on_sale = $${syncParamCounter++}`);
          syncValues.push(sharedFieldsToSync.is_on_sale);
        }
        if ('sale_start_date' in sharedFieldsToSync) {
          syncFields.push(`sale_start_date = $${syncParamCounter++}`);
          syncValues.push(sharedFieldsToSync.sale_start_date);
        }
        if ('sale_end_date' in sharedFieldsToSync) {
          syncFields.push(`sale_end_date = $${syncParamCounter++}`);
          syncValues.push(sharedFieldsToSync.sale_end_date);
        }
        if ('sale_label' in sharedFieldsToSync) {
          syncFields.push(`sale_label = $${syncParamCounter++}`);
          syncValues.push(sharedFieldsToSync.sale_label);
        }
        if ('weight_lbs' in sharedFieldsToSync) {
          syncFields.push(`weight_lbs = $${syncParamCounter++}`);
          syncValues.push(sharedFieldsToSync.weight_lbs);
        }
        if ('length_in' in sharedFieldsToSync) {
          syncFields.push(`length_in = $${syncParamCounter++}`);
          syncValues.push(sharedFieldsToSync.length_in);
        }
        if ('width_in' in sharedFieldsToSync) {
          syncFields.push(`width_in = $${syncParamCounter++}`);
          syncValues.push(sharedFieldsToSync.width_in);
        }
        if ('height_in' in sharedFieldsToSync) {
          syncFields.push(`height_in = $${syncParamCounter++}`);
          syncValues.push(sharedFieldsToSync.height_in);
        }
        if ('tax_class' in sharedFieldsToSync) {
          syncFields.push(`tax_class = $${syncParamCounter++}`);
          syncValues.push(sharedFieldsToSync.tax_class);
        }
        if ('shipping_class' in sharedFieldsToSync) {
          syncFields.push(`shipping_class = $${syncParamCounter++}`);
          syncValues.push(sharedFieldsToSync.shipping_class);
        }
        if ('categories' in sharedFieldsToSync) {
          syncFields.push(`categories = $${syncParamCounter++}`);
          syncValues.push(sharedFieldsToSync.categories);
        }
        if ('tags' in sharedFieldsToSync) {
          syncFields.push(`tags = $${syncParamCounter++}`);
          syncValues.push(sharedFieldsToSync.tags);
        }
        if ('meta_data' in sharedFieldsToSync) {
          syncFields.push(`meta_data = $${syncParamCounter++}`);
          syncValues.push(sharedFieldsToSync.meta_data);
        }
        if ('seo_title' in sharedFieldsToSync) {
          syncFields.push(`seo_title = $${syncParamCounter++}`);
          syncValues.push(sharedFieldsToSync.seo_title);
        }
        if ('seo_description' in sharedFieldsToSync) {
          syncFields.push(`seo_description = $${syncParamCounter++}`);
          syncValues.push(sharedFieldsToSync.seo_description);
        }

        if (syncFields.length > 0) {
          syncFields.push(`updated_at = CURRENT_TIMESTAMP`);
          syncValues.push(pairedProductId);
          
          const syncSql = `
            UPDATE products
            SET ${syncFields.join(', ')}
            WHERE id = $${syncParamCounter}
          `;
          
          await client.query(syncSql, syncValues);
          console.log(`Synced ${syncFields.length - 1} shared fields to paired product ${pairedProductId}`);
        }
      }

      await client.query('COMMIT');

      return updatedProduct;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundError || error instanceof ValidationError) throw error;
      console.error('Error updating product:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create product group (both US and EU regions)
   * Creates two products with the same product_group_id, sharing all data except stock
   */
  async createProductGroup(data: {
    name: string;
    slug: string;
    description?: string | null;
    short_description?: string | null;
    type: string;
    status: string;
    featured: boolean;
    regular_price: number;
    categories?: string[];
    tags?: string[];
    sku: string;
    stock_quantity_us: number;
    stock_quantity_eu: number;
  }): Promise<{ us: Product; eu: Product }> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Generate a single product_group_id for both products
      const productGroupIdResult = await client.query('SELECT gen_random_uuid() as group_id');
      const productGroupId = productGroupIdResult.rows[0].group_id;

      // Check for duplicate SKU in US region
      const skuCheckUs = await client.query('SELECT id FROM products WHERE sku = $1 AND region = $2', [data.sku, 'us']);
      if (skuCheckUs.rows.length > 0) {
        throw new ConflictError(`SKU "${data.sku}" already exists in US region`, 'SKU_EXISTS');
      }

      // Check for duplicate SKU in EU region
      const skuCheckEu = await client.query('SELECT id FROM products WHERE sku = $1 AND region = $2', [data.sku, 'eu']);
      if (skuCheckEu.rows.length > 0) {
        throw new ConflictError(`SKU "${data.sku}" already exists in EU region`, 'SKU_EXISTS');
      }

      // Check for duplicate slug in US region
      const slugCheckUs = await client.query('SELECT id FROM products WHERE slug = $1 AND region = $2', [data.slug, 'us']);
      if (slugCheckUs.rows.length > 0) {
        throw new ConflictError(`Product with slug "${data.slug}" already exists in US region`, 'DUPLICATE_ENTRY');
      }
      
      // Check for duplicate slug in EU region
      const slugCheckEu = await client.query('SELECT id FROM products WHERE slug = $1 AND region = $2', [data.slug, 'eu']);
      if (slugCheckEu.rows.length > 0) {
        throw new ConflictError(`Product with slug "${data.slug}" already exists in EU region`, 'DUPLICATE_ENTRY');
      }

      const insertSql = `
        INSERT INTO products (
          sku, name, slug, description, short_description, type, status, featured,
          regular_price, sale_price,
          stock, low_stock_amount, in_stock,
          categories, tags,
          seo_title, seo_description,
          region, product_group_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, NULL,
          $10, 5, $11,
          $12, $13,
          $14, $15,
          $16, $17
        )
        RETURNING *
      `;

      // Create US product
      const usStockQty = data.stock_quantity_us || 0;
      const usValues = [
        data.sku, // Same SKU for both regions
        data.name,
        data.slug,
        data.description || null,
        data.short_description || null,
        data.type,
        data.status || ProductStatus.DRAFT,
        data.featured || false,
        data.regular_price,
        usStockQty,
        usStockQty > 0 ? '1' : '0',
        data.categories ? JSON.stringify(data.categories) : null,
        data.tags ? JSON.stringify(data.tags) : null,
        data.name,
        data.short_description || null,
        'us',
        productGroupId
      ];
      const usResult = await client.query(insertSql, usValues);
      const usProduct = usResult.rows[0];

      // Create EU product
      const euStockQty = data.stock_quantity_eu || 0;
      const euValues = [
        data.sku, // Same SKU for both regions
        data.name,
        data.slug,
        data.description || null,
        data.short_description || null,
        data.type,
        data.status || ProductStatus.DRAFT,
        data.featured || false,
        data.regular_price,
        euStockQty,
        euStockQty > 0 ? '1' : '0',
        data.categories ? JSON.stringify(data.categories) : null,
        data.tags ? JSON.stringify(data.tags) : null,
        data.name,
        data.short_description || null,
        'eu',
        productGroupId
      ];
      const euResult = await client.query(insertSql, euValues);
      const euProduct = euResult.rows[0];

      await client.query('COMMIT');

      return { us: usProduct, eu: euProduct };
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof ConflictError) throw error;
      console.error('Error creating product group:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Break product group (unlink products)
   * Sets product_group_id to NULL for all products in the group
   */
  async breakProductGroup(productGroupId: string): Promise<void> {
    try {
      const result = await this.pool.query(
        'UPDATE products SET product_group_id = NULL WHERE product_group_id = $1',
        [productGroupId]
      );

      if (result.rowCount === 0) {
        throw new NotFoundError('ProductGroup', { productGroupId });
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.error('Error breaking product group:', error);
      throw error;
    }
  }

  /**
   * Get products by group ID
   */
  async getProductsByGroupId(productGroupId: string): Promise<Product[]> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM products WHERE product_group_id = $1 ORDER BY region',
        [productGroupId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting products by group ID:', error);
      throw error;
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(id: number): Promise<void> {
    try {
      const result = await this.pool.query('DELETE FROM products WHERE id = $1', [id]);

      if (result.rowCount === 0) {
        throw new NotFoundError('Product', { productId: id });
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  /**
   * Get featured products
   * Filters by region to show only products for the current region
   */
  async getFeaturedProducts(limit: number = 6, region?: 'us' | 'eu'): Promise<Product[]> {
    try {
      console.log('🏭 ProductService.getFeaturedProducts:', {
        limit,
        region,
        'region type': typeof region
      });
      
      const { sql, params } = this.queryBuilder.buildFeaturedQuery(limit, region);
      
      console.log('📝 SQL Query:', sql);
      console.log('📝 SQL Params:', params);
      
      const result = await this.pool.query(sql, params);
      
      console.log('📊 Query result:', {
        rowCount: result.rows.length,
        products: result.rows.map(p => ({ id: p.id, name: p.name, region: p.region, sku: p.sku }))
      });
      
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting featured products:', error);
      throw error;
    }
  }

  /**
   * Search products
   */
  async searchProducts(query: string, options: ProductQueryOptions = {}): Promise<PaginatedProducts> {
    try {
      const { sql, params, countSql, countParams } = this.queryBuilder.buildSearch(query, options);

      const [productsResult, countResult] = await Promise.all([
        this.pool.query(sql, params),
        this.pool.query(countSql, countParams)
      ]);

      const products = productsResult.rows;
      const total = countResult.rows[0]?.total || 0;
      const page = options.page || 1;
      const limit = options.limit || 10;
      const totalPages = Math.ceil(total / limit);

      return {
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1
        }
      };
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async getProductVariations(productId: number) {
    const sql = `
      SELECT 
        v.*,
        COALESCE(
          (SELECT json_agg(vo ORDER BY vo.sort_order)
           FROM variation_options vo
           WHERE vo.variation_id = v.id),
          '[]'::json
        ) as options
      FROM product_variations v
      WHERE v.product_id = $1
      ORDER BY v.sort_order
    `;

    const result = await this.pool.query(sql, [productId]);
    const variations = result.rows;

    // Group by type
    return {
      text: variations.filter(v => v.variation_type === 'text'),
      dropdown: variations.filter(v => v.variation_type === 'dropdown'),
      image: variations.filter(v => v.variation_type === 'image'),
      boolean: variations.filter(v => v.variation_type === 'boolean')
    };
  }

  private async getProductFAQs(productId: number) {
    const sql = `
      SELECT * FROM product_faqs
      WHERE product_id = $1
      ORDER BY sort_order
    `;

    const result = await this.pool.query(sql, [productId]);
    return result.rows;
  }

  /**
   * Get product description components
   */
  private async getProductDescriptionComponents(productId: number) {
    const sql = `
      SELECT id, product_id, component_type, content, sort_order, is_active, created_at, updated_at
      FROM product_description_components
      WHERE product_id = $1 AND is_active = true
      ORDER BY sort_order ASC, created_at ASC
    `;

    const result = await this.pool.query(sql, [productId]);
    return result.rows;
  }

  private async getAssemblyManuals(productId: number) {
    const sql = `
      SELECT * FROM assembly_manuals
      WHERE product_id = $1
      ORDER BY sort_order
    `;

    const result = await this.pool.query(sql, [productId]);
    return result.rows;
  }

  private async getAdditionalInfo(productId: number) {
    const sql = `
      SELECT * FROM product_additional_info
      WHERE product_id = $1
      ORDER BY sort_order
    `;

    const result = await this.pool.query(sql, [productId]);
    return result.rows;
  }

  /**
   * Get bundle items for a product (if it's a bundle)
   */
  async getBundleItems(productId: number) {
    const sql = `
      SELECT 
        bi.*,
        p.name as item_product_name,
        p.slug as item_product_slug,
        p.regular_price as item_product_price
      FROM product_bundle_items bi
      JOIN products p ON p.id = bi.item_product_id
      WHERE bi.bundle_product_id = $1
      ORDER BY bi.item_type DESC, bi.sort_order ASC
    `;

    const result = await this.pool.query(sql, [productId]);
    return result.rows;
  }

  /**
   * Get product bundle items with details (for customer-facing)
   */
  async getBundleItemsWithDetails(productId: number) {
    const bundleItems = await this.getBundleItems(productId);
    
    // Get details for each item
    const itemsWithDetails = await Promise.all(
      bundleItems.map(async (item) => {
        const itemVariations = await this.getProductVariations(item.item_product_id);
        return {
          ...item,
          variations: itemVariations
        };
      })
    );

    return {
      required: itemsWithDetails.filter(item => item.item_type === 'required'),
      optional: itemsWithDetails.filter(item => item.item_type === 'optional')
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private formatCategoryName(category: string): string {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

