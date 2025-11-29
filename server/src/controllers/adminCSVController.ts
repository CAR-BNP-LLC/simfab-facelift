/**
 * Admin CSV Controller
 * Handles CSV import/export for products
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { CSVImportService } from '../services/CSVImportService';
import { CSVExportService } from '../services/CSVExportService';
import { successResponse } from '../utils/response';
import { ValidationError } from '../utils/errors';
import { ImportOptions } from '../types/csv';

export class AdminCSVController {
  private importService: CSVImportService;
  private exportService: CSVExportService;

  constructor(pool: Pool) {
    this.importService = new CSVImportService(pool);
    this.exportService = new CSVExportService(pool);
  }

  /**
   * POST /api/admin/products/import
   * Import products from CSV
   */
  importProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new ValidationError('CSV file is required');
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const mode = (req.body.mode as string) || 'create'; // create, update, skip_duplicates
      const dryRun = req.body.dry_run === 'true' || req.body.dry_run === true;
      const importAsGroups =
        req.body.import_as_groups === 'true' || req.body.import_as_groups === true;

      if (!['create', 'update', 'skip_duplicates'].includes(mode)) {
        throw new ValidationError('Invalid mode. Must be: create, update, or skip_duplicates');
      }

      const options: ImportOptions = {
        mode: mode as any,
        dryRun,
        importAsGroups
      };

      const result = await this.importService.importProducts(csvContent, options);

      res.json(successResponse(result, 'Import completed'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/admin/products/import/validate
   * Validate CSV without importing
   */
  validateCSV = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new ValidationError('CSV file is required');
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const importAsGroups =
        req.body.import_as_groups === 'true' || req.body.import_as_groups === true;
      const result = await this.importService.importProducts(csvContent, {
        mode: 'create',
        validateOnly: true,
        importAsGroups
      });

      res.json(successResponse(result, 'Validation completed'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/admin/products/export
   * Export products to CSV
   */
  exportProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as string;
      const category = req.query.category as string;
      const region = req.query.region as 'us' | 'eu' | undefined;

      const csv = await this.exportService.exportProducts({
        status,
        category,
        region
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="products-export-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  };
}

