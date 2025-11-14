/**
 * Shared Config Controller
 * Handles HTTP requests for shared product configurations
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { SharedConfigService } from '../services/SharedConfigService';
import { successResponse } from '../utils/response';

export class SharedConfigController {
  private sharedConfigService: SharedConfigService;

  constructor(private pool: Pool) {
    this.sharedConfigService = new SharedConfigService(pool);
  }

  /**
   * Create a shared configuration
   * POST /api/shared-configs
   */
  createSharedConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId, configuration } = req.body;

      const sharedConfig = await this.sharedConfigService.createSharedConfig({
        productId,
        configuration
      });

      // Build the shareable URL
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const url = `${baseUrl}/share/${sharedConfig.short_code}`;

      res.json(successResponse({
        shortCode: sharedConfig.short_code,
        url
      }, 'Shared configuration created'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get shared configuration by short code
   * GET /api/shared-configs/:shortCode
   */
  getSharedConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { shortCode } = req.params;

      const sharedConfig = await this.sharedConfigService.getSharedConfig(shortCode);

      res.json(successResponse({
        productId: sharedConfig.product_id,
        configuration: sharedConfig.configuration
      }, 'Shared configuration retrieved'));
    } catch (error) {
      next(error);
    }
  };
}

