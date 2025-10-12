/**
 * Order Controller
 * Handles order HTTP endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { OrderService } from '../services/OrderService';
import { CreateOrderData } from '../types/cart';
import { successResponse, paginatedResponse } from '../utils/response';

export class OrderController {
  private orderService: OrderService;

  constructor(pool: Pool) {
    this.orderService = new OrderService(pool);
  }

  /**
   * Create new order from cart
   * POST /api/orders
   */
  createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.sessionID;
      const userId = req.session?.userId;
      const orderData: CreateOrderData = req.body;

      console.log('Creating order for session:', sessionId, 'user:', userId);

      const order = await this.orderService.createOrder(sessionId, userId, orderData);

      res.status(201).json(successResponse({
        order,
        message: 'Order created successfully'
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user's orders
   * GET /api/orders
   */
  getUserOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Please login to view orders'
          }
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.orderService.getUserOrders(userId, page, limit);

      res.json({
        success: true,
        data: {
          orders: result.orders,
          pagination: {
            page: result.page,
            limit,
            total: result.total,
            totalPages: result.totalPages,
            hasNext: result.page < result.totalPages,
            hasPrevious: result.page > 1
          }
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get order details
   * GET /api/orders/:orderNumber
   */
  getOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderNumber = req.params.orderNumber;
      const userId = req.session?.userId;

      const order = await this.orderService.getOrderByNumber(orderNumber, userId);

      if (!order) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'Order not found'
          }
        });
      }

      res.json(successResponse(order));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Cancel order
   * POST /api/orders/:orderNumber/cancel
   */
  cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderNumber = req.params.orderNumber;
      const userId = req.session?.userId;

      const order = await this.orderService.cancelOrder(orderNumber, userId);

      res.json(successResponse({
        order,
        message: 'Order cancelled successfully'
      }));
    } catch (error) {
      next(error);
    }
  };
}

