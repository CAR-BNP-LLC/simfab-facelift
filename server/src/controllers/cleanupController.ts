import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { CleanupService } from '../services/CleanupService';
import { successResponse } from '../utils/response';
import { requireAdmin } from '../middleware/auth';

export class CleanupController {
  private cleanupService: CleanupService;

  constructor(pool: Pool) {
    this.cleanupService = new CleanupService(pool);
  }

  /**
   * Manual cleanup trigger (admin only)
   * POST /api/admin/cleanup/run
   */
  runCleanup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.cleanupService.cleanupExpiredOrders();

      res.json(successResponse({
        message: 'Cleanup completed successfully',
        data: result
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get cleanup statistics
   * GET /api/admin/cleanup/stats
   */
  getCleanupStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.cleanupService.getCleanupStats();

      res.json(successResponse({
        data: stats
      }));
    } catch (error) {
      next(error);
    }
  };
}
