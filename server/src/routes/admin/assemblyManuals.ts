import { Router } from 'express';
import { Pool } from 'pg';
import { AssemblyManualController } from '../../controllers/assemblyManualController';
import { FileUploadService } from '../../services/FileUploadService';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { adminRateLimiter } from '../../middleware/rateLimiter';

export const createAdminAssemblyManualRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new AssemblyManualController(pool);
  const fileUploadService = new FileUploadService();

  // All routes require authentication and admin role
  router.use(requireAuth);
  router.use(requireAdmin);
  router.use(adminRateLimiter);

  /**
   * @route   GET /api/admin/assembly-manuals
   * @desc    List all manuals (with optional filters)
   * @access  Admin
   */
  router.get('/', controller.getAllManuals);

  /**
   * @route   GET /api/admin/assembly-manuals/:id
   * @desc    Get manual by ID
   * @access  Admin
   */
  router.get('/:id', controller.getManualById);

  /**
   * @route   POST /api/admin/assembly-manuals
   * @desc    Create new manual (with PDF file upload and optional thumbnail)
   * @access  Admin
   */
  router.post(
    '/',
    fileUploadService.getDocumentUploadMiddleware().fields([
      { name: 'file', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 }
    ]),
    controller.createManual
  );

  /**
   * @route   PUT /api/admin/assembly-manuals/:id
   * @desc    Update manual details (with optional thumbnail upload)
   * @access  Admin
   */
  router.put(
    '/:id',
    fileUploadService.getImageUploadMiddleware().single('thumbnail'),
    controller.updateManual
  );

  /**
   * @route   DELETE /api/admin/assembly-manuals/:id
   * @desc    Delete manual
   * @access  Admin
   */
  router.delete('/:id', controller.deleteManual);

  /**
   * @route   POST /api/admin/assembly-manuals/:id/assign-products
   * @desc    Assign manual to products
   * @access  Admin
   */
  router.post('/:id/assign-products', controller.assignToProducts);

  /**
   * @route   POST /api/admin/assembly-manuals/:id/regenerate-qr
   * @desc    Regenerate QR code for manual
   * @access  Admin
   */
  router.post('/:id/regenerate-qr', controller.regenerateQR);

  return router;
};

