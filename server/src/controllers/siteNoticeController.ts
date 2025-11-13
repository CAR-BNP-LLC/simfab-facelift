/**
 * Site Notice Controller
 * Handles site notice endpoints (public and admin)
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { SiteNoticeService } from '../services/SiteNoticeService';
import { successResponse } from '../utils/response';

export class SiteNoticeController {
  private siteNoticeService: SiteNoticeService;

  constructor(pool: Pool) {
    this.siteNoticeService = new SiteNoticeService(pool);
  }

  /**
   * Get active notice (public endpoint)
   * GET /api/site-notices/active
   */
  getActiveNotice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notice = await this.siteNoticeService.getActiveNotice();
      res.json(successResponse(notice, notice ? 'Active notice retrieved' : 'No active notice'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all notices (admin)
   * GET /api/admin/site-notices
   */
  getAllNotices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notices = await this.siteNoticeService.getAllNotices();
      res.json(successResponse(notices, 'Notices retrieved'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create notice (admin)
   * POST /api/admin/site-notices
   */
  createNotice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { message, is_active } = req.body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Message is required and must be a non-empty string'
        });
      }

      const notice = await this.siteNoticeService.createNotice(
        message,
        is_active !== undefined ? Boolean(is_active) : true
      );

      res.status(201).json(successResponse(notice, 'Notice created successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update notice (admin)
   * PUT /api/admin/site-notices/:id
   */
  updateNotice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { message, is_active } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid notice ID'
        });
      }

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Message is required and must be a non-empty string'
        });
      }

      if (typeof is_active !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'is_active must be a boolean'
        });
      }

      const notice = await this.siteNoticeService.updateNotice(id, message, is_active);

      res.json(successResponse(notice, 'Notice updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete notice (admin)
   * DELETE /api/admin/site-notices/:id
   */
  deleteNotice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid notice ID'
        });
      }

      await this.siteNoticeService.deleteNotice(id);

      res.json(successResponse(null, 'Notice deleted successfully'));
    } catch (error) {
      next(error);
    }
  };
}

