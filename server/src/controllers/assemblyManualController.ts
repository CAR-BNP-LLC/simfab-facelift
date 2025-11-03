/**
 * Assembly Manual Controller
 * Handles HTTP requests for assembly manual management
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { AssemblyManualService } from '../services/AssemblyManualService';
import { FileUploadService } from '../services/FileUploadService';
import { successResponse, errorResponse } from '../utils/response';

export class AssemblyManualController {
  private service: AssemblyManualService;
  private fileUploadService: FileUploadService;

  constructor(pool: Pool) {
    this.service = new AssemblyManualService(pool);
    this.fileUploadService = new FileUploadService();
  }

  /**
   * GET /api/admin/assembly-manuals
   * List all manuals (admin only)
   */
  getAllManuals = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { is_public, product_id } = req.query;
      
      const filters: any = {};
      if (is_public !== undefined) {
        filters.is_public = is_public === 'true';
      }
      if (product_id) {
        filters.product_id = parseInt(product_id as string);
      }

      const manuals = await this.service.getAllManuals(filters);
      res.json(successResponse(manuals));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/admin/assembly-manuals/:id
   * Get manual by ID (admin only)
   */
  getManualById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const manual = await this.service.getManualById(id);
      
      if (!manual) {
        return res.status(404).json(errorResponse('Manual not found', 'NOT_FOUND'));
      }

      res.json(successResponse(manual));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/admin/assembly-manuals
   * Create new manual (admin only)
   */
  createManual = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const file = files?.file?.[0];
      
      if (!file) {
        return res.status(400).json(errorResponse('PDF file is required', 'NO_FILE'));
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const fileUrl = this.fileUploadService.getFileUrl(file.filename, baseUrl);
      
      // Handle thumbnail upload if provided
      let thumbnailUrl = req.body.thumbnail_url || null;
      if (files?.thumbnail?.[0]) {
        const thumbnailFile = files.thumbnail[0];
        thumbnailUrl = this.fileUploadService.getFileUrl(thumbnailFile.filename, baseUrl);
      }

      const manual = await this.service.createManual({
        name: req.body.name || file.originalname,
        description: req.body.description || null,
        file_url: fileUrl,
        file_type: 'pdf',
        file_size: file.size,
        thumbnail_url: thumbnailUrl,
        is_public: req.body.is_public !== 'false',
        sort_order: parseInt(req.body.sort_order || '0')
      });

      // Assign to products if provided
      if (req.body.product_ids) {
        const productIds = Array.isArray(req.body.product_ids)
          ? req.body.product_ids.map((id: string) => parseInt(id))
          : [parseInt(req.body.product_ids)];
        await this.service.assignToProducts(manual.id, productIds);
      }

      const fullManual = await this.service.getManualById(manual.id);
      res.status(201).json(successResponse(fullManual, 'Manual created successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/admin/assembly-manuals/:id
   * Update manual (admin only)
   */
  updateManual = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      
      // Handle thumbnail upload if provided
      let thumbnailUrl = req.body.thumbnail_url;
      if (req.file) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        thumbnailUrl = this.fileUploadService.getFileUrl(req.file.filename, baseUrl);
      }
      
      const updateData: any = {
        name: req.body.name,
        description: req.body.description,
        is_public: req.body.is_public !== undefined ? req.body.is_public !== 'false' : undefined,
        sort_order: req.body.sort_order ? parseInt(req.body.sort_order) : undefined
      };
      
      if (thumbnailUrl !== undefined) {
        updateData.thumbnail_url = thumbnailUrl;
      }
      
      const manual = await this.service.updateManual(id, updateData);

      res.json(successResponse(manual, 'Manual updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/admin/assembly-manuals/:id
   * Delete manual (admin only)
   */
  deleteManual = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      await this.service.deleteManual(id);
      res.json(successResponse(null, 'Manual deleted successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/admin/assembly-manuals/:id/assign-products
   * Assign manual to products (admin only)
   */
  assignToProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { product_ids } = req.body;

      if (!Array.isArray(product_ids)) {
        return res.status(400).json(errorResponse('product_ids must be an array', 'INVALID_INPUT'));
      }

      await this.service.assignToProducts(id, product_ids);
      const manual = await this.service.getManualById(id);
      res.json(successResponse(manual, 'Products assigned successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/admin/assembly-manuals/:id/regenerate-qr
   * Regenerate QR code (admin only)
   */
  regenerateQR = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const qrCode = await this.service.regenerateQRCode(id);
      res.json(successResponse(qrCode, 'QR code regenerated successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/manuals/:id
   * Public endpoint to view manual (for QR code scanning)
   */
  getPublicManual = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const manual = await this.service.getManualById(id, false);
      
      if (!manual) {
        return res.status(404).json(errorResponse('Manual not found', 'NOT_FOUND'));
      }

      if (!manual.is_public) {
        return res.status(403).json(errorResponse('Manual is not publicly accessible', 'NOT_PUBLIC'));
      }

      res.json(successResponse(manual));
    } catch (error) {
      next(error);
    }
  };
}

