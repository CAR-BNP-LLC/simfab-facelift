/**
 * Admin Product Routes
 * Routes for admin product management
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { AdminProductController } from '../../controllers/adminProductController';
import { AdminCSVController } from '../../controllers/adminCSVController';
import { FileUploadService } from '../../services/FileUploadService';
import {
  validateRequest,
  validateQuery,
  createProductSchema,
  updateProductSchema,
  createVariationSchema,
  updateVariationSchema,
  updateImageSchema,
  reorderImagesSchema,
  productQuerySchema
} from '../../validators/product';
import { requireAuthority } from '../../middleware/auth';
import { adminRateLimiter } from '../../middleware/rateLimiter';

export const createAdminProductRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new AdminProductController(pool);
  const csvController = new AdminCSVController(pool);
  const fileUploadService = new FileUploadService();

  // Apply rate limiting to all admin routes
  router.use(adminRateLimiter);

  // ============================================================================
  // PRODUCT CRUD
  // ============================================================================

  /**
   * @route   GET /api/admin/products
   * @desc    List all products (admin view)
   * @access  Admin with products:view authority
   */
  router.get(
    '/',
    requireAuthority('products:view'),
    validateQuery(productQuerySchema),
    controller.listProducts
  );

  /**
   * @route   GET /api/admin/products/stock-mismatch-check
   * @desc    Get list of product IDs with stock mismatches
   * @access  Admin
   */
  router.get(
    '/stock-mismatch-check',
    controller.checkStockMismatch
  );

  /**
   * @route   GET /api/admin/products/export
   * @desc    Export products to CSV
   * @access  Admin with products:view authority
   * @note    Must be before /:id routes to avoid route conflicts
   */
  router.get(
    '/export',
    requireAuthority('products:view'),
    csvController.exportProducts
  );

  /**
   * @route   GET /api/admin/products/:id
   * @desc    Get product details
   * @access  Admin with products:view authority
   */
  router.get(
    '/:id',
    requireAuthority('products:view'),
    controller.getProduct
  );

  /**
   * @route   POST /api/admin/products/group
   * @desc    Create product group (both US and EU)
   * @access  Admin with products:create authority
   * @note    Must be before /:id routes to avoid route conflicts
   */
  router.post(
    '/group',
    requireAuthority('products:create'),
    controller.createProductGroup
  );

  /**
   * @route   DELETE /api/admin/products/group/:groupId
   * @desc    Break product group (unlink products)
   * @access  Admin with products:edit authority
   * @note    Must be before /:id routes to avoid route conflicts
   */
  router.delete(
    '/group/:groupId',
    requireAuthority('products:edit'),
    controller.breakProductGroup
  );

  /**
   * @route   POST /api/admin/products
   * @desc    Create new product
   * @access  Admin with products:create authority
   */
  router.post(
    '/',
    requireAuthority('products:create'),
    validateRequest(createProductSchema),
    controller.createProduct
  );

  /**
   * @route   PUT /api/admin/products/:id
   * @desc    Update product
   * @access  Admin with products:edit authority
   */
  router.put(
    '/:id',
    requireAuthority('products:edit'),
    validateRequest(updateProductSchema),
    controller.updateProduct
  );

  /**
   * @route   DELETE /api/admin/products/:id
   * @desc    Delete product
   * @access  Admin with products:delete authority
   */
  router.delete(
    '/:id',
    requireAuthority('products:delete'),
    controller.deleteProduct
  );

  /**
   * @route   POST /api/admin/products/:id/restore
   * @desc    Restore soft-deleted product
   * @access  Admin with products:edit authority
   */
  router.post(
    '/:id/restore',
    requireAuthority('products:edit'),
    controller.restoreProduct
  );

  // ============================================================================
  // VARIATIONS
  // ============================================================================

  /**
   * @route   GET /api/admin/products/:id/variations
   * @desc    Get product variations
   * @access  Admin
   */
  router.get(
    '/:id/variations',
    controller.getVariations
  );

  /**
   * @route   POST /api/admin/products/:id/variations
   * @desc    Create variation
   * @access  Admin
   */
  router.post(
    '/:id/variations',
    validateRequest(createVariationSchema),
    controller.createVariation
  );

  /**
   * @route   PUT /api/admin/products/:id/variations/:variationId
   * @desc    Update variation
   * @access  Admin
   */
  router.put(
    '/:id/variations/:variationId',
    validateRequest(updateVariationSchema),
    controller.updateVariation
  );

  /**
   * @route   DELETE /api/admin/products/:id/variations/:variationId
   * @desc    Delete variation
   * @access  Admin
   */
  router.delete(
    '/:id/variations/:variationId',
    controller.deleteVariation
  );

  /**
   * @route   GET /api/admin/products/:id/variation-stock-summary
   * @desc    Get stock summary for all variations in a product
   * @access  Admin
   */
  router.get(
    '/:id/variation-stock-summary',
    controller.getVariationStockSummary
  );

  // ============================================================================
  // IMAGES
  // ============================================================================

  /**
   * @route   POST /api/admin/upload/image
   * @desc    Upload image for variations (no product ID required)
   * @access  Admin
   */
  router.post(
    '/upload/image',
    fileUploadService.getImageUploadMiddleware().single('image'),
    controller.uploadVariationImage
  );

  /**
   * @route   GET /api/admin/products/:id/images
   * @desc    Get product images
   * @access  Admin
   */
  router.get(
    '/:id/images',
    controller.getImages
  );

  /**
   * @route   POST /api/admin/products/:id/images
   * @desc    Upload product image
   * @access  Admin
   */
  router.post(
    '/:id/images',
    fileUploadService.getImageUploadMiddleware().single('image'),
    controller.uploadImage
  );

  /**
   * @route   PUT /api/admin/products/:id/images/:imageId
   * @desc    Update image metadata
   * @access  Admin
   */
  router.put(
    '/:id/images/:imageId',
    validateRequest(updateImageSchema),
    controller.updateImage
  );

  /**
   * @route   DELETE /api/admin/products/:id/images/:imageId
   * @desc    Delete image
   * @access  Admin
   */
  router.delete(
    '/:id/images/:imageId',
    controller.deleteImage
  );

  /**
   * @route   PUT /api/admin/products/:id/images/reorder
   * @desc    Reorder images
   * @access  Admin
   */
  router.put(
    '/:id/images/reorder',
    validateRequest(reorderImagesSchema),
    controller.reorderImages
  );

  // ============================================================================
  // CSV IMPORT/EXPORT
  // ============================================================================

  /**
   * @route   POST /api/admin/products/import
   * @desc    Import products from CSV
   * @access  Admin with products:create authority
   */
  router.post(
    '/import',
    requireAuthority('products:create'),
    fileUploadService.getCSVUploadMiddleware().single('file'),
    csvController.importProducts
  );

  /**
   * @route   POST /api/admin/products/import/validate
   * @desc    Validate CSV without importing
   * @access  Admin with products:view authority
   */
  router.post(
    '/import/validate',
    requireAuthority('products:view'),
    fileUploadService.getCSVUploadMiddleware().single('file'),
    csvController.validateCSV
  );

  return router;
};

