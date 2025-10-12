/**
 * Product Controller
 * Handles public product endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { ProductService } from '../services/ProductService';
import { PriceCalculatorService } from '../services/PriceCalculatorService';
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
   */
  listProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Simplified query - just get all products for now
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const sql = `SELECT * FROM products ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
      const countSql = `SELECT COUNT(*)::int as total FROM products`;

      const [productsResult, countResult] = await Promise.all([
        this.pool.query(sql, [limit, offset]),
        this.pool.query(countSql)
      ]);

      const products = productsResult.rows;
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
        },
        {
          categories: [
            { id: 'flight-sim', name: 'Flight Simulation', count: 0 },
            { id: 'sim-racing', name: 'Sim Racing', count: 0 },
            { id: 'cockpits', name: 'Cockpits', count: 0 },
            { id: 'monitor-stands', name: 'Monitor Stands', count: 0 },
            { id: 'accessories', name: 'Accessories', count: 0 }
          ],
          priceRange: { min: 0, max: 10000 }
        }
      ));
    } catch (error) {
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
      
      // Simplified query
      const sql = 'SELECT * FROM products WHERE slug = $1';
      const result = await this.pool.query(sql, [slug]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Product not found'
          }
        });
      }

      const product = result.rows[0];
      
      // Get related data
      const [colorsResult, variationsResult, addonsResult] = await Promise.all([
        this.pool.query('SELECT * FROM product_colors WHERE product_id = $1 ORDER BY sort_order', [product.id]),
        this.pool.query('SELECT * FROM product_variations WHERE product_id = $1 ORDER BY sort_order', [product.id]),
        this.pool.query('SELECT * FROM product_addons WHERE product_id = $1 ORDER BY sort_order', [product.id])
      ]);

      res.json(successResponse({
        ...product,
        colors: colorsResult.rows,
        variations: {
          model: variationsResult.rows.filter((v: any) => v.variation_type === 'model'),
          dropdown: variationsResult.rows.filter((v: any) => v.variation_type === 'dropdown')
        },
        addons: addonsResult.rows,
        faqs: [],
        assemblyManuals: [],
        additionalInfo: []
      }, 'Product retrieved successfully'));
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
      const query = req.query.q as string;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SEARCH_QUERY',
            message: 'Search query must be at least 2 characters'
          }
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      // Simple search query
      const searchPattern = `%${query}%`;
      const sql = `
        SELECT * FROM products
        WHERE name ILIKE $1 OR description ILIKE $1 OR sku ILIKE $1
        ORDER BY name ASC
        LIMIT $2 OFFSET $3
      `;

      const countSql = `
        SELECT COUNT(*)::int as total FROM products
        WHERE name ILIKE $1 OR description ILIKE $1 OR sku ILIKE $1
      `;

      const [productsResult, countResult] = await Promise.all([
        this.pool.query(sql, [searchPattern, limit, offset]),
        this.pool.query(countSql, [searchPattern])
      ]);

      const total = countResult.rows[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);

      res.json(paginatedResponse(
        productsResult.rows,
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
      
      // Simple query
      const sql = `
        SELECT * FROM products
        WHERE featured = true
        ORDER BY created_at DESC
        LIMIT $1
      `;
      
      const result = await this.pool.query(sql, [limit]);

      res.json(successResponse(result.rows, 'Featured products retrieved'));
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
      // This would come from a dedicated category service
      // For now, return hardcoded categories based on the project
      const categories = [
        {
          id: 'flight-sim',
          name: 'Flight Simulation',
          slug: 'flight-sim',
          description: 'Professional flight simulator cockpits and accessories',
          image: '/images/categories/flight-sim.jpg'
        },
        {
          id: 'sim-racing',
          name: 'Sim Racing',
          slug: 'sim-racing',
          description: 'High-performance racing simulator setups',
          image: '/images/categories/sim-racing.jpg'
        },
        {
          id: 'cockpits',
          name: 'Cockpits',
          slug: 'cockpits',
          description: 'Complete cockpit solutions for simulators',
          image: '/images/categories/cockpits.jpg'
        },
        {
          id: 'monitor-stands',
          name: 'Monitor Stands',
          slug: 'monitor-stands',
          description: 'Adjustable monitor mounting solutions',
          image: '/images/categories/monitor-stands.jpg'
        },
        {
          id: 'accessories',
          name: 'Accessories',
          slug: 'accessories',
          description: 'Add-ons and upgrades for your simulator setup',
          image: '/images/categories/accessories.jpg'
        }
      ];

      res.json(successResponse(categories, 'Categories retrieved'));
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
}

