/**
 * Admin Settings Controller
 * Handles admin endpoints for region-specific settings management
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { RegionSettingsService } from '../services/RegionSettingsService';
import { successResponse } from '../utils/response';
import { ValidationError } from '../utils/errors';

export class AdminSettingsController {
  private regionSettingsService: RegionSettingsService;

  constructor(pool: Pool) {
    this.regionSettingsService = new RegionSettingsService(pool);
  }

  /**
   * Get all settings for a region (admin only)
   * GET /api/admin/settings/regions/:region
   */
  getRegionSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const region = req.params.region as 'us' | 'eu';
      
      if (region !== 'us' && region !== 'eu') {
        throw new ValidationError('Invalid region. Must be "us" or "eu"');
      }

      const settings = await this.regionSettingsService.getSettings(region, false);
      
      res.json(successResponse({ region, settings }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get public settings for a region (no auth required, for frontend)
   * GET /api/admin/settings/regions/:region/public
   */
  getPublicRegionSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const region = req.params.region as 'us' | 'eu';
      
      if (region !== 'us' && region !== 'eu') {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid region. Must be "us" or "eu"' }
        });
      }

      const settings = await this.regionSettingsService.getPublicSettings(region);
      
      res.json(successResponse({ region, settings }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update multiple settings for a region
   * PUT /api/admin/settings/regions/:region
   */
  updateRegionSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const region = req.params.region as 'us' | 'eu';
      const { settings } = req.body;
      const adminId = req.session?.userId;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: { message: 'Unauthorized' }
        });
      }

      if (region !== 'us' && region !== 'eu') {
        throw new ValidationError('Invalid region. Must be "us" or "eu"');
      }

      if (!settings || typeof settings !== 'object') {
        throw new ValidationError('Settings must be an object');
      }

      await this.regionSettingsService.updateSettings(region, settings, adminId);
      
      res.json(successResponse({ 
        message: 'Settings updated successfully',
        region 
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update a single setting
   * PUT /api/admin/settings/regions/:region/:key
   */
  updateRegionSetting = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const region = req.params.region as 'us' | 'eu';
      const key = req.params.key;
      const { value } = req.body;
      const adminId = req.session?.userId;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: { message: 'Unauthorized' }
        });
      }

      if (region !== 'us' && region !== 'eu') {
        throw new ValidationError('Invalid region. Must be "us" or "eu"');
      }

      if (value === undefined) {
        throw new ValidationError('Value is required');
      }

      await this.regionSettingsService.updateSetting(region, key, value, adminId);
      
      res.json(successResponse({ 
        message: 'Setting updated successfully',
        region,
        key
      }));
    } catch (error) {
      next(error);
    }
  };
}

