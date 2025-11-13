/**
 * Admin Dashboard Routes
 * Routes for admin dashboard and analytics
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { AdminOrderController } from '../../controllers/adminOrderController';
import { AnalyticsController } from '../../controllers/analyticsController';
import { requireAuthority } from '../../middleware/auth';
import { adminRateLimiter } from '../../middleware/rateLimiter';

export const createAdminDashboardRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new AdminOrderController(pool);
  const analyticsController = new AnalyticsController(pool);

  // Apply rate limiting to all admin routes
  router.use(adminRateLimiter);

  /**
   * @route   GET /api/admin/dashboard/stats
   * @desc    Get dashboard statistics
   * @access  Admin with dashboard:view authority
   */
  router.get('/stats', requireAuthority('dashboard:view'), controller.getDashboardStats);

  /**
   * @route   GET /api/admin/analytics/revenue-timeseries
   * @desc    Get revenue time-series data for charts
   * @access  Admin with dashboard:view authority
   */
  router.get('/analytics/revenue-timeseries', requireAuthority('dashboard:view'), controller.getRevenueTimeSeries);

  /**
   * @route   GET /api/admin/analytics/orders-timeseries
   * @desc    Get orders time-series data for charts
   * @access  Admin with dashboard:view authority
   */
  router.get('/analytics/orders-timeseries', requireAuthority('dashboard:view'), controller.getOrdersTimeSeries);

  /**
   * @route   GET /api/admin/analytics/order-status-distribution
   * @desc    Get order status distribution for pie chart
   * @access  Admin with dashboard:view authority
   */
  router.get('/analytics/order-status-distribution', requireAuthority('dashboard:view'), controller.getOrderStatusDistribution);

  /**
   * @route   GET /api/admin/analytics/customers/overview
   * @desc    Get customer analytics overview
   * @access  Admin with dashboard:view authority
   */
  router.get('/analytics/customers/overview', requireAuthority('dashboard:view'), controller.getCustomerAnalyticsOverview);

  /**
   * @route   GET /api/admin/analytics/customers/segments
   * @desc    Get customer segmentation data
   * @access  Admin with dashboard:view authority
   */
  router.get('/analytics/customers/segments', requireAuthority('dashboard:view'), controller.getCustomerSegments);

  /**
   * @route   GET /api/admin/analytics/customers/lifetime-value
   * @desc    Get customer lifetime value analysis
   * @access  Admin with dashboard:view authority
   */
  router.get('/analytics/customers/lifetime-value', requireAuthority('dashboard:view'), controller.getCustomerLifetimeValue);

  /**
   * @route   GET /api/admin/analytics/customers/growth-trend
   * @desc    Get customer growth trend over time
   * @access  Admin with dashboard:view authority
   */
  router.get('/analytics/customers/growth-trend', requireAuthority('dashboard:view'), controller.getCustomerGrowthTrend);

  /**
   * @route   GET /api/admin/analytics/products/performance
   * @desc    Get product performance analytics
   * @access  Admin with dashboard:view authority
   */
  router.get('/analytics/products/performance', requireAuthority('dashboard:view'), controller.getProductPerformance);

  /**
   * @route   GET /api/admin/analytics/products/categories
   * @desc    Get product performance by category
   * @access  Admin with dashboard:view authority
   */
  router.get('/analytics/products/categories', requireAuthority('dashboard:view'), controller.getProductCategoriesAnalytics);

  /**
   * @route   GET /api/admin/analytics/products/stock-turnover
   * @desc    Get product stock turnover analytics
   * @access  Admin with dashboard:view authority
   */
  router.get('/analytics/products/stock-turnover', requireAuthority('dashboard:view'), controller.getProductStockTurnover);

  /**
   * @route   GET /api/admin/analytics/comparative/growth
   * @desc    Get period-over-period growth analysis
   * @access  Admin with dashboard:view authority
   */
  router.get('/analytics/comparative/growth', requireAuthority('dashboard:view'), controller.getComparativeGrowth);

  /**
   * @route   GET /api/admin/analytics/comparative/year-over-year
   * @desc    Get year-over-year comparison
   * @access  Admin with dashboard:view authority
   */
  router.get('/analytics/comparative/year-over-year', requireAuthority('dashboard:view'), controller.getYearOverYearComparison);

  /**
   * @route   GET /api/admin/analytics/performance/overview
   * @desc    Get performance metrics overview
   * @access  Admin with dashboard:view authority
   */
  router.get('/analytics/performance/overview', requireAuthority('dashboard:view'), controller.getPerformanceOverview);

  /**
   * @route   GET /api/admin/analytics/performance/conversion-funnel
   * @desc    Get conversion funnel analysis
   * @access  Admin with dashboard:view authority
   */
  router.get('/analytics/performance/conversion-funnel', requireAuthority('dashboard:view'), controller.getConversionFunnel);

  /**
   * @route   GET /api/admin/analytics/inventory/overview
   * @desc    Get inventory analytics overview
   * @access  Admin with dashboard:view authority
   */
  router.get('/analytics/inventory/overview', requireAuthority('dashboard:view'), controller.getInventoryOverview);

  /**
   * @route   GET /api/admin/analytics/inventory/stock-movements
   * @desc    Get inventory stock movements and trends
   * @access  Admin with dashboard:view authority
   */
  router.get('/analytics/inventory/stock-movements', requireAuthority('dashboard:view'), controller.getInventoryStockMovements);

  /**
   * @route   GET /api/admin/analytics/visitors/overview
   * @desc    Get visitor overview statistics
   * @access  Admin with dashboard:view authority
   */
  router.get('/analytics/visitors/overview', requireAuthority('dashboard:view'), analyticsController.getVisitorOverview);

  /**
   * @route   GET /api/admin/analytics/visitors/referrers
   * @desc    Get referrer breakdown
   * @access  Admin with dashboard:view authority
   */
  router.get('/analytics/visitors/referrers', requireAuthority('dashboard:view'), analyticsController.getReferrerBreakdown);

  /**
   * @route   GET /api/admin/analytics/visitors/returning
   * @desc    Get returning vs new visitor stats
   * @access  Admin with dashboard:view authority
   */
  router.get('/analytics/visitors/returning', requireAuthority('dashboard:view'), analyticsController.getReturningVisitors);

  /**
   * @route   GET /api/admin/analytics/visitors/pages
   * @desc    Get top pages
   * @access  Admin with dashboard:view authority
   */
  router.get('/analytics/visitors/pages', requireAuthority('dashboard:view'), analyticsController.getTopPages);

  return router;
};


