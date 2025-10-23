import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { AdvancedRefundService } from '../services/AdvancedRefundService';
import { PaymentAnalyticsService } from '../services/PaymentAnalyticsService';
import { PerformanceOptimizationService } from '../services/PerformanceOptimizationService';
import { successResponse, errorResponse } from '../utils/response';

export class Phase4Controller {
  private advancedRefundService: AdvancedRefundService;
  private paymentAnalyticsService: PaymentAnalyticsService;
  private performanceOptimizationService: PerformanceOptimizationService;

  constructor(pool: Pool) {
    this.advancedRefundService = new AdvancedRefundService(pool);
    this.paymentAnalyticsService = new PaymentAnalyticsService(pool);
    this.performanceOptimizationService = new PerformanceOptimizationService(pool);
  }

  /**
   * Process advanced refund
   */
  processAdvancedRefund = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId, refundType, amount, reason, reasonCode, notifyCustomer, items } = req.body;
      const initiatedBy = (req as any).user?.id;

      if (!orderId || !refundType || !reason || !reasonCode) {
        return res.status(400).json(errorResponse('Missing required fields: orderId, refundType, reason, reasonCode'));
      }

      const refundResult = await this.advancedRefundService.processAdvancedRefund({
        orderId,
        refundType,
        amount,
        reason,
        reasonCode,
        initiatedBy,
        notifyCustomer: notifyCustomer || false,
        items: items || []
      });

      res.json(successResponse({
        message: 'Advanced refund processed successfully',
        refund: refundResult
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get refund analytics
   */
  getRefundAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { timeframe = '30d' } = req.query;
      
      const analytics = await this.advancedRefundService.getRefundAnalytics(timeframe as any);

      res.json(successResponse({
        message: 'Refund analytics retrieved successfully',
        timeframe,
        analytics
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get refund insights
   */
  getRefundInsights = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const insights = await this.advancedRefundService.getRefundInsights();

      res.json(successResponse({
        message: 'Refund insights retrieved successfully',
        insights
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get payment analytics
   */
  getPaymentAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { timeframe = '30d' } = req.query;
      
      const analytics = await this.paymentAnalyticsService.getPaymentAnalytics(timeframe as any);

      res.json(successResponse({
        message: 'Payment analytics retrieved successfully',
        timeframe,
        analytics
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get payment optimization recommendations
   */
  getPaymentOptimization = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const optimization = await this.paymentAnalyticsService.getPaymentOptimization();

      res.json(successResponse({
        message: 'Payment optimization recommendations retrieved successfully',
        optimization
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get real-time payment monitoring
   */
  getRealTimeMonitoring = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const monitoring = await this.paymentAnalyticsService.getRealTimeMonitoring();

      res.json(successResponse({
        message: 'Real-time monitoring data retrieved successfully',
        monitoring
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get performance metrics
   */
  getPerformanceMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await this.performanceOptimizationService.getPerformanceMetrics();

      res.json(successResponse({
        message: 'Performance metrics retrieved successfully',
        metrics
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recommendations = await this.performanceOptimizationService.getOptimizationRecommendations();

      res.json(successResponse({
        message: 'Optimization recommendations retrieved successfully',
        recommendations
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Run optimization tasks
   */
  runOptimizationTasks = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await this.performanceOptimizationService.runOptimizationTasks();

      res.json(successResponse({
        message: 'Optimization tasks completed',
        results
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get comprehensive Phase 4 dashboard
   */
  getPhase4Dashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [refundAnalytics, refundInsights, paymentAnalytics, paymentOptimization, performanceMetrics, optimizationRecommendations] = await Promise.all([
        this.advancedRefundService.getRefundAnalytics('30d'),
        this.advancedRefundService.getRefundInsights(),
        this.paymentAnalyticsService.getPaymentAnalytics('30d'),
        this.paymentAnalyticsService.getPaymentOptimization(),
        this.performanceOptimizationService.getPerformanceMetrics(),
        this.performanceOptimizationService.getOptimizationRecommendations()
      ]);

      res.json(successResponse({
        message: 'Phase 4 dashboard data retrieved successfully',
        dashboard: {
          refundAnalytics,
          refundInsights,
          paymentAnalytics,
          paymentOptimization,
          performanceMetrics,
          optimizationRecommendations,
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      next(error);
    }
  };
}
