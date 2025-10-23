import { Router } from 'express';
import { Pool } from 'pg';
import { DebugController } from '../controllers/debugController';
import { requireAuth } from '../middleware/auth';

export const createDebugRoutes = (pool: Pool): Router => {
  const router = Router();
  const debugController = new DebugController(pool);

  // Debug endpoint to grant admin role (requires authentication)
  router.post('/grant-admin-role', requireAuth, (req, res) => {
    debugController.grantAdminRole(req, res);
  });

  return router;
};
