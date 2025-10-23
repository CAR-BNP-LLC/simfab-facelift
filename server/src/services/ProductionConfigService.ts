import { Pool } from 'pg';

export interface ProductionConfig {
  paypal: {
    clientId: string;
    clientSecret: string;
    webhookId: string;
    mode: 'sandbox' | 'live';
  };
  security: {
    webhookSignatureVerification: boolean;
    rateLimiting: boolean;
    inputValidation: boolean;
    logging: boolean;
  };
  monitoring: {
    paymentSuccessRate: boolean;
    webhookProcessingTime: boolean;
    errorLogging: boolean;
    performanceMetrics: boolean;
  };
  cleanup: {
    expiredOrdersInterval: number; // minutes
    expiredReservationsInterval: number; // minutes
    webhookRetentionDays: number;
  };
}

export class ProductionConfigService {
  constructor(private pool: Pool) {}

  /**
   * Get current production configuration
   */
  async getProductionConfig(): Promise<ProductionConfig> {
    return {
      paypal: {
        clientId: process.env.PAYPAL_CLIENT_ID_PROD || process.env.PAYPAL_CLIENT_ID || '',
        clientSecret: process.env.PAYPAL_CLIENT_SECRET_PROD || process.env.PAYPAL_CLIENT_SECRET || '',
        webhookId: process.env.PAYPAL_WEBHOOK_ID_PROD || process.env.PAYPAL_WEBHOOK_ID || '',
        mode: (process.env.PAYPAL_MODE_PROD || process.env.PAYPAL_MODE || 'sandbox') as 'sandbox' | 'live'
      },
      security: {
        webhookSignatureVerification: process.env.WEBHOOK_SIGNATURE_VERIFICATION !== 'false',
        rateLimiting: process.env.RATE_LIMITING !== 'false',
        inputValidation: process.env.INPUT_VALIDATION !== 'false',
        logging: process.env.LOGGING !== 'false'
      },
      monitoring: {
        paymentSuccessRate: process.env.MONITOR_PAYMENT_SUCCESS !== 'false',
        webhookProcessingTime: process.env.MONITOR_WEBHOOK_TIME !== 'false',
        errorLogging: process.env.ERROR_LOGGING !== 'false',
        performanceMetrics: process.env.PERFORMANCE_METRICS !== 'false'
      },
      cleanup: {
        expiredOrdersInterval: parseInt(process.env.CLEANUP_ORDERS_INTERVAL || '15'),
        expiredReservationsInterval: parseInt(process.env.CLEANUP_RESERVATIONS_INTERVAL || '15'),
        webhookRetentionDays: parseInt(process.env.WEBHOOK_RETENTION_DAYS || '30')
      }
    };
  }

  /**
   * Validate production configuration
   */
  async validateProductionConfig(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const config = await this.getProductionConfig();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate PayPal configuration
    if (!config.paypal.clientId) {
      errors.push('PayPal Client ID is required');
    }
    if (!config.paypal.clientSecret) {
      errors.push('PayPal Client Secret is required');
    }
    if (!config.paypal.webhookId) {
      errors.push('PayPal Webhook ID is required');
    }

    // Check if using sandbox in production
    if (config.paypal.mode === 'sandbox' && process.env.NODE_ENV === 'production') {
      warnings.push('Using PayPal sandbox mode in production environment');
    }

    // Validate security settings
    if (!config.security.webhookSignatureVerification) {
      warnings.push('Webhook signature verification is disabled');
    }
    if (!config.security.rateLimiting) {
      warnings.push('Rate limiting is disabled');
    }

    // Validate cleanup intervals
    if (config.cleanup.expiredOrdersInterval < 5) {
      warnings.push('Order cleanup interval is very short (< 5 minutes)');
    }
    if (config.cleanup.webhookRetentionDays < 7) {
      warnings.push('Webhook retention period is very short (< 7 days)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warning';
      message: string;
      timestamp: string;
    }>;
  }> {
    const checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warning';
      message: string;
      timestamp: string;
    }> = [];

    const timestamp = new Date().toISOString();

    // Database connectivity check
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      checks.push({
        name: 'Database Connection',
        status: 'pass',
        message: 'Database is accessible',
        timestamp
      });
    } catch (error) {
      checks.push({
        name: 'Database Connection',
        status: 'fail',
        message: `Database connection failed: ${error}`,
        timestamp
      });
    }

    // PayPal configuration check
    const config = await this.getProductionConfig();
    if (config.paypal.clientId && config.paypal.clientSecret) {
      checks.push({
        name: 'PayPal Configuration',
        status: 'pass',
        message: 'PayPal credentials are configured',
        timestamp
      });
    } else {
      checks.push({
        name: 'PayPal Configuration',
        status: 'fail',
        message: 'PayPal credentials are missing',
        timestamp
      });
    }

    // Webhook table check
    try {
      const client = await this.pool.connect();
      const result = await client.query(
        'SELECT COUNT(*) as count FROM webhook_events WHERE processed_at > NOW() - INTERVAL \'1 hour\''
      );
      client.release();
      
      const recentWebhooks = parseInt(result.rows[0].count);
      if (recentWebhooks > 0) {
        checks.push({
          name: 'Webhook Processing',
          status: 'pass',
          message: `${recentWebhooks} webhooks processed in the last hour`,
          timestamp
        });
      } else {
        checks.push({
          name: 'Webhook Processing',
          status: 'warning',
          message: 'No webhooks processed in the last hour',
          timestamp
        });
      }
    } catch (error) {
      checks.push({
        name: 'Webhook Processing',
        status: 'fail',
        message: `Webhook table check failed: ${error}`,
        timestamp
      });
    }

    // Stock reservations check
    try {
      const client = await this.pool.connect();
      const result = await client.query(
        'SELECT COUNT(*) as count FROM stock_reservations WHERE expires_at > NOW()'
      );
      client.release();
      
      const activeReservations = parseInt(result.rows[0].count);
      checks.push({
        name: 'Stock Reservations',
        status: 'pass',
        message: `${activeReservations} active stock reservations`,
        timestamp
      });
    } catch (error) {
      checks.push({
        name: 'Stock Reservations',
        status: 'fail',
        message: `Stock reservations check failed: ${error}`,
        timestamp
      });
    }

    // Determine overall status
    const failedChecks = checks.filter(c => c.status === 'fail').length;
    const warningChecks = checks.filter(c => c.status === 'warning').length;

    let status: 'healthy' | 'warning' | 'critical';
    if (failedChecks > 0) {
      status = 'critical';
    } else if (warningChecks > 0) {
      status = 'warning';
    } else {
      status = 'healthy';
    }

    return { status, checks };
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    payments: {
      totalToday: number;
      successRate: number;
      averageProcessingTime: number;
    };
    webhooks: {
      totalToday: number;
      averageProcessingTime: number;
      errorRate: number;
    };
    orders: {
      totalToday: number;
      conversionRate: number;
      averageOrderValue: number;
    };
  }> {
    const client = await this.pool.connect();
    
    try {
      // Payment metrics
      const paymentStats = await client.query(`
        SELECT 
          COUNT(*) as total,
          AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100 as success_rate,
          AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_processing_time
        FROM payments 
        WHERE DATE(created_at) = CURRENT_DATE
      `);

      // Webhook metrics
      const webhookStats = await client.query(`
        SELECT 
          COUNT(*) as total,
          AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_time,
          AVG(CASE WHEN event_type LIKE '%DENIED%' OR event_type LIKE '%FAILED%' THEN 1 ELSE 0 END) * 100 as error_rate
        FROM webhook_events 
        WHERE DATE(processed_at) = CURRENT_DATE
      `);

      // Order metrics
      const orderStats = await client.query(`
        SELECT 
          COUNT(*) as total,
          AVG(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) * 100 as conversion_rate,
          AVG(total_amount) as avg_order_value
        FROM orders 
        WHERE DATE(created_at) = CURRENT_DATE
      `);

      return {
        payments: {
          totalToday: parseInt(paymentStats.rows[0]?.total || '0'),
          successRate: parseFloat(paymentStats.rows[0]?.success_rate || '0'),
          averageProcessingTime: parseFloat(paymentStats.rows[0]?.avg_processing_time || '0')
        },
        webhooks: {
          totalToday: parseInt(webhookStats.rows[0]?.total || '0'),
          averageProcessingTime: parseFloat(webhookStats.rows[0]?.avg_processing_time || '0'),
          errorRate: parseFloat(webhookStats.rows[0]?.error_rate || '0')
        },
        orders: {
          totalToday: parseInt(orderStats.rows[0]?.total || '0'),
          conversionRate: parseFloat(orderStats.rows[0]?.conversion_rate || '0'),
          averageOrderValue: parseFloat(orderStats.rows[0]?.avg_order_value || '0')
        }
      };
    } finally {
      client.release();
    }
  }
}
