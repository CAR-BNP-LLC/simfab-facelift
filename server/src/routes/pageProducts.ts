/**
 * Page Products Routes
 * Routes for managing products displayed on specific pages
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { PageProductController } from '../controllers/pageProductController';
import { requireAuth, requireAdmin } from '../middleware/auth';

export const createPageProductRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new PageProductController(pool);

  // Admin routes (require authentication and admin role)
  const adminRouter = Router();
  adminRouter.use(requireAuth);
  adminRouter.use(requireAdmin);

  /**
   * @route   GET /api/admin/page-products
   * @desc    Get all page configurations
   * @access  Admin
   */
  adminRouter.get('/', controller.getAllPagesConfig);

  /**
   * @route   GET /api/admin/page-products/:pageRoute/:section
   * @desc    Get products for a specific page section (admin - includes inactive)
   * @access  Admin
   */
  adminRouter.get('/:pageRoute/:section', controller.getPageSectionProducts);

  /**
   * @route   POST /api/admin/page-products
   * @desc    Add product to page section
   * @access  Admin
   */
  adminRouter.post('/', controller.addProductToSection);

  /**
   * @route   PUT /api/admin/page-products/:id
   * @desc    Update page product
   * @access  Admin
   */
  adminRouter.put('/:id', controller.updatePageProduct);

  /**
   * @route   DELETE /api/admin/page-products/:id
   * @desc    Remove product from page section
   * @access  Admin
   */
  adminRouter.delete('/:id', controller.removeProductFromSection);

  /**
   * @route   PUT /api/admin/page-products/bulk
   * @desc    Bulk update page products
   * @access  Admin
   */
  adminRouter.put('/bulk', controller.bulkUpdatePageProducts);

  /**
   * @route   POST /api/admin/page-products/category
   * @desc    Set category for page section
   * @access  Admin
   */
  adminRouter.post('/category', controller.setCategoryForSection);

  // Mount admin routes
  router.use(adminRouter);

  return router;
};

export const createPublicPageProductRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new PageProductController(pool);

  // Public routes (for frontend consumption)
  /**
   * @route   GET /api/page-products/:pageRoute/:section
   * @desc    Get public page products (only active)
   * @access  Public
   */
  router.get('/:pageRoute/:section', controller.getPublicPageProducts);

  return router;
};
