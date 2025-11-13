/**
 * Admin Order Controller
 * Handles admin order management endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { OrderService } from '../services/OrderService';
import { EmailService } from '../services/EmailService';
import { OrderStatus } from '../types/cart';
import { successResponse, paginatedResponse } from '../utils/response';

export class AdminOrderController {
  private orderService: OrderService;
  private emailService: EmailService;

  constructor(pool: Pool) {
    this.orderService = new OrderService(pool);
    this.emailService = new EmailService(pool);
    this.emailService.initialize();
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
      const region = req.query.region as string;
      const couponId = req.query.coupon_id as string;

      const offset = (page - 1) * limit;

      let sql = `
        SELECT o.*, 
               COUNT(oi.id) as item_count,
               u.email as user_email,
               u.first_name as user_first_name,
               u.last_name as user_last_name,
               cu.coupon_id,
               c.code as coupon_code,
               cu.discount_amount as coupon_discount
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        LEFT JOIN order_items oi ON oi.order_id = o.id
        LEFT JOIN coupon_usage cu ON cu.order_id = o.id
        LEFT JOIN coupons c ON c.id = cu.coupon_id
        WHERE o.shipping_quote_id IS NULL
      `;

      const params: any[] = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        sql += ` AND o.status = $${paramCount}`;
        params.push(status);
      }

      if (region && (region === 'us' || region === 'eu')) {
        paramCount++;
        sql += ` AND o.region = $${paramCount}`;
        params.push(region);
      }

      if (search) {
        paramCount++;
        sql += ` AND (o.order_number ILIKE $${paramCount} OR o.customer_email ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      if (couponId) {
        if (couponId === 'with_coupon') {
          sql += ` AND EXISTS (SELECT 1 FROM coupon_usage cu2 WHERE cu2.order_id = o.id)`;
        } else if (couponId === 'no_coupon') {
          sql += ` AND NOT EXISTS (SELECT 1 FROM coupon_usage cu2 WHERE cu2.order_id = o.id)`;
        } else {
          paramCount++;
          sql += ` AND EXISTS (SELECT 1 FROM coupon_usage cu2 WHERE cu2.order_id = o.id AND cu2.coupon_id = $${paramCount})`;
          params.push(parseInt(couponId));
        }
      }

      sql += ` GROUP BY o.id, u.email, u.first_name, u.last_name, cu.coupon_id, c.code, cu.discount_amount`;
      sql += ` ORDER BY o.created_at DESC`;
      sql += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      // Note: Since we're using LEFT JOIN, orders without coupons will have NULL coupon fields
      // This is correct behavior - we want to show all orders, with coupon info when available

      // Get total count
      let countSql = `
        SELECT COUNT(DISTINCT o.id)::int as total 
        FROM orders o
        LEFT JOIN coupon_usage cu ON cu.order_id = o.id
        WHERE o.shipping_quote_id IS NULL
      `;
      const countParams: any[] = [];
      let countParamCount = 0;

      if (status) {
        countParamCount++;
        countSql += ` AND o.status = $${countParamCount}`;
        countParams.push(status);
      }

      if (region && (region === 'us' || region === 'eu')) {
        countParamCount++;
        countSql += ` AND o.region = $${countParamCount}`;
        countParams.push(region);
      }

      if (search) {
        countParamCount++;
        countSql += ` AND (o.order_number ILIKE $${countParamCount} OR o.customer_email ILIKE $${countParamCount})`;
        countParams.push(`%${search}%`);
      }

      if (couponId) {
        if (couponId === 'with_coupon') {
          countSql += ` AND EXISTS (SELECT 1 FROM coupon_usage cu2 WHERE cu2.order_id = o.id)`;
        } else if (couponId === 'no_coupon') {
          countSql += ` AND NOT EXISTS (SELECT 1 FROM coupon_usage cu2 WHERE cu2.order_id = o.id)`;
        } else {
          countParamCount++;
          countSql += ` AND EXISTS (SELECT 1 FROM coupon_usage cu2 WHERE cu2.order_id = o.id AND cu2.coupon_id = $${countParamCount})`;
          countParams.push(parseInt(couponId));
        }
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

      // Get previous order state BEFORE update to check if note is new
      const previousOrderResult = await this.orderService['pool'].query(
        'SELECT notes FROM orders WHERE id = $1',
        [orderId]
      );
      
      if (previousOrderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' }
        });
      }

      const previousNotes = previousOrderResult.rows[0]?.notes || '';
      const hasNewNote = notes && notes.trim() && notes !== previousNotes && notes.trim().length > 0;

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

      const order = result.rows[0];

      // Get customer name from billing address (handle JSONB parsing)
      let customerName = order.customer_email;
      try {
        const billingAddress = typeof order.billing_address === 'string' 
          ? JSON.parse(order.billing_address) 
          : order.billing_address;
        if (billingAddress?.firstName && billingAddress?.lastName) {
          customerName = `${billingAddress.firstName} ${billingAddress.lastName}`;
        }
      } catch (error) {
        // If parsing fails, use email as fallback
        console.warn('Could not parse billing address for customer name:', error);
      }

      // Trigger admin note event if a new note was added
      if (hasNewNote) {
        try {
          const totalAmount = typeof order.total_amount === 'string' ? parseFloat(order.total_amount) : Number(order.total_amount) || 0;
          
          await this.emailService.triggerEvent(
            'admin.note_added',
            {
              order_number: order.order_number,
              customer_name: customerName,
              customer_email: order.customer_email,
              order_total: `$${totalAmount.toFixed(2)}`,
              note: notes
            },
            {
              customerEmail: order.customer_email,
              customerName: customerName,
              adminEmail: 'info@simfab.com'
            }
          );

        } catch (emailError) {
          console.error('❌ [DEBUG] Failed to trigger admin.note_added event:', emailError);
        }
      }

      // Trigger appropriate event based on status change - automatically sends emails for all templates registered for the event
      try {
        let triggerEvent: string | null = null;
        
        if (status === 'processing') {
          triggerEvent = 'order.processing';
        } else if (status === 'completed' || status === 'delivered') {
          triggerEvent = 'order.completed';
        } else if (status === 'cancelled') {
          triggerEvent = 'order.cancelled';
        } else if (status === 'on_hold') {
          triggerEvent = 'order.on_hold';
        } else if (status === 'refunded') {
          triggerEvent = 'order.refunded';
        }

        if (triggerEvent) {
          // Convert string amounts to numbers (PostgreSQL returns numeric types as strings)
          const totalAmount = typeof order.total_amount === 'string' ? parseFloat(order.total_amount) : Number(order.total_amount) || 0;


          await this.emailService.triggerEvent(
            triggerEvent,
            {
              order_number: order.order_number,
              customer_name: customerName,
              customer_email: order.customer_email,
              order_total: `$${totalAmount.toFixed(2)}`,
              order_date: new Date(order.created_at).toLocaleDateString(),
              tracking_number: trackingNumber || '',
              carrier: carrier || '',
              cancellation_reason: (status === 'cancelled' && notes) ? notes : ''
            },
            {
              customerEmail: order.customer_email,
              customerName: customerName,
              adminEmail: 'info@simfab.com'
            }
          );

        }
      } catch (emailError) {
        console.error(`Failed to trigger ${status} event emails:`, emailError);
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

  /**
   * Get revenue time-series data for charts
   * GET /api/admin/analytics/revenue-timeseries?period=30d&interval=daily
   */
  getRevenueTimeSeries = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pool = this.orderService['pool'];
      const { period = '30d', interval = 'daily' } = req.query;

      // Calculate date range based on period
      let dateCondition = '';
      let groupByFormat = '';

      switch (period) {
        case '7d':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
          groupByFormat = interval === 'hourly'
            ? "TO_CHAR(created_at, 'YYYY-MM-DD HH24')"
            : "TO_CHAR(created_at, 'YYYY-MM-DD')";
          break;
        case '30d':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
          groupByFormat = "TO_CHAR(created_at, 'YYYY-MM-DD')";
          break;
        case '90d':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '90 days'";
          groupByFormat = "TO_CHAR(created_at, 'YYYY-MM-DD')";
          break;
        case '1y':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '1 year'";
          groupByFormat = "TO_CHAR(created_at, 'YYYY-MM')";
          break;
        default:
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
          groupByFormat = "TO_CHAR(created_at, 'YYYY-MM-DD')";
      }

      const sql = `
        SELECT
          ${groupByFormat} as date,
          COUNT(*)::int as order_count,
          COALESCE(SUM(total_amount), 0)::float as revenue
        FROM orders
        WHERE ${dateCondition}
        AND payment_status = 'paid'
        GROUP BY ${groupByFormat}
        ORDER BY date
      `;

      const result = await pool.query(sql);

      res.json(successResponse({
        period,
        interval,
        data: result.rows
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get orders time-series data for charts
   * GET /api/admin/analytics/orders-timeseries?period=30d&interval=daily
   */
  getOrdersTimeSeries = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pool = this.orderService['pool'];
      const { period = '30d', interval = 'daily' } = req.query;

      // Calculate date range based on period
      let dateCondition = '';
      let groupByFormat = '';

      switch (period) {
        case '7d':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
          groupByFormat = interval === 'hourly'
            ? "TO_CHAR(created_at, 'YYYY-MM-DD HH24')"
            : "TO_CHAR(created_at, 'YYYY-MM-DD')";
          break;
        case '30d':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
          groupByFormat = "TO_CHAR(created_at, 'YYYY-MM-DD')";
          break;
        case '90d':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '90 days'";
          groupByFormat = "TO_CHAR(created_at, 'YYYY-MM-DD')";
          break;
        case '1y':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '1 year'";
          groupByFormat = "TO_CHAR(created_at, 'YYYY-MM')";
          break;
        default:
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
          groupByFormat = "TO_CHAR(created_at, 'YYYY-MM-DD')";
      }

      const sql = `
        SELECT
          ${groupByFormat} as date,
          COUNT(*)::int as total_orders,
          COUNT(*) FILTER (WHERE status = 'pending')::int as pending_orders,
          COUNT(*) FILTER (WHERE status = 'processing')::int as processing_orders,
          COUNT(*) FILTER (WHERE status = 'shipped')::int as shipped_orders,
          COUNT(*) FILTER (WHERE status = 'delivered')::int as delivered_orders,
          COUNT(*) FILTER (WHERE status = 'cancelled')::int as cancelled_orders
        FROM orders
        WHERE ${dateCondition}
        GROUP BY ${groupByFormat}
        ORDER BY date
      `;

      const result = await pool.query(sql);

      res.json(successResponse({
        period,
        interval,
        data: result.rows
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get order status distribution for pie chart
   * GET /api/admin/analytics/order-status-distribution?period=30d
   */
  getOrderStatusDistribution = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pool = this.orderService['pool'];
      const { period = '30d' } = req.query;

      // Calculate date range based on period
      let dateCondition = '';

      switch (period) {
        case '7d':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case '30d':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
          break;
        case '90d':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '90 days'";
          break;
        case '1y':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '1 year'";
          break;
        default:
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
      }

      const sql = `
        SELECT
          status,
          COUNT(*)::int as count,
          COALESCE(SUM(total_amount), 0)::float as total_revenue
        FROM orders
        WHERE ${dateCondition}
        GROUP BY status
        ORDER BY count DESC
      `;

      const result = await pool.query(sql);

      res.json(successResponse({
        period,
        data: result.rows
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get customer analytics overview
   * GET /api/admin/analytics/customers/overview?period=30d
   */
  getCustomerAnalyticsOverview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pool = this.orderService['pool'];
      const { period = '30d' } = req.query;

      // Calculate date range based on period
      let dateCondition = '';

      switch (period) {
        case '7d':
          dateCondition = "o.created_at >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case '30d':
          dateCondition = "o.created_at >= CURRENT_DATE - INTERVAL '30 days'";
          break;
        case '90d':
          dateCondition = "o.created_at >= CURRENT_DATE - INTERVAL '90 days'";
          break;
        case '1y':
          dateCondition = "o.created_at >= CURRENT_DATE - INTERVAL '1 year'";
          break;
        default:
          dateCondition = "o.created_at >= CURRENT_DATE - INTERVAL '30 days'";
      }

      // Get customer metrics
      const customerMetricsSql = `
        SELECT
          COUNT(DISTINCT o.user_id)::int as total_customers,
          COUNT(DISTINCT CASE WHEN o.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN o.user_id END)::int as new_customers_30d,
          AVG(customer_order_count)::float as avg_orders_per_customer,
          AVG(customer_total_spent)::float as avg_lifetime_value
        FROM orders o
        JOIN (
          SELECT
            user_id,
            COUNT(*) as customer_order_count,
            SUM(total_amount) as customer_total_spent
          FROM orders
          WHERE payment_status = 'paid'
          GROUP BY user_id
        ) customer_stats ON customer_stats.user_id = o.user_id
        WHERE ${dateCondition}
        AND o.payment_status = 'paid'
      `;

      const metricsResult = await pool.query(customerMetricsSql);

      res.json(successResponse({
        period,
        overview: metricsResult.rows[0]
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get customer segments
   * GET /api/admin/analytics/customers/segments?period=30d
   */
  getCustomerSegments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pool = this.orderService['pool'];
      const { period = '30d' } = req.query;

      // Calculate date range based on period
      let dateCondition = '';

      switch (period) {
        case '7d':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case '30d':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
          break;
        case '90d':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '90 days'";
          break;
        case '1y':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '1 year'";
          break;
        default:
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
      }

      const segmentsSql = `
        SELECT
          CASE
            WHEN total_orders >= 10 THEN 'VIP'
            WHEN total_orders >= 5 THEN 'Regular'
            WHEN total_orders >= 1 THEN 'New'
            ELSE 'Prospect'
          END as segment,
          COUNT(*)::int as customer_count,
          AVG(total_spent)::float as avg_spent,
          SUM(total_spent)::float as total_segment_revenue,
          AVG(total_orders)::float as avg_orders
        FROM (
          SELECT
            user_id,
            COUNT(*) as total_orders,
            SUM(total_amount) as total_spent
          FROM orders
          WHERE payment_status = 'paid'
          AND ${dateCondition}
          GROUP BY user_id
        ) customer_summary
        GROUP BY segment
        ORDER BY total_segment_revenue DESC
      `;

      const result = await pool.query(segmentsSql);

      res.json(successResponse({
        period,
        segments: result.rows
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get customer lifetime value analysis
   * GET /api/admin/analytics/customers/lifetime-value?period=90d
   */
  getCustomerLifetimeValue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pool = this.orderService['pool'];
      const { period = '90d' } = req.query;

      // Calculate date range based on period
      let dateCondition = '';

      switch (period) {
        case '30d':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
          break;
        case '90d':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '90 days'";
          break;
        case '1y':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '1 year'";
          break;
        default:
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '90 days'";
      }

      const clvSql = `
        SELECT
          user_id,
          COUNT(*)::int as total_orders,
          SUM(total_amount)::float as lifetime_value,
          AVG(total_amount)::float as avg_order_value,
          MIN(created_at) as first_order_date,
          MAX(created_at) as last_order_date,
          EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 86400 as customer_age_days
        FROM orders
        WHERE payment_status = 'paid'
        AND ${dateCondition}
        GROUP BY user_id
        HAVING COUNT(*) >= 1
        ORDER BY lifetime_value DESC
        LIMIT 100
      `;

      const result = await pool.query(clvSql);

      // Calculate CLV statistics
      const clvStats = result.rows.reduce((acc, customer) => {
        acc.totalCustomers += 1;
        acc.totalValue += customer.lifetime_value;
        acc.avgOrderValue += customer.avg_order_value;

        if (customer.lifetime_value >= 1000) acc.highValueCustomers += 1;
        else if (customer.lifetime_value >= 500) acc.mediumValueCustomers += 1;
        else acc.lowValueCustomers += 1;

        return acc;
      }, {
        totalCustomers: 0,
        totalValue: 0,
        avgOrderValue: 0,
        highValueCustomers: 0,
        mediumValueCustomers: 0,
        lowValueCustomers: 0
      });

      if (clvStats.totalCustomers > 0) {
        clvStats.avgOrderValue = clvStats.avgOrderValue / clvStats.totalCustomers;
        clvStats.avgLifetimeValue = clvStats.totalValue / clvStats.totalCustomers;
      }

      res.json(successResponse({
        period,
        customers: result.rows,
        statistics: clvStats
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get customer growth trend over time
   * GET /api/admin/analytics/customers/growth-trend?period=90d
   */
  getCustomerGrowthTrend = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pool = this.orderService['pool'];
      const { period = '90d' } = req.query;

      // Calculate date range based on period
      let dateCondition = '';
      let groupByFormat = '';

      switch (period) {
        case '30d':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
          groupByFormat = "TO_CHAR(created_at, 'YYYY-MM-DD')";
          break;
        case '90d':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '90 days'";
          groupByFormat = "TO_CHAR(created_at, 'YYYY-MM-DD')";
          break;
        case '1y':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '1 year'";
          groupByFormat = "TO_CHAR(created_at, 'YYYY-MM')";
          break;
        default:
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '90 days'";
          groupByFormat = "TO_CHAR(created_at, 'YYYY-MM-DD')";
      }

      const growthSql = `
        SELECT
          ${groupByFormat} as date,
          COUNT(DISTINCT user_id)::int as new_customers,
          COUNT(DISTINCT CASE WHEN total_orders_by_customer > 1 THEN user_id END)::int as returning_customers,
          COUNT(*)::int as total_orders
        FROM (
          SELECT
            o.user_id,
            o.created_at,
            COUNT(*) OVER (PARTITION BY o.user_id ORDER BY o.created_at) as order_sequence,
            COUNT(*) OVER (PARTITION BY o.user_id) as total_orders_by_customer
          FROM orders o
          WHERE o.payment_status = 'paid'
          AND ${dateCondition}
        ) customer_orders
        WHERE order_sequence = 1  -- Only count first order per customer per period
        GROUP BY ${groupByFormat}
        ORDER BY date
      `;

      const result = await pool.query(growthSql);

      // Calculate cumulative customer count
      let cumulativeCustomers = 0;
      const dataWithCumulative = result.rows.map(row => ({
        ...row,
        cumulative_customers: (cumulativeCustomers += row.new_customers)
      }));

      res.json(successResponse({
        period,
        data: dataWithCumulative
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get product performance analytics
   * GET /api/admin/analytics/products/performance?period=30d&limit=20
   */
  getProductPerformance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pool = this.orderService['pool'];
      const { period = '30d', limit = '20' } = req.query;

      // Calculate date range based on period
      let dateCondition = '';

      switch (period) {
        case '7d':
          dateCondition = "oi.created_at >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case '30d':
          dateCondition = "oi.created_at >= CURRENT_DATE - INTERVAL '30 days'";
          break;
        case '90d':
          dateCondition = "oi.created_at >= CURRENT_DATE - INTERVAL '90 days'";
          break;
        case '1y':
          dateCondition = "oi.created_at >= CURRENT_DATE - INTERVAL '1 year'";
          break;
        default:
          dateCondition = "oi.created_at >= CURRENT_DATE - INTERVAL '30 days'";
      }

      const sql = `
        SELECT
          p.id,
          p.name as product_name,
          p.sku,
          p.regular_price,
          COALESCE(SUM(oi.quantity), 0)::int as total_sold,
          COALESCE(SUM(oi.total_price), 0)::float as total_revenue,
          COALESCE(AVG(oi.unit_price), 0)::float as avg_selling_price,
          COUNT(DISTINCT o.id)::int as total_orders,
          p.stock as current_stock,
          CASE
            WHEN SUM(oi.quantity) > 0 THEN
              ROUND(
                (SUM(oi.total_price) / SUM(oi.quantity)) *
                (SUM(oi.quantity) / GREATEST(EXTRACT(EPOCH FROM (CURRENT_DATE - MIN(o.created_at))) / 86400, 1)) *
                (SUM(oi.quantity) / GREATEST(p.stock, 1)) *
                10
              ) / 10
            ELSE 0
          END as performance_score
        FROM products p
        LEFT JOIN order_items oi ON oi.product_id = p.id
        LEFT JOIN orders o ON o.id = oi.order_id AND o.payment_status = 'paid' AND ${dateCondition}
        WHERE p.status = 'active'
        GROUP BY p.id, p.name, p.sku, p.regular_price, p.stock
        ORDER BY total_revenue DESC
        LIMIT $1
      `;

      const result = await pool.query(sql, [parseInt(limit as string) || 20]);

      res.json(successResponse({
        period,
        limit: parseInt(limit as string) || 20,
        products: result.rows
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get product performance by category
   * GET /api/admin/analytics/products/categories?period=30d
   */
  getProductCategoriesAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pool = this.orderService['pool'];
      const { period = '30d' } = req.query;

      // Calculate date range based on period
      let dateCondition = '';

      switch (period) {
        case '7d':
          dateCondition = "o.created_at >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case '30d':
          dateCondition = "o.created_at >= CURRENT_DATE - INTERVAL '30 days'";
          break;
        case '90d':
          dateCondition = "o.created_at >= CURRENT_DATE - INTERVAL '90 days'";
          break;
        case '1y':
          dateCondition = "o.created_at >= CURRENT_DATE - INTERVAL '1 year'";
          break;
        default:
          dateCondition = "o.created_at >= CURRENT_DATE - INTERVAL '30 days'";
      }

      const sql = `
        SELECT
          COALESCE(p.categories::text, 'uncategorized') as category,
          COUNT(DISTINCT p.id)::int as total_products,
          COUNT(DISTINCT o.id)::int as total_orders,
          COALESCE(SUM(oi.quantity), 0)::int as total_units_sold,
          COALESCE(SUM(oi.total_price), 0)::float as total_revenue,
          COALESCE(AVG(oi.total_price / NULLIF(oi.quantity, 0)), 0)::float as avg_order_value
        FROM products p
        LEFT JOIN order_items oi ON oi.product_id = p.id
        LEFT JOIN orders o ON o.id = oi.order_id AND o.payment_status = 'paid' AND ${dateCondition}
        WHERE p.status = 'active'
        GROUP BY p.categories
        ORDER BY total_revenue DESC
      `;

      const result = await pool.query(sql);

      res.json(successResponse({
        period,
        categories: result.rows
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get product stock turnover analytics
   * GET /api/admin/analytics/products/stock-turnover?period=90d
   */
  getProductStockTurnover = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pool = this.orderService['pool'];
      const { period = '90d' } = req.query;

      // Calculate date range based on period
      let dateCondition = '';

      switch (period) {
        case '30d':
          dateCondition = "o.created_at >= CURRENT_DATE - INTERVAL '30 days'";
          break;
        case '90d':
          dateCondition = "o.created_at >= CURRENT_DATE - INTERVAL '90 days'";
          break;
        case '1y':
          dateCondition = "o.created_at >= CURRENT_DATE - INTERVAL '1 year'";
          break;
        default:
          dateCondition = "o.created_at >= CURRENT_DATE - INTERVAL '90 days'";
      }

      const sql = `
        SELECT
          p.id,
          p.name as product_name,
          p.sku,
          p.stock as current_stock,
          COALESCE(SUM(oi.quantity), 0)::int as sold_in_period,
          CASE
            WHEN p.stock > 0 THEN
              ROUND((COALESCE(SUM(oi.quantity), 0) / p.stock) * 100) / 100
            ELSE 0
          END as turnover_ratio,
          CASE
            WHEN COALESCE(SUM(oi.quantity), 0) > 0 THEN
              ROUND(p.stock / (COALESCE(SUM(oi.quantity), 0) / GREATEST(EXTRACT(EPOCH FROM (CURRENT_DATE - MIN(o.created_at))) / 86400 / 30, 1)))
            ELSE 999
          END as months_of_stock,
          p.low_stock_amount,
          CASE WHEN p.stock <= COALESCE(p.low_stock_amount, 10) THEN true ELSE false END as is_low_stock
        FROM products p
        LEFT JOIN order_items oi ON oi.product_id = p.id
        LEFT JOIN orders o ON o.id = oi.order_id AND o.payment_status = 'paid' AND ${dateCondition}
        WHERE p.status = 'active'
        GROUP BY p.id, p.name, p.sku, p.stock, p.low_stock_amount
        ORDER BY turnover_ratio DESC, sold_in_period DESC
        LIMIT 50
      `;

      const result = await pool.query(sql);

      res.json(successResponse({
        period,
        products: result.rows
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get period-over-period growth analysis
   * GET /api/admin/analytics/comparative/growth?period=30d&compare=previous
   */
  getComparativeGrowth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pool = this.orderService['pool'];
      const { period = '30d', compare = 'previous' } = req.query;

      // Calculate date ranges
      let currentPeriodCondition = '';
      let previousPeriodCondition = '';

      switch (period) {
        case '7d':
          currentPeriodCondition = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
          previousPeriodCondition = "created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days'";
          break;
        case '30d':
          currentPeriodCondition = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
          previousPeriodCondition = "created_at >= CURRENT_DATE - INTERVAL '60 days' AND created_at < CURRENT_DATE - INTERVAL '30 days'";
          break;
        case '90d':
          currentPeriodCondition = "created_at >= CURRENT_DATE - INTERVAL '90 days'";
          previousPeriodCondition = "created_at >= CURRENT_DATE - INTERVAL '180 days' AND created_at < CURRENT_DATE - INTERVAL '90 days'";
          break;
        case '1y':
          currentPeriodCondition = "created_at >= CURRENT_DATE - INTERVAL '1 year'";
          previousPeriodCondition = "created_at >= CURRENT_DATE - INTERVAL '2 years' AND created_at < CURRENT_DATE - INTERVAL '1 year'";
          break;
        default:
          currentPeriodCondition = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
          previousPeriodCondition = "created_at >= CURRENT_DATE - INTERVAL '60 days' AND created_at < CURRENT_DATE - INTERVAL '30 days'";
      }

      // Get current period metrics
      const currentPeriodSql = `
        SELECT
          COUNT(*)::int as order_count,
          COUNT(DISTINCT user_id)::int as customer_count,
          COALESCE(SUM(total_amount), 0)::float as revenue,
          COALESCE(AVG(total_amount), 0)::float as avg_order_value
        FROM orders
        WHERE payment_status = 'paid'
        AND ${currentPeriodCondition}
      `;

      // Get previous period metrics
      const previousPeriodSql = `
        SELECT
          COUNT(*)::int as order_count,
          COUNT(DISTINCT user_id)::int as customer_count,
          COALESCE(SUM(total_amount), 0)::float as revenue,
          COALESCE(AVG(total_amount), 0)::float as avg_order_value
        FROM orders
        WHERE payment_status = 'paid'
        AND ${previousPeriodCondition}
      `;

      const [currentResult, previousResult] = await Promise.all([
        pool.query(currentPeriodSql),
        pool.query(previousPeriodSql)
      ]);

      const current = currentResult.rows[0];
      const previous = previousResult.rows[0];

      // Calculate growth percentages
      const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      const growth = {
        orders: {
          current: current.order_count,
          previous: previous.order_count,
          growth: calculateGrowth(current.order_count, previous.order_count),
          direction: current.order_count >= previous.order_count ? 'up' : 'down'
        },
        customers: {
          current: current.customer_count,
          previous: previous.customer_count,
          growth: calculateGrowth(current.customer_count, previous.customer_count),
          direction: current.customer_count >= previous.customer_count ? 'up' : 'down'
        },
        revenue: {
          current: current.revenue,
          previous: previous.revenue,
          growth: calculateGrowth(current.revenue, previous.revenue),
          direction: current.revenue >= previous.revenue ? 'up' : 'down'
        },
        avgOrderValue: {
          current: current.avg_order_value,
          previous: previous.avg_order_value,
          growth: calculateGrowth(current.avg_order_value, previous.avg_order_value),
          direction: current.avg_order_value >= previous.avg_order_value ? 'up' : 'down'
        }
      };

      res.json(successResponse({
        period,
        comparison: compare,
        growth
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get year-over-year comparison
   * GET /api/admin/analytics/comparative/year-over-year?period=12m
   */
  getYearOverYearComparison = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pool = this.orderService['pool'];
      const { period = '12m' } = req.query;

      // Get current year data by month
      const currentYearSql = `
        SELECT
          EXTRACT(MONTH FROM created_at)::int as month,
          TO_CHAR(created_at, 'Month') as month_name,
          COUNT(*)::int as order_count,
          COALESCE(SUM(total_amount), 0)::float as revenue,
          COUNT(DISTINCT user_id)::int as customers
        FROM orders
        WHERE payment_status = 'paid'
        AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
        GROUP BY EXTRACT(MONTH FROM created_at), TO_CHAR(created_at, 'Month')
        ORDER BY month
      `;

      // Get previous year data by month
      const previousYearSql = `
        SELECT
          EXTRACT(MONTH FROM created_at)::int as month,
          TO_CHAR(created_at, 'Month') as month_name,
          COUNT(*)::int as order_count,
          COALESCE(SUM(total_amount), 0)::float as revenue,
          COUNT(DISTINCT user_id)::int as customers
        FROM orders
        WHERE payment_status = 'paid'
        AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE) - 1
        GROUP BY EXTRACT(MONTH FROM created_at), TO_CHAR(created_at, 'Month')
        ORDER BY month
      `;

      const [currentYearResult, previousYearResult] = await Promise.all([
        pool.query(currentYearSql),
        pool.query(previousYearSql)
      ]);

      // Create comparison data
      const months = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];

      const comparisonData = months.map((monthName, index) => {
        const currentMonth = currentYearResult.rows.find(r => r.month === index + 1) || {
          order_count: 0, revenue: 0, customers: 0, month_name: monthName
        };
        const previousMonth = previousYearResult.rows.find(r => r.month === index + 1) || {
          order_count: 0, revenue: 0, customers: 0, month_name: monthName
        };

        const calculateGrowth = (current: number, previous: number) => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return ((current - previous) / previous) * 100;
        };

        return {
          month: monthName,
          current_year: {
            orders: currentMonth.order_count,
            revenue: currentMonth.revenue,
            customers: currentMonth.customers
          },
          previous_year: {
            orders: previousMonth.order_count,
            revenue: previousMonth.revenue,
            customers: previousMonth.customers
          },
          growth: {
            orders: calculateGrowth(currentMonth.order_count, previousMonth.order_count),
            revenue: calculateGrowth(currentMonth.revenue, previousMonth.revenue),
            customers: calculateGrowth(currentMonth.customers, previousMonth.customers)
          }
        };
      });

      // Calculate overall YoY growth
      const currentYearTotal = currentYearResult.rows.reduce((acc, month) => ({
        orders: acc.orders + month.order_count,
        revenue: acc.revenue + month.revenue,
        customers: acc.customers + month.customers
      }), { orders: 0, revenue: 0, customers: 0 });

      const previousYearTotal = previousYearResult.rows.reduce((acc, month) => ({
        orders: acc.orders + month.order_count,
        revenue: acc.revenue + month.revenue,
        customers: acc.customers + month.customers
      }), { orders: 0, revenue: 0, customers: 0 });

      const overallGrowth = {
        orders: ((currentYearTotal.orders - previousYearTotal.orders) / (previousYearTotal.orders || 1)) * 100,
        revenue: ((currentYearTotal.revenue - previousYearTotal.revenue) / (previousYearTotal.revenue || 1)) * 100,
        customers: ((currentYearTotal.customers - previousYearTotal.customers) / (previousYearTotal.customers || 1)) * 100
      };

      res.json(successResponse({
        period,
        monthly_comparison: comparisonData,
        overall_growth: overallGrowth,
        summary: {
          current_year: currentYearTotal,
          previous_year: previousYearTotal
        }
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get performance metrics overview
   * GET /api/admin/analytics/performance/overview?period=30d
   */
  getPerformanceOverview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pool = this.orderService['pool'];
      const { period = '30d' } = req.query;

      // Calculate date range based on period
      let dateCondition = '';

      switch (period) {
        case '7d':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case '30d':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
          break;
        case '90d':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '90 days'";
          break;
        case '1y':
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '1 year'";
          break;
        default:
          dateCondition = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
      }

      // Get comprehensive performance metrics
      const performanceSql = `
        WITH order_metrics AS (
          SELECT
            COUNT(*)::int as total_orders,
            COUNT(*) FILTER (WHERE payment_status = 'paid')::int as paid_orders,
            COUNT(DISTINCT user_id)::int as unique_customers,
            COALESCE(SUM(total_amount), 0)::float as total_revenue,
            COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'paid'), 0)::float as paid_revenue,
            COALESCE(AVG(total_amount), 0)::float as avg_order_value,
            COALESCE(AVG(total_amount) FILTER (WHERE payment_status = 'paid'), 0)::float as avg_paid_order_value,
            COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::int as today_orders
          FROM orders
          WHERE ${dateCondition}
        ),
        cart_metrics AS (
          SELECT
            COUNT(*)::int as total_carts,
            COUNT(*) FILTER (WHERE status = 'active')::int as active_carts,
            COUNT(*) FILTER (WHERE status = 'checkout')::int as checkout_carts,
            COUNT(*) FILTER (WHERE status = 'converted')::int as converted_carts,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '1 hour')::int as recent_carts
          FROM carts
          WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        ),
        customer_metrics AS (
          SELECT
            COUNT(DISTINCT user_id)::int as total_customers,
            COUNT(DISTINCT CASE WHEN first_order_date >= CURRENT_DATE - INTERVAL '30 days' THEN user_id END)::int as new_customers,
            AVG(customer_order_count)::float as avg_orders_per_customer,
            AVG(customer_lifetime_value)::float as avg_customer_lifetime_value
          FROM (
            SELECT
              user_id,
              COUNT(*) as customer_order_count,
              SUM(total_amount) as customer_lifetime_value,
              MIN(created_at) as first_order_date
            FROM orders
            WHERE payment_status = 'paid' AND ${dateCondition}
            GROUP BY user_id
          ) customer_stats
        )
        SELECT
          om.*,
          cm.total_customers,
          cm.new_customers,
          cm.avg_orders_per_customer,
          cm.avg_customer_lifetime_value,
          cam.total_carts,
          cam.active_carts,
          cam.checkout_carts,
          cam.converted_carts,
          cam.recent_carts,
          -- Calculated metrics
          CASE WHEN om.total_orders > 0 THEN (om.paid_orders::float / om.total_orders) * 100 ELSE 0 END as conversion_rate,
          CASE WHEN cam.total_carts > 0 THEN (cam.converted_carts::float / cam.total_carts) * 100 ELSE 0 END as cart_conversion_rate,
          CASE WHEN om.unique_customers > 0 THEN om.total_orders::float / om.unique_customers ELSE 0 END as orders_per_customer,
          CASE WHEN om.paid_orders > 0 THEN om.paid_revenue / om.paid_orders ELSE 0 END as avg_revenue_per_order
        FROM order_metrics om
        CROSS JOIN customer_metrics cm
        CROSS JOIN cart_metrics cam
      `;

      const result = await pool.query(performanceSql);

      // Calculate additional derived metrics
      const data = result.rows[0];
      const performanceMetrics = {
        period,
        orders: {
          total: data.total_orders,
          paid: data.paid_orders,
          unpaid: data.total_orders - data.paid_orders,
          today: data.today_orders,
          conversion_rate: data.conversion_rate
        },
        revenue: {
          total: data.total_revenue,
          paid: data.paid_revenue,
          avg_order_value: data.avg_order_value,
          avg_paid_order_value: data.avg_paid_order_value,
          avg_revenue_per_order: data.avg_revenue_per_order
        },
        customers: {
          total: data.total_customers,
          new: data.new_customers,
          avg_orders_per_customer: data.avg_orders_per_customer,
          avg_lifetime_value: data.avg_customer_lifetime_value
        },
        carts: {
          total: data.total_carts,
          active: data.active_carts,
          checkout: data.checkout_carts,
          converted: data.converted_carts,
          recent: data.recent_carts,
          conversion_rate: data.cart_conversion_rate
        },
        kpis: {
          conversion_rate: data.conversion_rate,
          cart_abandonment_rate: data.checkout_carts > 0 ? ((data.checkout_carts - data.converted_carts) / data.checkout_carts) * 100 : 0,
          customer_acquisition_rate: data.new_customers > 0 ? (data.new_customers / data.total_customers) * 100 : 0,
          repeat_purchase_rate: data.avg_orders_per_customer > 1 ? ((data.avg_orders_per_customer - 1) / data.avg_orders_per_customer) * 100 : 0
        }
      };

      res.json(successResponse(performanceMetrics));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get conversion funnel analysis
   * GET /api/admin/analytics/performance/conversion-funnel?period=30d
   */
  getConversionFunnel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pool = this.orderService['pool'];
      const { period = '30d' } = req.query;

      // Calculate date range based on period
      let dateInterval = '';
      let visitorDateCondition = '';

      switch (period) {
        case '7d':
          dateInterval = "7 days";
          visitorDateCondition = "first_visit_at >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case '30d':
          dateInterval = "30 days";
          visitorDateCondition = "first_visit_at >= CURRENT_DATE - INTERVAL '30 days'";
          break;
        case '90d':
          dateInterval = "90 days";
          visitorDateCondition = "first_visit_at >= CURRENT_DATE - INTERVAL '90 days'";
          break;
        case '1y':
          dateInterval = "1 year";
          visitorDateCondition = "first_visit_at >= CURRENT_DATE - INTERVAL '1 year'";
          break;
        default:
          dateInterval = "30 days";
          visitorDateCondition = "first_visit_at >= CURRENT_DATE - INTERVAL '30 days'";
      }

      // Get real visitor count from visitor_sessions table
      // Use deduplication: COUNT(DISTINCT COALESCE(user_id::text, session_id))
      const visitorSql = `
        SELECT COUNT(DISTINCT COALESCE(user_id::text, session_id))::int as visitors
        FROM visitor_sessions
        WHERE ${visitorDateCondition}
      `;

      // Get funnel metrics
      const funnelSql = `
        SELECT
          -- Cart creation
          COUNT(DISTINCT c.id)::int as carts_created,

          -- Checkout initiation (orders created)
          COUNT(DISTINCT o.id)::int as checkouts_initiated,

          -- Successful payments
          COUNT(DISTINCT CASE WHEN o.payment_status = 'paid' THEN o.id END)::int as successful_payments,

          -- Delivered orders
          COUNT(DISTINCT CASE WHEN o.status = 'delivered' THEN o.id END)::int as completed_orders

        FROM carts c
        FULL OUTER JOIN orders o ON o.cart_id::integer = c.id
        WHERE (c.created_at >= CURRENT_DATE - INTERVAL '${dateInterval}' OR c.created_at IS NULL)
        AND (o.created_at >= CURRENT_DATE - INTERVAL '${dateInterval}' OR o.created_at IS NULL)
      `;

      const [visitorResult, funnelResult] = await Promise.all([
        pool.query(visitorSql),
        pool.query(funnelSql)
      ]);

      const visitors = visitorResult.rows[0].visitors || 0;
      const data = funnelResult.rows[0];

      // Calculate funnel conversion rates
      const funnel = {
        period,
        stages: [
          {
            name: 'Visitors',
            count: visitors,
            conversion_rate: 100
          },
          {
            name: 'Carts Created',
            count: data.carts_created || 0,
            conversion_rate: visitors > 0 ? ((data.carts_created || 0) / visitors) * 100 : 0
          },
          {
            name: 'Checkouts Initiated',
            count: data.checkouts_initiated || 0,
            conversion_rate: (data.carts_created || 0) > 0 ? ((data.checkouts_initiated || 0) / (data.carts_created || 0)) * 100 : 0
          },
          {
            name: 'Successful Payments',
            count: data.successful_payments || 0,
            conversion_rate: (data.checkouts_initiated || 0) > 0 ? ((data.successful_payments || 0) / (data.checkouts_initiated || 0)) * 100 : 0
          },
          {
            name: 'Completed Orders',
            count: data.completed_orders || 0,
            conversion_rate: (data.successful_payments || 0) > 0 ? ((data.completed_orders || 0) / (data.successful_payments || 0)) * 100 : 0
          }
        ],
        drop_off_points: [
          {
            from: 'Visitors to Carts',
            drop_off: visitors - (data.carts_created || 0),
            rate: visitors > 0 ? ((visitors - (data.carts_created || 0)) / visitors) * 100 : 0
          },
          {
            from: 'Carts to Checkout',
            drop_off: (data.carts_created || 0) - (data.checkouts_initiated || 0),
            rate: (data.carts_created || 0) > 0 ? (((data.carts_created || 0) - (data.checkouts_initiated || 0)) / (data.carts_created || 0)) * 100 : 0
          },
          {
            from: 'Checkout to Payment',
            drop_off: (data.checkouts_initiated || 0) - (data.successful_payments || 0),
            rate: (data.checkouts_initiated || 0) > 0 ? (((data.checkouts_initiated || 0) - (data.successful_payments || 0)) / (data.checkouts_initiated || 0)) * 100 : 0
          }
        ]
      };

      res.json(successResponse(funnel));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get inventory analytics overview
   * GET /api/admin/analytics/inventory/overview?period=30d
   */
  getInventoryOverview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pool = this.orderService['pool'];
      const { period = '30d' } = req.query;

      // Get comprehensive inventory analytics
      const inventorySql = `
        SELECT
          COUNT(*)::int as total_products,
          COUNT(*) FILTER (WHERE stock > 0)::int as in_stock_products,
          COUNT(*) FILTER (WHERE stock = 0)::int as out_of_stock_products,
          COUNT(*) FILTER (WHERE stock <= COALESCE(low_stock_amount, 10))::int as low_stock_products,
          SUM(stock)::int as total_stock_quantity,
          AVG(stock)::float as avg_stock_per_product,
          SUM(regular_price * stock)::float as total_stock_value,
          AVG(regular_price)::float as avg_product_price
        FROM products
        WHERE status = 'active'
      `;

      const result = await pool.query(inventorySql);
      const inventoryData = result.rows[0];

      // Get stock movement data for the period
      const movementSql = `
        WITH stock_movements AS (
          SELECT
            p.id,
            p.name,
            p.stock as current_stock,
            COALESCE(SUM(oi.quantity), 0)::int as sold_in_period,
            p.low_stock_amount,
            CASE WHEN p.stock <= COALESCE(p.low_stock_amount, 10) THEN true ELSE false END as is_low_stock,
            CASE WHEN p.stock = 0 THEN true ELSE false END as is_out_of_stock
          FROM products p
          LEFT JOIN order_items oi ON oi.product_id = p.id
          LEFT JOIN orders o ON o.id = oi.order_id AND o.payment_status = 'paid'
            AND o.created_at >= CURRENT_DATE - INTERVAL '${period === '7d' ? '7 days' :
                                                   period === '30d' ? '30 days' :
                                                   period === '90d' ? '90 days' : '30 days'}'
          WHERE p.status = 'active'
          GROUP BY p.id, p.name, p.stock, p.low_stock_amount
        )
        SELECT
          COUNT(*)::int as total_products_analyzed,
          COUNT(*) FILTER (WHERE is_low_stock)::int as low_stock_count,
          COUNT(*) FILTER (WHERE is_out_of_stock)::int as out_of_stock_count,
          SUM(sold_in_period)::int as total_sold_in_period,
          AVG(sold_in_period)::float as avg_sold_per_product,
          SUM(current_stock)::int as total_current_stock,
          AVG(current_stock)::float as avg_stock_per_product
        FROM stock_movements
      `;

      const movementResult = await pool.query(movementSql);
      const movementData = movementResult.rows[0];

      // Calculate stock turnover rate and other metrics
      const stockTurnoverRate = movementData.total_current_stock > 0 ?
        (movementData.total_sold_in_period / movementData.total_current_stock) : 0;

      const inventoryAnalytics = {
        period,
        overview: {
          total_products: inventoryData.total_products,
          in_stock_products: inventoryData.in_stock_products,
          out_of_stock_products: inventoryData.out_of_stock_products,
          low_stock_products: inventoryData.low_stock_products,
          total_stock_quantity: inventoryData.total_stock_quantity,
          avg_stock_per_product: inventoryData.avg_stock_per_product,
          total_stock_value: inventoryData.total_stock_value,
          avg_product_price: inventoryData.avg_product_price
        },
        stock_health: {
          stock_turnover_rate: stockTurnoverRate,
          low_stock_percentage: (movementData.low_stock_count / movementData.total_products_analyzed) * 100,
          out_of_stock_percentage: (movementData.out_of_stock_count / movementData.total_products_analyzed) * 100,
          healthy_stock_percentage: 100 - ((movementData.low_stock_count + movementData.out_of_stock_count) / movementData.total_products_analyzed) * 100
        },
        sales_velocity: {
          total_sold_in_period: movementData.total_sold_in_period,
          avg_sold_per_product: movementData.avg_sold_per_product,
          products_with_movement: movementData.total_products_analyzed - movementData.out_of_stock_count,
          products_without_movement: movementData.out_of_stock_count
        },
        recommendations: {
          needs_restock: movementData.low_stock_count,
          needs_attention: movementData.out_of_stock_count,
          optimal_stock_level: Math.round(movementData.avg_sold_per_product * 30), // 30 days coverage
          estimated_monthly_sales: Math.round(movementData.total_sold_in_period * (30 / parseInt(String(period).replace('d', ''))))
        }
      };

      res.json(successResponse(inventoryAnalytics));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get inventory stock movements and trends
   * GET /api/admin/analytics/inventory/stock-movements?period=90d&limit=20
   */
  getInventoryStockMovements = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pool = this.orderService['pool'];
      const { period = '90d', limit = '20' } = req.query;

      const movementsSql = `
        SELECT
          p.id,
          p.name as product_name,
          p.sku,
          p.stock as current_stock,
          p.low_stock_amount,
          COALESCE(SUM(oi.quantity), 0)::int as sold_in_period,
          CASE
            WHEN p.stock > 0 THEN
              ROUND((COALESCE(SUM(oi.quantity), 0) / p.stock) * 100) / 100
            ELSE 0
          END as turnover_rate,
          CASE
            WHEN COALESCE(SUM(oi.quantity), 0) > 0 THEN
              ROUND(p.stock / (COALESCE(SUM(oi.quantity), 0) / GREATEST(EXTRACT(EPOCH FROM (CURRENT_DATE - MIN(o.created_at))) / 86400 / 30, 1)))
            ELSE 999
          END as months_of_stock,
          CASE WHEN p.stock <= COALESCE(p.low_stock_amount, 10) THEN 'low_stock'
               WHEN p.stock = 0 THEN 'out_of_stock'
               ELSE 'healthy' END as stock_status,
          MAX(o.created_at) as last_sale_date,
          COUNT(DISTINCT o.id) as total_orders
        FROM products p
        LEFT JOIN order_items oi ON oi.product_id = p.id
        LEFT JOIN orders o ON o.id = oi.order_id AND o.payment_status = 'paid'
          AND o.created_at >= CURRENT_DATE - INTERVAL '${period === '7d' ? '7 days' :
                                                   period === '30d' ? '30 days' :
                                                   period === '90d' ? '90 days' : '90 days'}'
        WHERE p.status = 'active'
        GROUP BY p.id, p.name, p.sku, p.stock, p.low_stock_amount
        ORDER BY
          CASE WHEN p.stock <= COALESCE(p.low_stock_amount, 10) THEN 1
               WHEN p.stock = 0 THEN 2
               ELSE 3 END,
          sold_in_period DESC
        LIMIT ${parseInt(limit as string) || 20}
      `;

      const result = await pool.query(movementsSql);

      res.json(successResponse({
        period,
        limit: parseInt(limit as string) || 20,
        movements: result.rows
      }));
    } catch (error) {
      next(error);
    }
  };
}


