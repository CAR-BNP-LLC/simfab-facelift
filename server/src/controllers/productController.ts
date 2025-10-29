/**
 * Product Controller
 * Handles public product endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { ProductService } from '../services/ProductService';
import { PriceCalculatorService } from '../services/PriceCalculatorService';
import { ProductQueryBuilder } from '../services/ProductQueryBuilder';
import { ProductQueryOptions, ProductConfiguration } from '../types/product';
import { successResponse, paginatedResponse } from '../utils/response';

export class ProductController {
  private productService: ProductService;
  private priceCalculator: PriceCalculatorService;
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.productService = new ProductService(pool);
    this.priceCalculator = new PriceCalculatorService(pool);
  }

  /**
   * List products with filters
   * GET /api/products
   * VERSION: 2.0 - FIXED FILTERING AND IMAGES
   */
  listProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('\n\n' + '█'.repeat(80));
      console.log('█ 🔥🔥🔥 NEW CODE RUNNING - VERSION 2.0 🔥🔥🔥');
      console.log('█ ProductController.listProducts v2.0 ACTIVE');
      console.log('█ Timestamp:', new Date().toISOString());
      console.log('█'.repeat(80));
      console.log('📥 Query params received:', JSON.stringify(req.query, null, 2));

      const options: ProductQueryOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        category: req.query.category as string,
        search: req.query.search as string,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        inStock: req.query.inStock === 'true' ? true : undefined,
        featured: req.query.featured === 'true' ? true : undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any
      };

      console.log('🔧 Parsed options:', JSON.stringify(options, null, 2));
      console.log('🎯 Category filter:', options.category || 'NONE');

      const result = await this.productService.getProducts(options);

      console.log('Products returned:', result.products.length);
      if (result.products.length > 0) {
        const firstProduct = result.products[0];
        console.log('📦 First product sample:');
        console.log('   - ID:', firstProduct.id);
        console.log('   - Name:', firstProduct.name);
        console.log('   - Images field type:', typeof firstProduct.images);
        console.log('   - Images value:', JSON.stringify(firstProduct.images));
        console.log('   - Has categories:', firstProduct.categories);
      }
      console.log('█'.repeat(80) + '\n\n');

      res.json(paginatedResponse(
        result.products,
        result.pagination,
        result.filters
      ));
    } catch (error) {
      console.error('ERROR in listProducts v2.0:', error);
      next(error);
    }
  };

  /**
   * Get single product by ID
   * GET /api/products/:id
   */
  getProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      
      // Simplified query
      const sql = 'SELECT * FROM products WHERE id = $1';
      const result = await this.pool.query(sql, [productId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Product not found'
          }
        });
      }

      res.json(successResponse(result.rows[0], 'Product retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get product by slug
   * GET /api/products/slug/:slug
   */
  getProductBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = req.params.slug;
      const product = await this.productService.getProductBySlug(slug);
      res.json(successResponse(product, 'Product retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Search products
   * GET /api/products/search
   */
  searchProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = (req.query.q as string) || '';

      // If query is too short, return empty results instead of error
      // Require at least 2 characters for meaningful search
      if (!query || query.trim().length < 2) {
        return res.json({
          success: true,
          data: {
            products: [],
            pagination: {
              page: 1,
              limit: parseInt(req.query.limit as string) || 10,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrevious: false
            }
          }
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      // Use ProductQueryBuilder for properly formatted products
      const { ProductQueryBuilder } = await import('../services/ProductQueryBuilder');
      const queryBuilder = new ProductQueryBuilder(this.pool);
      
      const { sql, params, countSql, countParams } = queryBuilder.buildSearch(query, {
        page,
        limit,
        status: 'active' as any
      });

      const [productsResult, countResult] = await Promise.all([
        this.pool.query(sql, params),
        this.pool.query(countSql, countParams)
      ]);

      // Transform products to match frontend format
      const products = productsResult.rows.map((row: any) => ({
        id: row.id,
        sku: row.sku,
        name: row.name,
        slug: row.slug,
        description: row.description,
        shortDescription: row.short_description,
        type: row.type,
        status: row.status,
        featured: row.featured,
        price: {
          min: row.price_min,
          max: row.price_max,
          regular: row.regular_price,
          sale: row.sale_price,
          currency: 'USD'
        },
        images: row.images || [],
        stock: {
          quantity: row.stock || 0,
          inStock: row.in_stock === '1' || row.in_stock === 1 || (row.stock && row.stock > 0),
          manageStock: true
        },
        categories: typeof row.categories === 'string' ? JSON.parse(row.categories || '[]') : (row.categories || []),
        tags: typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : (row.tags || []),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        is_on_sale: row.is_on_sale,
        sale_start_date: row.sale_start_date,
        sale_end_date: row.sale_end_date,
        sale_label: row.sale_label
      }));

      const total = countResult.rows[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);

      res.json(paginatedResponse(
        products,
        {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1
        }
      ));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Calculate product price with configuration
   * POST /api/products/:id/calculate-price
   */
  calculatePrice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      const configuration: ProductConfiguration = req.body;
      const quantity = req.body.quantity || 1;

      const calculation = await this.priceCalculator.calculatePrice(
        productId,
        configuration,
        quantity
      );

      res.json(successResponse(calculation, 'Price calculated successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get featured products
   * GET /api/products/featured
   */
  getFeaturedProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string) || 6;
      
      const products = await this.productService.getFeaturedProducts(limit);

      res.json(successResponse(products, 'Featured products retrieved'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get product categories
   * GET /api/products/categories
   */
  getCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get category counts from database
      const queryBuilder = new ProductQueryBuilder(this.pool);
      const { sql, params } = queryBuilder.buildCategoriesQuery();
      const countResult = await this.pool.query(sql, params);

      // Create a map of category counts
      const countMap = new Map<string, number>();
      countResult.rows.forEach((row: any) => {
        countMap.set(row.category, row.count);
      });

      // Build categories with counts
      const categories = [
        {
          id: 'flight-sim',
          name: 'Flight Simulation',
          slug: 'flight-sim',
          description: 'Professional flight simulator cockpits and accessories',
          image: '/images/categories/flight-sim.jpg',
          count: countMap.get('flight-sim') || 0
        },
        {
          id: 'sim-racing',
          name: 'Sim Racing',
          slug: 'sim-racing',
          description: 'High-performance racing simulator setups',
          image: '/images/categories/sim-racing.jpg',
          count: countMap.get('sim-racing') || 0
        },
        {
          id: 'cockpits',
          name: 'Cockpits',
          slug: 'cockpits',
          description: 'Complete cockpit solutions for simulators',
          image: '/images/categories/cockpits.jpg',
          count: countMap.get('cockpits') || 0
        },
        {
          id: 'monitor-stands',
          name: 'Monitor Stands',
          slug: 'monitor-stands',
          description: 'Adjustable monitor mounting solutions',
          image: '/images/categories/monitor-stands.jpg',
          count: countMap.get('monitor-stands') || 0
        },
        {
          id: 'accessories',
          name: 'Accessories',
          slug: 'accessories',
          description: 'Add-ons and upgrades for your simulator setup',
          image: '/images/categories/accessories.jpg',
          count: countMap.get('accessories') || 0
        }
      ];

      res.json(successResponse(categories, 'Categories retrieved'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get featured products by category (for mega menu)
   * GET /api/products/categories/:category/featured
   */
  getFeaturedProductsByCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { category } = req.params;
      const limit = parseInt(req.query.limit as string) || 6;

      // Map category names to database category IDs
      const categoryMap: Record<string, string> = {
        'flight-sim': 'flight-sim',
        'sim-racing': 'sim-racing',
        'cockpits': 'cockpits',
        'monitor-stands': 'monitor-stands',
        'accessories': 'accessories'
      };

      const dbCategory = categoryMap[category];
      
      if (!dbCategory) {
        return res.json(successResponse([], 'No products found for this category'));
      }

      const queryBuilder = new ProductQueryBuilder(this.pool);
      const { sql, params } = queryBuilder.buildFeaturedQuery(limit);
      
      // Modify the query to include category filter
      const categoryFilter = `AND p.categories LIKE $${params.length + 1}`;
      const finalSql = sql.replace('ORDER BY p.created_at DESC', `${categoryFilter}\n      ORDER BY p.created_at DESC`);
      const finalParams = [...params, `%${dbCategory}%`];

      const result = await this.pool.query(finalSql, finalParams);

      res.json(successResponse(result.rows, `Featured products for ${category} retrieved`));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get products by category
   * GET /api/products/categories/:slug
   */
  getProductsByCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categorySlug = req.params.slug;

      const options: ProductQueryOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        category: categorySlug,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any
      };

      const result = await this.productService.getProducts(options);

      res.json(paginatedResponse(
        result.products,
        result.pagination,
        result.filters
      ));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get product price range
   * GET /api/products/:id/price-range
   */
  getPriceRange = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      const priceRange = await this.priceCalculator.getProductPriceRange(productId);

      res.json(successResponse(priceRange, 'Price range retrieved'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validate product configuration
   * POST /api/products/:id/validate-configuration
   */
  validateConfiguration = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      const configuration: ProductConfiguration = req.body;

      const validation = await this.priceCalculator.validateConfiguration(productId, configuration);

      res.json(successResponse(validation, 'Configuration validated'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get bundle items for a product
   * GET /api/products/:id/bundle-items
   */
  getBundleItems = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      const bundleItems = await this.productService.getBundleItemsWithDetails(productId);

      res.json(successResponse(bundleItems, 'Bundle items retrieved'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check stock availability for a product configuration
   * POST /api/products/:id/check-availability
   */
  checkAvailability = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      const configuration: ProductConfiguration = req.body;
      
      // Import VariationStockService here to avoid circular dependency
      const { VariationStockService } = await import('../services/VariationStockService');
      const variationStockService = new VariationStockService(this.pool);
      
      const availability = await variationStockService.checkAvailability(productId, configuration);

      res.json(successResponse(availability, 'Availability checked'));
    } catch (error) {
      next(error);
    }
  };
}

