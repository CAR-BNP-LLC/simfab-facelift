/**
 * Public Settings Routes
 * Routes for accessing public region-specific settings (no auth required)
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { RegionSettingsService } from '../services/RegionSettingsService';
import { successResponse } from '../utils/response';

export const createSettingsRoutes = (pool: Pool): Router => {
  const router = Router();
  const regionSettingsService = new RegionSettingsService(pool);

  /**
   * @route   GET /api/settings/:region/contact
   * @desc    Get contact information for a region (public)
   * @access  Public
   */
  router.get('/:region/contact', async (req, res, next) => {
    try {
      const region = req.params.region as 'us' | 'eu';
      
      if (region !== 'us' && region !== 'eu') {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid region. Must be "us" or "eu"' }
        });
      }

      const contactInfo = await regionSettingsService.getContactInfo(region);
      
      res.json(successResponse(contactInfo));
    } catch (error) {
      next(error);
    }
  });

  return router;
};


