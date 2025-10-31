/**
 * Public Product Routes
 * Routes for public product endpoints
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { ProductController } from '../controllers/productController';
import {
  validateRequest,
  validateQuery,
  productQuerySchema,
  searchQuerySchema,
  calculatePriceSchema
} from '../validators/product';
import { apiRateLimiter } from '../middleware/rateLimiter';

export const createProductRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new ProductController(pool);

  // Apply rate limiting to all product routes
  router.use(apiRateLimiter);

  /**
   * @route   GET /api/products
   * @desc    List products with filters and pagination
   * @access  Public
   */
  router.get(
    '/',
    validateQuery(productQuerySchema),
    controller.listProducts
  );

  /**
   * @route   GET /api/products/featured
   * @desc    Get featured products
   * @access  Public
   */
  router.get(
    '/featured',
    controller.getFeaturedProducts
  );

  /**
   * @route   GET /api/products/categories/:category/featured
   * @desc    Get featured products by category (for mega menu)
   * @access  Public
   */
  router.get(
    '/categories/:category/featured',
    controller.getFeaturedProductsByCategory
  );

  /**
   * @route   GET /api/products/categories
   * @desc    Get product categories
   * @access  Public
   */
  router.get(
    '/categories',
    controller.getCategories
  );

  /**
   * @route   GET /api/products/search
   * @desc    Search products
   * @access  Public
   */
  router.get(
    '/search',
    validateQuery(searchQuerySchema),
    controller.searchProducts
  );

  /**
   * @route   GET /api/products/categories/:slug
   * @desc    Get products by category
   * @access  Public
   */
  router.get(
    '/categories/:slug',
    validateQuery(productQuerySchema),
    controller.getProductsByCategory
  );

  /**
   * @route   GET /api/products/slug/:slug
   * @desc    Get product by slug
   * @access  Public
   */
  router.get(
    '/slug/:slug',
    controller.getProductBySlug
  );

  /**
   * @route   GET /api/products/:id
   * @desc    Get product by ID
   * @access  Public
   */
  router.get(
    '/:id',
    controller.getProduct
  );

  /**
   * @route   POST /api/products/:id/calculate-price
   * @desc    Calculate price for configured product
   * @access  Public
   */
  router.post(
    '/:id/calculate-price',
    validateRequest(calculatePriceSchema),
    controller.calculatePrice
  );

  /**
   * @route   GET /api/products/:id/price-range
   * @desc    Get price range for product
   * @access  Public
   */
  router.get(
    '/:id/price-range',
    controller.getPriceRange
  );

  /**
   * @route   POST /api/products/:id/validate-configuration
   * @desc    Validate product configuration
   * @access  Public
   */
  router.post(
    '/:id/validate-configuration',
    validateRequest(calculatePriceSchema),
    controller.validateConfiguration
  );

  /**
   * @route   GET /api/products/:id/bundle-items
   * @desc    Get bundle items for a product (if bundle)
   * @access  Public
   */
  router.get(
    '/:id/bundle-items',
    controller.getBundleItems
  );

  /**
   * @route   POST /api/products/:id/check-availability
   * @desc    Check stock availability for a product configuration
   * @access  Public
   */
  router.post(
    '/:id/check-availability',
    validateRequest(calculatePriceSchema),
    controller.checkAvailability
  );

  /**
   * @route   POST /api/products/:id/bundle-items/check-stock
   * @desc    Check stock availability for bundle items
   * @access  Public
   */
  router.post(
    '/:id/bundle-items/check-stock',
    controller.checkBundleItemStock
  );

  return router;
};
