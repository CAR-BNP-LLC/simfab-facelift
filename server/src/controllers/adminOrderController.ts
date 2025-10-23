/**
 * Admin Order Controller
 * Handles admin order management endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { OrderService } from '../services/OrderService';
import { OrderStatus } from '../types/cart';
import { successResponse, paginatedResponse } from '../utils/response';

export class AdminOrderController {
  private orderService: OrderService;

  constructor(pool: Pool) {
    this.orderService = new OrderService(pool);
  }

  /**
   * Get all orders (admin)
   * GET /api/admin/orders
   */
  listOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const search = req.query.search as string;

      const offset = (page - 1) * limit;

      let sql = `
        SELECT o.*, 
               COUNT(oi.id) as item_count,
               u.email as user_email,
               u.first_name as user_first_name,
               u.last_name as user_last_name
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE 1=1
      `;

      const params: any[] = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        sql += ` AND o.status = $${paramCount}`;
        params.push(status);
      }

      if (search) {
        paramCount++;
        sql += ` AND (o.order_number ILIKE $${paramCount} OR o.customer_email ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      sql += ` GROUP BY o.id, u.email, u.first_name, u.last_name`;
      sql += ` ORDER BY o.created_at DESC`;
      sql += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      // Get total count
      let countSql = `SELECT COUNT(DISTINCT o.id)::int as total FROM orders o WHERE 1=1`;
      const countParams: any[] = [];
      let countParamCount = 0;

      if (status) {
        countParamCount++;
        countSql += ` AND o.status = $${countParamCount}`;
        countParams.push(status);
      }

      if (search) {
        countParamCount++;
        countSql += ` AND (o.order_number ILIKE $${countParamCount} OR o.customer_email ILIKE $${countParamCount})`;
        countParams.push(`%${search}%`);
      }

      const [ordersResult, countResult] = await Promise.all([
        this.orderService['pool'].query(sql, params),
        this.orderService['pool'].query(countSql, countParams)
      ]);

      const total = countResult.rows[0].total;
      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          orders: ordersResult.rows,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrevious: page > 1
          }
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get order details (admin)
   * GET /api/admin/orders/:id
   */
  getOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderId = parseInt(req.params.id);

      const orderSql = 'SELECT * FROM orders WHERE id = $1';
      const orderResult = await this.orderService['pool'].query(orderSql, [orderId]);

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' }
        });
      }

      const order = orderResult.rows[0];

      // Get order items
      const itemsSql = 'SELECT * FROM order_items WHERE order_id = $1';
      const itemsResult = await this.orderService['pool'].query(itemsSql, [orderId]);

      res.json(successResponse({
        ...order,
        items: itemsResult.rows
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update order status (admin)
   * PUT /api/admin/orders/:id/status
   */
  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderId = parseInt(req.params.id);
      const { status, trackingNumber, carrier, notes } = req.body;

      let sql = 'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP';
      const params: any[] = [status];
      let paramCount = 1;

      if (trackingNumber) {
        paramCount++;
        sql += `, tracking_number = $${paramCount}`;
        params.push(trackingNumber);
      }

      if (notes) {
        paramCount++;
        sql += `, notes = $${paramCount}`;
        params.push(notes);
      }

      sql += ` WHERE id = $${paramCount + 1} RETURNING *`;
      params.push(orderId);

      const result = await this.orderService['pool'].query(sql, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' }
        });
      }

      res.json(successResponse({
        order: result.rows[0],
        message: 'Order status updated'
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get dashboard statistics
   * GET /api/admin/dashboard/stats
   */
  getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pool = this.orderService['pool'];

      // Today's stats (only paid orders)
      const todayStatsSql = `
        SELECT 
          COUNT(*)::int as order_count,
          COALESCE(SUM(total_amount), 0)::float as revenue
        FROM orders
        WHERE DATE(created_at) = CURRENT_DATE
        AND payment_status = 'paid'
      `;

      // Month stats (only paid orders)
      const monthStatsSql = `
        SELECT 
          COUNT(*)::int as order_count,
          COALESCE(SUM(total_amount), 0)::float as revenue
        FROM orders
        WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
        AND payment_status = 'paid'
      `;

      // Order status counts
      const statusCountsSql = `
        SELECT 
          status,
          COUNT(*)::int as count
        FROM orders
        GROUP BY status
      `;

      // Recent orders
      const recentOrdersSql = `
        SELECT o.*, u.email as user_email, u.first_name, u.last_name
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        ORDER BY o.created_at DESC
        LIMIT 5
      `;

      // Top products (only from paid orders)
      const topProductsSql = `
        SELECT 
          oi.product_name,
          SUM(oi.quantity)::int as total_sold,
          SUM(oi.total_price)::float as revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND o.payment_status = 'paid'
        GROUP BY oi.product_name
        ORDER BY total_sold DESC
        LIMIT 5
      `;

      // Product stats
      const productStatsSql = `
        SELECT 
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE stock > 0)::int as in_stock,
          COUNT(*) FILTER (WHERE stock <= low_stock_amount)::int as low_stock
        FROM products
        WHERE status = 'active'
      `;

      const [todayStats, monthStats, statusCounts, recentOrders, topProducts, productStats] = await Promise.all([
        pool.query(todayStatsSql),
        pool.query(monthStatsSql),
        pool.query(statusCountsSql),
        pool.query(recentOrdersSql),
        pool.query(topProductsSql),
        pool.query(productStatsSql)
      ]);

      res.json(successResponse({
        today: todayStats.rows[0],
        month: monthStats.rows[0],
        orderStatusCounts: statusCounts.rows,
        recentOrders: recentOrders.rows,
        topProducts: topProducts.rows,
        productStats: productStats.rows[0]
      }));
    } catch (error) {
      next(error);
    }
  };
}


