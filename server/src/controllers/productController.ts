import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { ProductService } from '../services/ProductService';
import { PriceCalculatorService } from '../services/PriceCalculatorService';
import { successResponse, paginatedResponse } from '../utils/response';
import { calculatePriceSchema } from '../validators/product';
import { ProductConfiguration } from '../types/product';

export class ProductController {
  private productService: ProductService;
  private priceCalculator: PriceCalculatorService;

  constructor(private pool: Pool) {
    this.productService = new ProductService(pool);
    this.priceCalculator = new PriceCalculatorService(pool);
  }

  /**
   * List products (with filtering, pagination, sorting)
   * GET /api/products
   */
  listProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const options = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        category: req.query.category as string,
        search: req.query.search as string,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        inStock: req.query.inStock === 'true' ? true : undefined,
        featured: req.query.featured === 'true' ? true : undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        region: req.region // Add region from middleware
      };

      const result = await this.productService.getProducts(options);
      res.json(paginatedResponse(result.products, result.pagination, result.filters));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all products (with filtering, pagination, sorting) - alias for listProducts
   * GET /api/products
   */
  getProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        page = '1',
        limit = '20',
        sort = 'created_at',
        order = 'desc',
        category,
        search,
        minPrice,
        maxPrice,
        inStock,
        featured
      } = req.query;

      const products = await this.productService.getProducts({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortBy: sort as 'name' | 'price' | 'created_at' | 'featured' | 'rating' | undefined,
        sortOrder: order as 'asc' | 'desc',
        category: category as string | undefined,
        search: search as string | undefined,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        inStock: inStock === 'true',
        featured: featured === 'true',
        region: req.region // Add region from middleware
      });

      res.json(successResponse(products, 'Products retrieved'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get product by ID
   * GET /api/products/:id
   */
  getProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await this.productService.getProductById(productId, req.region);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' }
        });
      }

      res.json(successResponse(product, 'Product retrieved'));
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
      // Use region from request (set by regionDetection middleware)
      const region = req.region;
      const product = await this.productService.getProductBySlug(slug, region);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' }
        });
      }

      res.json(successResponse(product, 'Product retrieved'));
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
      const categorySlug = req.params.slug || req.params.categorySlug;
      const {
        page = '1',
        limit = '20',
        sort = 'created_at',
        order = 'desc',
        minPrice,
        maxPrice,
        inStock
      } = req.query;

      const result = await this.productService.getProducts({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortBy: sort as 'name' | 'price' | 'created_at' | 'featured' | 'rating' | undefined,
        sortOrder: order as 'asc' | 'desc',
        category: categorySlug,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        inStock: inStock === 'true'
      });

      res.json(paginatedResponse(result.products, result.pagination, result.filters));
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
      const { limit = '8' } = req.query;
      const products = await this.productService.getFeaturedProducts(
        parseInt(limit as string),
        req.region // Filter by detected region
      );

      res.json(successResponse(products, 'Featured products retrieved'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get featured products by category
   * GET /api/products/categories/:category/featured
   */
  getFeaturedProductsByCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = req.params.category;
      const { limit = '6' } = req.query;
      
      const result = await this.productService.getProducts({
        page: 1,
        limit: parseInt(limit as string),
        category,
        featured: true,
        region: req.region // Filter by detected region
      });

      res.json(successResponse(result.products, 'Featured products by category retrieved'));
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
      // Access queryBuilder through service
      const queryBuilder = (this.productService as any).queryBuilder;
      const categoriesQuery = queryBuilder.buildCategoriesQuery(req.region); // Filter by detected region
      const result = await this.pool.query(categoriesQuery.sql, categoriesQuery.params);
      
      // Format category names
      const formatCategoryName = (category: string): string => {
        return category
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      };
      
      const categories = result.rows.map((row: any) => ({
        id: row.category,
        name: formatCategoryName(row.category),
        count: row.count
      }));

      res.json(successResponse(categories, 'Categories retrieved'));
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
      const query = req.query.q as string || req.query.query as string || '';
      const options = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        category: req.query.category as string,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        inStock: req.query.inStock === 'true' ? true : undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any
      };

      const result = await this.productService.searchProducts(query, options);
      res.json(paginatedResponse(result.products, result.pagination));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Calculate price for configured product
   * POST /api/products/:id/calculate-price
   */
  calculatePrice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      const configuration: ProductConfiguration = req.body;
      const quantity = (req.body.quantity as number) || 1;

      const priceCalculation = await this.priceCalculator.calculatePrice(
        productId,
        configuration,
        quantity
      );

      res.json(successResponse(priceCalculation, 'Price calculated'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get price range for product (min/max based on variations)
   * GET /api/products/:id/price-range
   */
  getPriceRange = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      // Get product to return its price range
      const product = await this.productService.getProductById(productId);
      
      const priceRange = {
        min: product.price_min || product.regular_price || 0,
        max: product.price_max || product.regular_price || 0
      };

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

      // Basic validation - check if product exists and try to calculate price
      // If price calculation succeeds, configuration is valid
      try {
        await this.priceCalculator.calculatePrice(productId, configuration, 1);
        
        res.json(successResponse({ valid: true, errors: [] }, 'Configuration valid'));
      } catch (error: any) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CONFIGURATION',
            message: error.message || 'Product configuration is invalid',
            details: []
          }
        });
      }
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

  /**
   * Check bundle item stock availability
   * POST /api/products/:id/bundle-items/check-stock
   */
  checkBundleItemStock = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      const { bundleItems } = req.body; // { selectedOptional: [], configurations: {} }
      
      if (!productId) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Product ID is required' }
        });
      }

      // Import BundleService
      const { BundleService } = await import('../services/BundleService');
      const bundleService = new BundleService(this.pool);
      
      // Convert frontend format to BundleService format
      const allBundleItems = await bundleService.getBundleItems(productId);
      const requiredBundleItemIds = allBundleItems.filter((item: any) => item.item_type === 'required').map((item: any) => item.id);
      
      const requiredItemsConfig: Record<number, any> = {};
      for (const bundleItemId of requiredBundleItemIds) {
        if (bundleItems?.configurations?.[bundleItemId]) {
          requiredItemsConfig[bundleItemId] = {
            variations: bundleItems.configurations[bundleItemId]
          };
        }
      }
      
      // Include optional items configs too
      for (const bundleItemId of (bundleItems?.selectedOptional || [])) {
        if (bundleItems?.configurations?.[bundleItemId]) {
          requiredItemsConfig[bundleItemId] = {
            variations: bundleItems.configurations[bundleItemId]
          };
        }
      }
      
      const bundleConfig = {
        requiredItems: requiredItemsConfig,
        optionalItems: bundleItems?.selectedOptional || []
      };
      
      const availability = await bundleService.checkBundleAvailability(productId, bundleConfig);
      
      res.json(successResponse(availability, 'Bundle stock checked'));
    } catch (error) {
      next(error);
    }
  };
}