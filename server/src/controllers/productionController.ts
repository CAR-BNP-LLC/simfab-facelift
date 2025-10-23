import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { ProductionConfigService } from '../services/ProductionConfigService';
import { RefundService } from '../services/RefundService';
import { successResponse, errorResponse } from '../utils/response';

export class ProductionController {
  private configService: ProductionConfigService;
  private refundService: RefundService;

  constructor(pool: Pool) {
    this.configService = new ProductionConfigService(pool);
    this.refundService = new RefundService(pool);
  }

  /**
   * Get production configuration
   */
  getProductionConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await this.configService.getProductionConfig();
      const validation = await this.configService.validateProductionConfig();

      res.json(successResponse({
        config,
        validation,
        environment: process.env.NODE_ENV || 'development'
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get system health status
   */
  getSystemHealth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const health = await this.configService.getSystemHealth();
      res.json(successResponse(health));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get performance metrics
   */
  getPerformanceMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await this.configService.getPerformanceMetrics();
      res.json(successResponse(metrics));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Process a refund
   */
  processRefund = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId, amount, reason } = req.body;
      const initiatedBy = (req as any).user?.id;

      if (!orderId || !reason) {
        return res.status(400).json(errorResponse('Missing required fields: orderId, reason'));
      }

      const refundResult = await this.refundService.processRefund({
        orderId,
        amount,
        reason,
        initiatedBy
      });

      res.json(successResponse({
        message: 'Refund processed successfully',
        refund: refundResult
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Complete a refund
   */
  completeRefund = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refundId, refundTransactionId } = req.body;

      if (!refundId || !refundTransactionId) {
        return res.status(400).json(errorResponse('Missing required fields: refundId, refundTransactionId'));
      }

      await this.refundService.completeRefund(refundId, refundTransactionId);

      res.json(successResponse({
        message: 'Refund completed successfully'
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get refund history for an order
   */
  getRefundHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json(errorResponse('Missing orderId parameter'));
      }

      const refundHistory = await this.refundService.getRefundHistory(parseInt(orderId));

      res.json(successResponse({
        orderId: parseInt(orderId),
        refunds: refundHistory
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get refund statistics
   */
  getRefundStatistics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const statistics = await this.refundService.getRefundStatistics();
      res.json(successResponse(statistics));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get comprehensive production dashboard data
   */
  getProductionDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [config, health, metrics, refundStats] = await Promise.all([
        this.configService.getProductionConfig(),
        this.configService.getSystemHealth(),
        this.configService.getPerformanceMetrics(),
        this.refundService.getRefundStatistics()
      ]);

      res.json(successResponse({
        config,
        health,
        metrics,
        refundStats,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      }));
    } catch (error) {
      next(error);
    }
  };
}
