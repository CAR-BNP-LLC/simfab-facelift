/**
 * Admin Product Routes
 * Routes for admin product management
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { AdminProductController } from '../../controllers/adminProductController';
import { FileUploadService } from '../../services/FileUploadService';
import {
  validateRequest,
  validateQuery,
  createProductSchema,
  updateProductSchema,
  createVariationSchema,
  updateVariationSchema,
  createAddonSchema,
  updateAddonSchema,
  updateImageSchema,
  reorderImagesSchema,
  productQuerySchema
} from '../../validators/product';
import { requireAuthority } from '../../middleware/auth';
import { adminRateLimiter } from '../../middleware/rateLimiter';

export const createAdminProductRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new AdminProductController(pool);
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

  // ============================================================================
  // ADD-ONS
  // ============================================================================

  /**
   * @route   GET /api/admin/products/:id/addons
   * @desc    Get product add-ons
   * @access  Admin
   */
  router.get(
    '/:id/addons',
    controller.getAddons
  );

  /**
   * @route   POST /api/admin/products/:id/addons
   * @desc    Create add-on
   * @access  Admin
   */
  router.post(
    '/:id/addons',
    validateRequest(createAddonSchema),
    controller.createAddon
  );

  /**
   * @route   PUT /api/admin/products/:id/addons/:addonId
   * @desc    Update add-on
   * @access  Admin
   */
  router.put(
    '/:id/addons/:addonId',
    validateRequest(updateAddonSchema),
    controller.updateAddon
  );

  /**
   * @route   DELETE /api/admin/products/:id/addons/:addonId
   * @desc    Delete add-on
   * @access  Admin
   */
  router.delete(
    '/:id/addons/:addonId',
    controller.deleteAddon
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

  return router;
};

