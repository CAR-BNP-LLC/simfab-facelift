import { Router } from 'express';
import { Pool } from 'pg';
import { AssemblyManualController } from '../controllers/assemblyManualController';

/**
 * Public routes for assembly manuals
 * These routes are accessible without authentication
 */
export const createAssemblyManualRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new AssemblyManualController(pool);

  /**
   * @route   GET /api/manuals/:id
   * @desc    View public manual (for QR code scanning)
   * @access  Public (but manual must be marked as public)
   */
  router.get('/:id', controller.getPublicManual);

  return router;
};

