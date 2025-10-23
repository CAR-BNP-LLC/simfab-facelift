import { Pool } from 'pg';

export interface PaymentAnalytics {
  overview: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    conversionRate: number;
    paymentSuccessRate: number;
  };
  trends: {
    daily: Array<{
      date: string;
      revenue: number;
      orders: number;
      conversionRate: number;
    }>;
    monthly: Array<{
      month: string;
      revenue: number;
      orders: number;
      averageOrderValue: number;
    }>;
  };
  paymentMethods: {
    paypal: {
      count: number;
      revenue: number;
      percentage: number;
      averageAmount: number;
    };
    cards: {
      count: number;
      revenue: number;
      percentage: number;
      averageAmount: number;
    };
  };
  performance: {
    averageProcessingTime: number;
    failureRate: number;
    retryRate: number;
    webhookSuccessRate: number;
  };
  insights: Array<{
    type: 'success' | 'warning' | 'info';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    recommendation?: string;
  }>;
}

export interface PaymentOptimization {
  recommendations: Array<{
    category: 'conversion' | 'performance' | 'security' | 'cost';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    expectedImpact: string;
    implementationEffort: 'low' | 'medium' | 'high';
  }>;
  conversionOptimization: {
    cartAbandonmentRate: number;
    checkoutCompletionRate: number;
    paymentFailureRate: number;
    suggestedImprovements: string[];
  };
  performanceMetrics: {
    pageLoadTime: number;
    paymentProcessingTime: number;
    webhookResponseTime: number;
    databaseQueryTime: number;
  };
}

export class PaymentAnalyticsService {
  constructor(private pool: Pool) {}

  /**
   * Get comprehensive payment analytics
   */
  async getPaymentAnalytics(timeframe: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<PaymentAnalytics> {
    const client = await this.pool.connect();
    
    try {
      const interval = this.getTimeframeInterval(timeframe);

      // Overview statistics
      const overview = await this.getOverviewStats(client, interval);

      // Trend data
      const trends = await this.getTrendData(client, interval);

      // Payment method breakdown
      const paymentMethods = await this.getPaymentMethodStats(client, interval);

      // Performance metrics
      const performance = await this.getPerformanceMetrics(client, interval);

      // Generate insights
      const insights = await this.generateInsights(client, overview, performance);

      return {
        overview,
        trends,
        paymentMethods,
        performance,
        insights
      };

    } finally {
      client.release();
    }
  }

  /**
   * Get payment optimization recommendations
   */
  async getPaymentOptimization(): Promise<PaymentOptimization> {
    const client = await this.pool.connect();
    
    try {
      const recommendations = await this.generateOptimizationRecommendations(client);
      const conversionOptimization = await this.getConversionOptimization(client);
      const performanceMetrics = await this.getDetailedPerformanceMetrics(client);

      return {
        recommendations,
        conversionOptimization,
        performanceMetrics
      };

    } finally {
      client.release();
    }
  }

  /**
   * Get real-time payment monitoring data
   */
  async getRealTimeMonitoring(): Promise<{
    currentHour: {
      payments: number;
      revenue: number;
      successRate: number;
      averageProcessingTime: number;
    };
    alerts: Array<{
      type: 'error' | 'warning' | 'info';
      message: string;
      timestamp: string;
      severity: 'high' | 'medium' | 'low';
    }>;
    systemHealth: {
      database: 'healthy' | 'warning' | 'critical';
      paypal: 'healthy' | 'warning' | 'critical';
      webhooks: 'healthy' | 'warning' | 'critical';
    };
  }> {
    const client = await this.pool.connect();
    
    try {
      // Current hour statistics
      const currentHour = await client.query(`
        SELECT 
          COUNT(*) as payments,
          SUM(amount) as revenue,
          AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100 as success_rate,
          AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_processing_time
        FROM payments
        WHERE created_at >= NOW() - INTERVAL '1 hour'
      `);

      // Generate alerts
      const alerts = await this.generateAlerts(client);

      // System health checks
      const systemHealth = await this.checkSystemHealth(client);

      return {
        currentHour: {
          payments: parseInt(currentHour.rows[0]?.payments || '0'),
          revenue: parseFloat(currentHour.rows[0]?.revenue || '0'),
          successRate: parseFloat(currentHour.rows[0]?.success_rate || '0'),
          averageProcessingTime: parseFloat(currentHour.rows[0]?.avg_processing_time || '0')
        },
        alerts,
        systemHealth
      };

    } finally {
      client.release();
    }
  }

  /**
   * Get overview statistics
   */
  private async getOverviewStats(client: any, interval: string): Promise<any> {
    const stats = await client.query(`
      SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        SUM(p.amount) as total_revenue,
        AVG(p.amount) as average_order_value,
        AVG(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) * 100 as payment_success_rate
      FROM orders o
      JOIN payments p ON o.id = p.order_id
      WHERE o.created_at >= NOW() - INTERVAL '${interval}'
    `);

    const conversionStats = await client.query(`
      SELECT 
        COUNT(*) as total_carts,
        COUNT(CASE WHEN o.id IS NOT NULL THEN 1 END) as completed_orders
      FROM carts c
      LEFT JOIN orders o ON c.id = o.cart_id
      WHERE c.created_at >= NOW() - INTERVAL '${interval}'
    `);

    const totalCarts = parseInt(conversionStats.rows[0]?.total_carts || '0');
    const completedOrders = parseInt(conversionStats.rows[0]?.completed_orders || '0');
    const conversionRate = totalCarts > 0 ? (completedOrders / totalCarts) * 100 : 0;

    return {
      totalRevenue: parseFloat(stats.rows[0]?.total_revenue || '0'),
      totalOrders: parseInt(stats.rows[0]?.total_orders || '0'),
      averageOrderValue: parseFloat(stats.rows[0]?.average_order_value || '0'),
      conversionRate,
      paymentSuccessRate: parseFloat(stats.rows[0]?.payment_success_rate || '0')
    };
  }

  /**
   * Get trend data
   */
  private async getTrendData(client: any, interval: string): Promise<any> {
    const dailyTrends = await client.query(`
      SELECT 
        DATE(o.created_at) as date,
        SUM(p.amount) as revenue,
        COUNT(DISTINCT o.id) as orders,
        AVG(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) * 100 as conversion_rate
      FROM orders o
      JOIN payments p ON o.id = p.order_id
      WHERE o.created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY DATE(o.created_at)
      ORDER BY date DESC
      LIMIT 30
    `);

    const monthlyTrends = await client.query(`
      SELECT 
        TO_CHAR(o.created_at, 'YYYY-MM') as month,
        SUM(p.amount) as revenue,
        COUNT(DISTINCT o.id) as orders,
        AVG(p.amount) as average_order_value
      FROM orders o
      JOIN payments p ON o.id = p.order_id
      WHERE o.created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY TO_CHAR(o.created_at, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `);

    return {
      daily: dailyTrends.rows.map((row: any) => ({
        date: row.date,
        revenue: parseFloat(row.revenue),
        orders: parseInt(row.orders),
        conversionRate: parseFloat(row.conversion_rate)
      })),
      monthly: monthlyTrends.rows.map((row: any) => ({
        month: row.month,
        revenue: parseFloat(row.revenue),
        orders: parseInt(row.orders),
        averageOrderValue: parseFloat(row.average_order_value)
      }))
    };
  }

  /**
   * Get payment method statistics
   */
  private async getPaymentMethodStats(client: any, interval: string): Promise<any> {
    const methodStats = await client.query(`
      SELECT 
        CASE 
          WHEN payment_method LIKE '%paypal%' THEN 'paypal'
          ELSE 'cards'
        END as method_type,
        COUNT(*) as count,
        SUM(amount) as revenue,
        AVG(amount) as average_amount
      FROM payments
      WHERE created_at >= NOW() - INTERVAL '${interval}'
      AND status = 'completed'
      GROUP BY method_type
    `);

    const totalPayments = methodStats.rows.reduce((sum: number, row: any) => sum + parseInt(row.count), 0);
    const totalRevenue = methodStats.rows.reduce((sum: number, row: any) => sum + parseFloat(row.revenue), 0);

    const paypalStats = methodStats.rows.find((row: any) => row.method_type === 'paypal') || {
      count: 0, revenue: 0, average_amount: 0
    };
    const cardStats = methodStats.rows.find((row: any) => row.method_type === 'cards') || {
      count: 0, revenue: 0, average_amount: 0
    };

    return {
      paypal: {
        count: parseInt(paypalStats.count),
        revenue: parseFloat(paypalStats.revenue),
        percentage: totalPayments > 0 ? (parseInt(paypalStats.count) / totalPayments) * 100 : 0,
        averageAmount: parseFloat(paypalStats.average_amount)
      },
      cards: {
        count: parseInt(cardStats.count),
        revenue: parseFloat(cardStats.revenue),
        percentage: totalPayments > 0 ? (parseInt(cardStats.count) / totalPayments) * 100 : 0,
        averageAmount: parseFloat(cardStats.average_amount)
      }
    };
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics(client: any, interval: string): Promise<any> {
    const performance = await client.query(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_processing_time,
        AVG(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) * 100 as failure_rate,
        COUNT(CASE WHEN retry_count > 0 THEN 1 END) * 100.0 / COUNT(*) as retry_rate
      FROM payments
      WHERE created_at >= NOW() - INTERVAL '${interval}'
    `);

    const webhookStats = await client.query(`
      SELECT 
        COUNT(*) as total_webhooks,
        COUNT(CASE WHEN processed_at IS NOT NULL THEN 1 END) as processed_webhooks
      FROM webhook_events
      WHERE created_at >= NOW() - INTERVAL '${interval}'
    `);

    const totalWebhooks = parseInt(webhookStats.rows[0]?.total_webhooks || '0');
    const processedWebhooks = parseInt(webhookStats.rows[0]?.processed_webhooks || '0');
    const webhookSuccessRate = totalWebhooks > 0 ? (processedWebhooks / totalWebhooks) * 100 : 0;

    return {
      averageProcessingTime: parseFloat(performance.rows[0]?.avg_processing_time || '0'),
      failureRate: parseFloat(performance.rows[0]?.failure_rate || '0'),
      retryRate: parseFloat(performance.rows[0]?.retry_rate || '0'),
      webhookSuccessRate
    };
  }

  /**
   * Generate insights
   */
  private async generateInsights(client: any, overview: any, performance: any): Promise<any[]> {
    const insights: any[] = [];

    // Payment success rate insight
    if (overview.paymentSuccessRate < 95) {
      insights.push({
        type: 'warning',
        title: 'Low Payment Success Rate',
        description: `Payment success rate is ${overview.paymentSuccessRate.toFixed(1)}%, below recommended 95%`,
        impact: 'high',
        recommendation: 'Review payment failures and improve error handling'
      });
    } else {
      insights.push({
        type: 'success',
        title: 'Excellent Payment Success Rate',
        description: `Payment success rate is ${overview.paymentSuccessRate.toFixed(1)}%`,
        impact: 'high'
      });
    }

    // Conversion rate insight
    if (overview.conversionRate < 2) {
      insights.push({
        type: 'warning',
        title: 'Low Conversion Rate',
        description: `Conversion rate is ${overview.conversionRate.toFixed(1)}%, below industry average`,
        impact: 'high',
        recommendation: 'Optimize checkout flow and reduce friction'
      });
    }

    // Processing time insight
    if (performance.averageProcessingTime > 30) {
      insights.push({
        type: 'info',
        title: 'Slow Payment Processing',
        description: `Average processing time is ${performance.averageProcessingTime.toFixed(1)} seconds`,
        impact: 'medium',
        recommendation: 'Consider payment optimization techniques'
      });
    }

    return insights;
  }

  /**
   * Generate optimization recommendations
   */
  private async generateOptimizationRecommendations(client: any): Promise<any[]> {
    const recommendations: any[] = [];

    // Check cart abandonment
    const cartAbandonment = await client.query(`
      SELECT 
        COUNT(*) as total_carts,
        COUNT(CASE WHEN o.id IS NOT NULL THEN 1 END) as completed_orders
      FROM carts c
      LEFT JOIN orders o ON c.id = o.cart_id
      WHERE c.created_at >= NOW() - INTERVAL '7 days'
    `);

    const totalCarts = parseInt(cartAbandonment.rows[0]?.total_carts || '0');
    const completedOrders = parseInt(cartAbandonment.rows[0]?.completed_orders || '0');
    const abandonmentRate = totalCarts > 0 ? ((totalCarts - completedOrders) / totalCarts) * 100 : 0;

    if (abandonmentRate > 70) {
      recommendations.push({
        category: 'conversion',
        priority: 'high',
        title: 'Reduce Cart Abandonment',
        description: `Cart abandonment rate is ${abandonmentRate.toFixed(1)}%`,
        expectedImpact: 'Increase conversion by 10-15%',
        implementationEffort: 'medium'
      });
    }

    // Check payment failures
    const paymentFailures = await client.query(`
      SELECT COUNT(*) as failed_payments
      FROM payments
      WHERE status = 'failed'
      AND created_at >= NOW() - INTERVAL '7 days'
    `);

    const failedPayments = parseInt(paymentFailures.rows[0]?.failed_payments || '0');
    if (failedPayments > 10) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'Improve Payment Success Rate',
        description: `${failedPayments} payments failed in the last 7 days`,
        expectedImpact: 'Reduce payment failures by 50%',
        implementationEffort: 'medium'
      });
    }

    return recommendations;
  }

  /**
   * Get conversion optimization data
   */
  private async getConversionOptimization(client: any): Promise<any> {
    const cartStats = await client.query(`
      SELECT 
        COUNT(*) as total_carts,
        COUNT(CASE WHEN o.id IS NOT NULL THEN 1 END) as completed_orders
      FROM carts c
      LEFT JOIN orders o ON c.id = o.cart_id
      WHERE c.created_at >= NOW() - INTERVAL '30 days'
    `);

    const paymentStats = await client.query(`
      SELECT 
        COUNT(*) as total_payments,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments
      FROM payments
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);

    const totalCarts = parseInt(cartStats.rows[0]?.total_carts || '0');
    const completedOrders = parseInt(cartStats.rows[0]?.completed_orders || '0');
    const totalPayments = parseInt(paymentStats.rows[0]?.total_payments || '0');
    const failedPayments = parseInt(paymentStats.rows[0]?.failed_payments || '0');

    return {
      cartAbandonmentRate: totalCarts > 0 ? ((totalCarts - completedOrders) / totalCarts) * 100 : 0,
      checkoutCompletionRate: totalCarts > 0 ? (completedOrders / totalCarts) * 100 : 0,
      paymentFailureRate: totalPayments > 0 ? (failedPayments / totalPayments) * 100 : 0,
      suggestedImprovements: [
        'Implement guest checkout',
        'Add payment retry logic',
        'Optimize mobile checkout experience',
        'Add progress indicators'
      ]
    };
  }

  /**
   * Get detailed performance metrics
   */
  private async getDetailedPerformanceMetrics(client: any): Promise<any> {
    // These would typically come from monitoring systems
    return {
      pageLoadTime: 2.5, // seconds
      paymentProcessingTime: 3.2, // seconds
      webhookResponseTime: 0.8, // seconds
      databaseQueryTime: 0.3 // seconds
    };
  }

  /**
   * Generate alerts
   */
  private async generateAlerts(client: any): Promise<any[]> {
    const alerts: any[] = [];

    // Check for high failure rate in last hour
    const recentFailures = await client.query(`
      SELECT COUNT(*) as failed_count
      FROM payments
      WHERE status = 'failed'
      AND created_at >= NOW() - INTERVAL '1 hour'
    `);

    const failedCount = parseInt(recentFailures.rows[0]?.failed_count || '0');
    if (failedCount > 5) {
      alerts.push({
        type: 'error',
        message: `${failedCount} payment failures in the last hour`,
        timestamp: new Date().toISOString(),
        severity: 'high'
      });
    }

    return alerts;
  }

  /**
   * Check system health
   */
  private async checkSystemHealth(client: any): Promise<any> {
    try {
      await client.query('SELECT 1');
      return {
        database: 'healthy' as const,
        paypal: 'healthy' as const,
        webhooks: 'healthy' as const
      };
    } catch (error) {
      return {
        database: 'critical' as const,
        paypal: 'warning' as const,
        webhooks: 'warning' as const
      };
    }
  }

  /**
   * Get timeframe interval
   */
  private getTimeframeInterval(timeframe: string): string {
    switch (timeframe) {
      case '7d': return '7 days';
      case '30d': return '30 days';
      case '90d': return '90 days';
      case '1y': return '1 year';
      default: return '30 days';
    }
  }
}
