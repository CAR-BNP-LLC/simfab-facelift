/**
 * Admin Shipping Quote Controller
 * Handles admin endpoints for shipping quote management
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { ShippingQuoteService } from '../services/ShippingQuoteService';
import { successResponse } from '../utils/response';

export class AdminShippingQuoteController {
  private shippingQuoteService: ShippingQuoteService;

  constructor(pool: Pool) {
    this.shippingQuoteService = new ShippingQuoteService(pool);
  }

  /**
   * Get all shipping quotes with pagination and filters
   * GET /api/admin/shipping-quotes
   */
  getShippingQuotes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;

      const result = await this.shippingQuoteService.getShippingQuotes(page, limit, status);

      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get shipping quote by ID
   * GET /api/admin/shipping-quotes/:id
   */
  getShippingQuoteById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quoteId = parseInt(req.params.id);

      if (isNaN(quoteId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid quote ID'
          }
        });
      }

      const quote = await this.shippingQuoteService.getShippingQuoteById(quoteId);

      if (!quote) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'QUOTE_NOT_FOUND',
            message: 'Shipping quote not found'
          }
        });
      }

      res.json(successResponse({ quote }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get shipping quote by order ID
   * GET /api/admin/shipping-quotes/order/:orderId
   */
  getShippingQuoteByOrderId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderId = parseInt(req.params.orderId);

      if (isNaN(orderId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid order ID'
          }
        });
      }

      const quote = await this.shippingQuoteService.getShippingQuoteByOrderId(orderId);

      if (!quote) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'QUOTE_NOT_FOUND',
            message: 'Shipping quote not found for this order'
          }
        });
      }

      res.json(successResponse({ quote }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update shipping quote (admin confirms rate)
   * PUT /api/admin/shipping-quotes/:id
   */
  updateShippingQuote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quoteId = parseInt(req.params.id);
      const userId = req.session?.userId;

      if (isNaN(quoteId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid quote ID'
          }
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }

      const { quotedAmount, quoteConfirmationNumber, notes } = req.body;

      if (!quotedAmount || typeof quotedAmount !== 'number') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'quotedAmount is required and must be a number'
          }
        });
      }

      const quote = await this.shippingQuoteService.updateShippingQuote(
        quoteId,
        quotedAmount,
        userId,
        quoteConfirmationNumber,
        notes
      );

      res.json(successResponse({
        quote,
        message: 'Shipping quote updated successfully'
      }));
    } catch (error) {
      next(error);
    }
  };
}


