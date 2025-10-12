/**
 * Product Service
 * Core service for product CRUD operations
 */

import { Pool } from 'pg';
import { 
  Product, 
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
        const categoriesQuery = this.queryBuilder.buildCategoriesQuery();
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
   */
  async getProductById(id: number): Promise<ProductWithDetails> {
    try {
      const sql = `
        SELECT 
          p.*,
          COALESCE(
            (SELECT json_agg(pi ORDER BY pi.sort_order)
             FROM product_images pi
             WHERE pi.product_id = p.id),
            '[]'::json
          ) as images,
          COALESCE(
            (SELECT json_agg(pc ORDER BY pc.sort_order)
             FROM product_colors pc
             WHERE pc.product_id = p.id),
            '[]'::json
          ) as colors,
          (SELECT COUNT(*)::int FROM product_reviews pr WHERE pr.product_id = p.id) as review_count,
          (SELECT COALESCE(AVG(pr.rating), 0) FROM product_reviews pr WHERE pr.product_id = p.id) as rating_average
        FROM products p
        WHERE p.id = $1
      `;

      const result = await this.pool.query(sql, [id]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Product', { productId: id });
      }

      const product = result.rows[0];

      // Get variations with options
      const variations = await this.getProductVariations(id);

      // Get add-ons with options
      const addons = await this.getProductAddons(id);

      // Get FAQs
      const faqs = await this.getProductFAQs(id);

      // Get assembly manuals
      const assemblyManuals = await this.getAssemblyManuals(id);

      // Get additional info
      const additionalInfo = await this.getAdditionalInfo(id);

      return {
        ...product,
        variations,
        addons,
        faqs,
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
   */
  async getProductBySlug(slug: string): Promise<ProductWithDetails> {
    try {
      const sql = 'SELECT id FROM products WHERE slug = $1 AND status = $2';
      const result = await this.pool.query(sql, [slug, ProductStatus.ACTIVE]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Product', { slug });
      }

      return this.getProductById(result.rows[0].id);
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

      // Check for duplicate SKU
      const skuCheck = await client.query('SELECT id FROM products WHERE sku = $1', [data.sku]);
      if (skuCheck.rows.length > 0) {
        throw new ConflictError(`Product with SKU "${data.sku}" already exists`, 'SKU_EXISTS');
      }

      // Generate slug if not provided
      const slug = data.slug || this.generateSlug(data.name);

      // Check for duplicate slug
      const slugCheck = await client.query('SELECT id FROM products WHERE slug = $1', [slug]);
      if (slugCheck.rows.length > 0) {
        throw new ConflictError(`Product with slug "${slug}" already exists`, 'DUPLICATE_ENTRY');
      }

      // Use actual database column names
      const sql = `
        INSERT INTO products (
          sku, name, slug, description, short_description, type, status, featured,
          regular_price, sale_price,
          weight_lbs, length_in, width_in, height_in,
          stock, low_stock_amount, in_stock,
          tax_class, shipping_class,
          categories, tags, meta_data,
          seo_title, seo_description
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17,
          $18, $19,
          $20, $21, $22,
          $23, $24
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
        data.seo_description || data.short_description || null
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
   */
  async updateProduct(id: number, data: Partial<UpdateProductDto>): Promise<Product> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check product exists
      const checkResult = await client.query('SELECT id FROM products WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        throw new NotFoundError('Product', { productId: id });
      }

      // Build dynamic update query
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

      // Add all possible fields (using actual database columns)
      addField('name', data.name);
      addField('slug', data.slug);
      addField('description', data.description);
      addField('short_description', data.short_description);
      addField('type', data.type);
      addField('status', data.status);
      addField('featured', data.featured);
      addField('regular_price', data.regular_price);
      addField('sale_price', data.sale_price);
      addField('weight_lbs', data.weight_lbs);
      addField('length_in', data.length_in);
      addField('width_in', data.width_in);
      addField('height_in', data.height_in);
      addField('stock', data.stock_quantity); // Database uses 'stock' not 'stock_quantity'
      addField('low_stock_amount', data.low_stock_threshold); // Database uses 'low_stock_amount'
      addField('tax_class', data.tax_class);
      addField('shipping_class', data.shipping_class);
      
      if (data.categories) addField('categories', JSON.stringify(data.categories));
      if (data.tags) addField('tags', JSON.stringify(data.tags));
      if (data.meta_data) addField('meta_data', JSON.stringify(data.meta_data));
      
      addField('seo_title', data.seo_title);
      addField('seo_description', data.seo_description);
      
      // Update in_stock based on stock quantity
      if (data.stock_quantity !== undefined) {
        addField('in_stock', data.stock_quantity > 0 ? '1' : '0');
      }

      if (updateFields.length === 0) {
        throw new ValidationError('No fields to update');
      }

      // Always update updated_at
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      const sql = `
        UPDATE products
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING *
      `;

      values.push(id);

      const result = await client.query(sql, values);
      await client.query('COMMIT');

      return result.rows[0];
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
   */
  async getFeaturedProducts(limit: number = 6): Promise<Product[]> {
    try {
      const { sql, params } = this.queryBuilder.buildFeaturedQuery(limit);
      const result = await this.pool.query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting featured products:', error);
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
      model: variations.filter(v => v.variation_type === 'model'),
      dropdown: variations.filter(v => v.variation_type === 'dropdown')
    };
  }

  private async getProductAddons(productId: number) {
    const sql = `
      SELECT 
        a.*,
        COALESCE(
          (SELECT json_agg(ao ORDER BY ao.sort_order)
           FROM addon_options ao
           WHERE ao.addon_id = a.id),
          '[]'::json
        ) as options
      FROM product_addons a
      WHERE a.product_id = $1
      ORDER BY a.sort_order
    `;

    const result = await this.pool.query(sql, [productId]);
    return result.rows;
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

