/**
 * Order Controller
 * Handles order HTTP endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { OrderService } from '../services/OrderService';
import { EmailService } from '../services/EmailService';
import { CreateOrderData } from '../types/cart';
import { successResponse, paginatedResponse } from '../utils/response';

export class OrderController {
  private orderService: OrderService;
  private emailService: EmailService;

  constructor(pool: Pool) {
    this.orderService = new OrderService(pool);
    this.emailService = new EmailService(pool);
    this.emailService.initialize();
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
      console.log('Order data received:', JSON.stringify(orderData, null, 2));

      const order = await this.orderService.createOrder(sessionId, userId, orderData);

      // Send email notification to admin
      try {
        await this.emailService.sendEmail({
          templateType: 'new_order_admin',
          recipientEmail: 'info@simfab.com',
          recipientName: 'SimFab Admin',
          variables: {
            order_number: order.order_number,
            customer_name: order.customer_email,
            order_total: `$${order.total_amount.toFixed(2)}`,
            order_date: new Date(order.created_at).toLocaleDateString(),
            subtotal: `$${order.subtotal.toFixed(2)}`,
            tax_amount: `$${order.tax_amount.toFixed(2)}`,
            shipping_amount: `$${order.shipping_amount.toFixed(2)}`,
            discount_amount: `$${order.discount_amount.toFixed(2)}`
          }
        });
      } catch (emailError) {
        console.error('Failed to send admin order email:', emailError);
      }

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

      const order = await this.orderService.getOrderByNumber(orderNumber);

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

  /**
   * Debug endpoint to test order data
   * POST /api/orders/debug
   */
  debugOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Debug order data received:', JSON.stringify(req.body, null, 2));
      
      res.json({
        success: true,
        data: {
          received: req.body,
          shippingState: req.body.shippingAddress?.state,
          billingState: req.body.billingAddress?.state,
          shippingStateLength: req.body.shippingAddress?.state?.length,
          billingStateLength: req.body.billingAddress?.state?.length
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get order by order number (for confirmation page)
   * GET /api/orders/:orderNumber
   */
  getOrderByNumber = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderNumber } = req.params;
      const order = await this.orderService.getOrderByNumber(orderNumber);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'Order not found',
            requestId: req.headers['x-request-id'] || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
      }
      
      res.json(successResponse({ order }));
    } catch (error) {
      next(error);
    }
  };
}

