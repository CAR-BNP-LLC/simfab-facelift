/**
 * Page Product Service
 * Service for managing products displayed on specific pages
 */

import { Pool } from 'pg';
import {
  PageProduct,
  PageProductWithProduct,
  CreatePageProductDto,
  UpdatePageProductDto,
  BulkPageProductDto,
  SetCategoryDto,
  PageConfiguration,
  PageSectionProducts
} from '../types/pageProducts';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';

export class PageProductService {
  constructor(private pool: Pool) {}

  /**
   * Get all page configurations with their sections
   */
  async getAllPagesConfig(): Promise<PageConfiguration[]> {
    try {
      // Define known pages and their sections
      const knownPages = [
        { route: '/sim-racing', name: 'Sim Racing', sections: ['base-models'] },
        { route: '/flight-sim', name: 'Flight Sim', sections: ['base-models'] },
        { route: '/monitor-stands', name: 'Monitor Stands', sections: ['main-products', 'add-ons'] },
        { route: 'homepage', name: 'Homepage', sections: ['sim-racing-section', 'flight-sim-section', 'monitor-stands-section'] },
      ];

      // Try to query the table (it might not exist yet if migration hasn't run)
      let result;
      try {
        const sql = `
          SELECT 
            page_route,
            page_section,
            display_type,
            category_id,
            max_items,
            COUNT(*) FILTER (WHERE is_active = true AND display_type = 'products') as product_count
          FROM page_products
          GROUP BY page_route, page_section, display_type, category_id, max_items
          ORDER BY page_route, page_section
        `;
        result = await this.pool.query(sql);
      } catch (dbError: any) {
        // If table doesn't exist, return empty configs for known pages
        if (dbError.code === '42P01') {
          console.warn('page_products table does not exist. Please run migration 036.');
          result = { rows: [] };
        } else {
          throw dbError;
        }
      }
      
      // Group by page_route
      const pagesMap = new Map<string, PageConfiguration>();

      // Initialize with known pages
      for (const knownPage of knownPages) {
        pagesMap.set(knownPage.route, {
          pageRoute: knownPage.route,
          pageName: knownPage.name,
          sections: knownPage.sections.map(section => ({
            sectionKey: section,
            sectionName: this.formatSectionName(section),
            productCount: 0,
            displayType: 'products' as const,
            categoryId: null,
            maxItems: 10
          }))
        });
      }

      // Update with data from database
      for (const row of result.rows) {
        const route = row.page_route;
        if (!pagesMap.has(route)) {
          pagesMap.set(route, {
            pageRoute: route,
            pageName: this.formatPageName(route),
            sections: []
          });
        }

        const page = pagesMap.get(route)!;
        
        // Find or create section
        let section = page.sections.find(s => s.sectionKey === row.page_section);
        if (!section) {
          section = {
            sectionKey: row.page_section,
            sectionName: this.formatSectionName(row.page_section),
            productCount: 0,
            displayType: row.display_type || 'products',
            categoryId: row.category_id,
            maxItems: row.max_items || 10
          };
          page.sections.push(section);
        }
        
        // Update section data from database
        section.productCount = parseInt(row.product_count) || 0;
        section.displayType = row.display_type || 'products';
        section.categoryId = row.category_id;
        section.maxItems = row.max_items || 10;
      }

      return Array.from(pagesMap.values());
    } catch (error) {
      console.error('Error fetching all pages config:', error);
      throw error;
    }
  }

  /**
   * Get products for a specific page section
   */
  async getPageSectionProducts(
    pageRoute: string,
    section: string,
    includeInactive: boolean = false
  ): Promise<PageSectionProducts> {
    try {
      // Get page products configuration
      let configResult;
      try {
        const configSql = `
          SELECT 
            display_type,
            category_id,
            max_items
          FROM page_products
          WHERE page_route = $1 AND page_section = $2
          LIMIT 1
        `;

        configResult = await this.pool.query(configSql, [pageRoute, section]);
      } catch (dbError: any) {
        // If table doesn't exist, return empty result
        if (dbError.code === '42P01') {
          console.warn('page_products table does not exist. Please run migration 036.');
          return {
            pageRoute,
            section,
            products: [],
            displayType: 'products',
            categoryId: null,
            maxItems: 10
          };
        }
        throw dbError;
      }
      
      let displayType: 'products' | 'category' = 'products';
      let categoryId: string | null = null;
      let maxItems: number = 10;

      if (configResult.rows.length > 0) {
        displayType = configResult.rows[0].display_type || 'products';
        categoryId = configResult.rows[0].category_id;
        maxItems = configResult.rows[0].max_items || 10;
      }

      // If category mode, fetch products from category
      if (displayType === 'category' && categoryId) {
        return await this.getCategoryProducts(pageRoute, section, categoryId, maxItems);
      }

      // Otherwise, fetch individual products
      let result;
      try {
        const whereClause = includeInactive 
          ? 'WHERE pp.page_route = $1 AND pp.page_section = $2'
          : 'WHERE pp.page_route = $1 AND pp.page_section = $2 AND pp.is_active = true';

        const sql = `
          SELECT 
            pp.*,
            json_build_object(
              'id', p.id,
              'name', p.name,
              'slug', p.slug,
              'price_min', p.price_min,
              'price_max', p.price_max,
              'regular_price', p.regular_price,
              'sale_price', p.sale_price,
              'status', p.status,
              'short_description', p.short_description,
              'images', COALESCE(
                (SELECT json_agg(row_to_json(pi))
                 FROM (SELECT * FROM product_images WHERE product_id = p.id ORDER BY sort_order) pi),
                '[]'::json
              )
            ) as product
          FROM page_products pp
          INNER JOIN products p ON pp.product_id = p.id
          ${whereClause}
          ORDER BY pp.display_order ASC, pp.id ASC
        `;

        result = await this.pool.query(sql, includeInactive ? [pageRoute, section] : [pageRoute, section]);
      } catch (dbError: any) {
        // If table doesn't exist, return empty result
        if (dbError.code === '42P01') {
          console.warn('page_products table does not exist. Please run migration 036.');
          return {
            pageRoute,
            section,
            products: [],
            displayType: 'products',
            categoryId: null,
            maxItems: 10
          };
        }
        throw dbError;
      }
      
      return {
        pageRoute,
        section,
        products: result.rows.map(row => ({
          ...row,
          product: row.product
        })),
        displayType,
        categoryId,
        maxItems
      };
    } catch (error) {
      console.error('Error fetching page section products:', error);
      throw error;
    }
  }

  /**
   * Get products from a category for page section
   */
  private async getCategoryProducts(
    pageRoute: string,
    section: string,
    categoryId: string,
    maxItems: number
  ): Promise<PageSectionProducts> {
      const sql = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.price_min,
        p.price_max,
        p.regular_price,
        p.sale_price,
        p.status,
        p.short_description,
        COALESCE(
          (SELECT json_agg(row_to_json(pi))
           FROM (SELECT * FROM product_images WHERE product_id = p.id ORDER BY sort_order) pi),
          '[]'::json
        ) as images
      FROM products p
      WHERE p.status = 'active'
        AND (
          p.categories::text LIKE $1 
          OR p.categories::text LIKE $2
        )
      ORDER BY p.featured DESC, p.created_at DESC
      LIMIT $3
    `;

    const categoryPattern1 = `%"${categoryId}"%`;
    const categoryPattern2 = `%${categoryId}%`;

    const result = await this.pool.query(sql, [categoryPattern1, categoryPattern2, maxItems]);

    return {
      pageRoute,
      section,
      products: result.rows.map((row, index) => ({
        id: 0, // No page_product id for category mode
        page_route: pageRoute,
        page_section: section,
        product_id: row.id,
        category_id: categoryId,
        display_order: index,
        is_active: true,
        display_type: 'category' as const,
        max_items: maxItems,
        created_at: new Date(),
        updated_at: new Date(),
        product: {
          id: row.id,
          name: row.name,
          slug: row.slug,
          price_min: row.price_min,
          price_max: row.price_max,
          regular_price: row.regular_price,
          sale_price: row.sale_price,
          images: row.images || [],
          status: row.status
        }
      })),
      displayType: 'category',
      categoryId,
      maxItems
    };
  }

  /**
   * Add a product to a page section
   */
  async addProductToSection(dto: CreatePageProductDto): Promise<PageProduct> {
    try {
      // Check if table exists first
      try {
        // Verify product exists
        const productCheck = await this.pool.query(
          'SELECT id FROM products WHERE id = $1',
          [dto.product_id]
        );

        if (productCheck.rows.length === 0) {
          throw new NotFoundError('Product', { product_id: dto.product_id });
        }

        // Get next display_order if not provided
        let displayOrder = dto.display_order;
        if (displayOrder === undefined) {
          const orderResult = await this.pool.query(
            `SELECT COALESCE(MAX(display_order), -1) + 1 as next_order
             FROM page_products
             WHERE page_route = $1 AND page_section = $2`,
            [dto.page_route, dto.page_section]
          );
          displayOrder = parseInt(orderResult.rows[0].next_order);
        }

        const sql = `
          INSERT INTO page_products (
            page_route, page_section, product_id, display_order, is_active, display_type
          ) VALUES ($1, $2, $3, $4, $5, 'products')
          RETURNING *
        `;

        const result = await this.pool.query(sql, [
          dto.page_route,
          dto.page_section,
          dto.product_id,
          displayOrder,
          dto.is_active !== undefined ? dto.is_active : true
        ]);

        return result.rows[0];
      } catch (dbError: any) {
        // If table doesn't exist, provide clear error message
        if (dbError.code === '42P01') {
          throw new ValidationError(
            'The page_products table does not exist. Please run migration 036 to create it.',
            { code: 'MIGRATION_REQUIRED', migration: '036' }
          );
        }
        throw dbError;
      }
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new ConflictError(
          'Product is already assigned to this page section',
          'DUPLICATE_ENTRY',
          { page_route: dto.page_route, page_section: dto.page_section, product_id: dto.product_id }
        );
      }
      if (error instanceof NotFoundError || error instanceof ConflictError || error instanceof ValidationError) {
        throw error;
      }
      console.error('Error adding product to section:', error);
      throw new ValidationError('Failed to add product to section', error);
    }
  }

  /**
   * Update a page product assignment
   */
  async updatePageProduct(id: number, updates: UpdatePageProductDto): Promise<PageProduct> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCounter = 1;

      if (updates.display_order !== undefined) {
        fields.push(`display_order = $${paramCounter++}`);
        values.push(updates.display_order);
      }

      if (updates.is_active !== undefined) {
        fields.push(`is_active = $${paramCounter++}`);
        values.push(updates.is_active);
      }

      if (fields.length === 0) {
        // No updates provided, just return the existing record
        const result = await this.pool.query('SELECT * FROM page_products WHERE id = $1', [id]);
        if (result.rows.length === 0) {
          throw new NotFoundError('PageProduct', { id });
        }
        return result.rows[0];
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const sql = `
        UPDATE page_products
        SET ${fields.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING *
      `;

      const result = await this.pool.query(sql, values);

      if (result.rows.length === 0) {
        throw new NotFoundError('PageProduct', { id });
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('Error updating page product:', error);
      throw new ValidationError('Failed to update page product', error);
    }
  }

  /**
   * Remove a product from a page section
   */
  async removeProductFromSection(id: number): Promise<void> {
    try {
      const result = await this.pool.query(
        'DELETE FROM page_products WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('PageProduct', { id });
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('Error removing product from section:', error);
      throw new ValidationError('Failed to remove product from section', error);
    }
  }

  /**
   * Bulk update page products for a section
   */
  async bulkUpdatePageProducts(dto: BulkPageProductDto): Promise<PageProduct[]> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Delete existing products for this section
      await client.query(
        'DELETE FROM page_products WHERE page_route = $1 AND page_section = $2 AND display_type = $3',
        [dto.page_route, dto.page_section, 'products']
      );

      // Insert new products
      const insertPromises = dto.products.map(product => {
        return client.query(
          `INSERT INTO page_products (
            page_route, page_section, product_id, display_order, is_active, display_type
          ) VALUES ($1, $2, $3, $4, $5, 'products')
          RETURNING *`,
          [
            dto.page_route,
            dto.page_section,
            product.product_id,
            product.display_order,
            product.is_active
          ]
        );
      });

      const results = await Promise.all(insertPromises);
      await client.query('COMMIT');

      return results.map(r => r.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in bulk update:', error);
      throw new ValidationError('Failed to bulk update page products', error);
    } finally {
      client.release();
    }
  }

  /**
   * Set category for a page section
   */
  async setCategoryForSection(dto: SetCategoryDto): Promise<PageProduct> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Delete existing product assignments for this section
      await client.query(
        'DELETE FROM page_products WHERE page_route = $1 AND page_section = $2',
        [dto.page_route, dto.page_section]
      );

      // Insert category configuration
      const result = await client.query(
        `INSERT INTO page_products (
          page_route, page_section, category_id, display_type, max_items, is_active
        ) VALUES ($1, $2, $3, 'category', $4, true)
        RETURNING *`,
        [
          dto.page_route,
          dto.page_section,
          dto.category_id,
          dto.max_items || 10
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error setting category for section:', error);
      throw new ValidationError('Failed to set category for section', error);
    } finally {
      client.release();
    }
  }

  /**
   * Format page name from route
   */
  private formatPageName(route: string): string {
    const names: Record<string, string> = {
      '/sim-racing': 'Sim Racing',
      '/flight-sim': 'Flight Sim',
      '/monitor-stands': 'Monitor Stands',
      '/homepage': 'Homepage',
      'homepage': 'Homepage'
    };
    return names[route] || route.replace(/^\//, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Format section name from section key
   */
  private formatSectionName(section: string): string {
    const names: Record<string, string> = {
      'base-models': 'Base Models',
      'main-products': 'Main Products',
      'add-ons': 'Add-Ons',
      'addons': 'Add-Ons',
      'sim-racing-section': 'Sim Racing Section',
      'flight-sim-section': 'Flight Sim Section',
      'monitor-stands-section': 'Monitor Stands Section'
    };
    return names[section] || section.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

