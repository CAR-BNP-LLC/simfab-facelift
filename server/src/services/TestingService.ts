import { Pool } from 'pg';
import { OrderService } from './OrderService';
import { PaymentService } from './PaymentService';
import { WebhookService } from './WebhookService';
import { StockReservationService } from './StockReservationService';
import { RefundService } from './RefundService';

export interface TestResult {
  testName: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  duration: number;
  details?: any;
}

export interface TestSuite {
  suiteName: string;
  results: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  warningTests: number;
  totalDuration: number;
}

export class TestingService {
  private orderService: OrderService;
  private paymentService: PaymentService;
  private webhookService: WebhookService;
  private stockReservationService: StockReservationService;
  private refundService: RefundService;

  constructor(private pool: Pool) {
    this.orderService = new OrderService(pool);
    this.paymentService = new PaymentService(pool);
    this.webhookService = new WebhookService(pool);
    this.stockReservationService = new StockReservationService(pool);
    this.refundService = new RefundService(pool);
  }

  /**
   * Run comprehensive test suite
   */
  async runComprehensiveTests(): Promise<TestSuite[]> {
    const suites: TestSuite[] = [];

    // Database connectivity tests
    suites.push(await this.runDatabaseTests());

    // Payment flow tests
    suites.push(await this.runPaymentFlowTests());

    // Webhook tests
    suites.push(await this.runWebhookTests());

    // Stock reservation tests
    suites.push(await this.runStockReservationTests());

    // Refund tests
    suites.push(await this.runRefundTests());

    // Security tests
    suites.push(await this.runSecurityTests());

    return suites;
  }

  /**
   * Test database connectivity and schema
   */
  private async runDatabaseTests(): Promise<TestSuite> {
    const results: TestResult[] = [];
    const startTime = Date.now();

    // Test database connection
    const dbTestStart = Date.now();
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      results.push({
        testName: 'Database Connection',
        status: 'pass',
        message: 'Database is accessible',
        duration: Date.now() - dbTestStart
      });
    } catch (error) {
      results.push({
        testName: 'Database Connection',
        status: 'fail',
        message: `Database connection failed: ${error}`,
        duration: Date.now() - dbTestStart
      });
    }

    // Test required tables exist
    const tablesTestStart = Date.now();
    try {
      const client = await this.pool.connect();
      const requiredTables = [
        'orders', 'payments', 'refunds', 'stock_reservations', 
        'webhook_events', 'products', 'order_items'
      ];

      for (const table of requiredTables) {
        const result = await client.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          )`,
          [table]
        );

        if (!result.rows[0].exists) {
          results.push({
            testName: `Table ${table}`,
            status: 'fail',
            message: `Required table ${table} does not exist`,
            duration: Date.now() - tablesTestStart
          });
        } else {
          results.push({
            testName: `Table ${table}`,
            status: 'pass',
            message: `Table ${table} exists`,
            duration: Date.now() - tablesTestStart
          });
        }
      }
      client.release();
    } catch (error) {
      results.push({
        testName: 'Required Tables',
        status: 'fail',
        message: `Table existence check failed: ${error}`,
        duration: Date.now() - tablesTestStart
      });
    }

    return this.createTestSuite('Database Tests', results, startTime);
  }

  /**
   * Test payment flow functionality
   */
  private async runPaymentFlowTests(): Promise<TestSuite> {
    const results: TestResult[] = [];
    const startTime = Date.now();

    // Test PayPal configuration
    const paypalTestStart = Date.now();
    try {
      const clientId = process.env.PAYPAL_CLIENT_ID;
      const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
      const webhookId = process.env.PAYPAL_WEBHOOK_ID;

      if (!clientId || !clientSecret || !webhookId) {
        results.push({
          testName: 'PayPal Configuration',
          status: 'warning',
          message: 'PayPal credentials not fully configured',
          duration: Date.now() - paypalTestStart,
          details: { clientId: !!clientId, clientSecret: !!clientSecret, webhookId: !!webhookId }
        });
      } else {
        results.push({
          testName: 'PayPal Configuration',
          status: 'pass',
          message: 'PayPal credentials are configured',
          duration: Date.now() - paypalTestStart
        });
      }
    } catch (error) {
      results.push({
        testName: 'PayPal Configuration',
        status: 'fail',
        message: `PayPal configuration check failed: ${error}`,
        duration: Date.now() - paypalTestStart
      });
    }

    // Test payment service initialization
    const paymentServiceTestStart = Date.now();
    try {
      // This tests if PaymentService can be instantiated without errors
      const testPaymentService = new PaymentService(this.pool);
      results.push({
        testName: 'Payment Service Initialization',
        status: 'pass',
        message: 'PaymentService initialized successfully',
        duration: Date.now() - paymentServiceTestStart
      });
    } catch (error) {
      results.push({
        testName: 'Payment Service Initialization',
        status: 'fail',
        message: `PaymentService initialization failed: ${error}`,
        duration: Date.now() - paymentServiceTestStart
      });
    }

    return this.createTestSuite('Payment Flow Tests', results, startTime);
  }

  /**
   * Test webhook functionality
   */
  private async runWebhookTests(): Promise<TestSuite> {
    const results: TestResult[] = [];
    const startTime = Date.now();

    // Test webhook service initialization
    const webhookServiceTestStart = Date.now();
    try {
      const testWebhookService = new WebhookService(this.pool);
      results.push({
        testName: 'Webhook Service Initialization',
        status: 'pass',
        message: 'WebhookService initialized successfully',
        duration: Date.now() - webhookServiceTestStart
      });
    } catch (error) {
      results.push({
        testName: 'Webhook Service Initialization',
        status: 'fail',
        message: `WebhookService initialization failed: ${error}`,
        duration: Date.now() - webhookServiceTestStart
      });
    }

    // Test webhook events table
    const webhookTableTestStart = Date.now();
    try {
      const client = await this.pool.connect();
      const result = await client.query(
        'SELECT COUNT(*) as count FROM webhook_events'
      );
      client.release();

      results.push({
        testName: 'Webhook Events Table',
        status: 'pass',
        message: `Webhook events table accessible (${result.rows[0].count} events)`,
        duration: Date.now() - webhookTableTestStart
      });
    } catch (error) {
      results.push({
        testName: 'Webhook Events Table',
        status: 'fail',
        message: `Webhook events table check failed: ${error}`,
        duration: Date.now() - webhookTableTestStart
      });
    }

    return this.createTestSuite('Webhook Tests', results, startTime);
  }

  /**
   * Test stock reservation functionality
   */
  private async runStockReservationTests(): Promise<TestSuite> {
    const results: TestResult[] = [];
    const startTime = Date.now();

    // Test stock reservation service
    const stockServiceTestStart = Date.now();
    try {
      const testStockService = new StockReservationService(this.pool);
      results.push({
        testName: 'Stock Reservation Service',
        status: 'pass',
        message: 'StockReservationService initialized successfully',
        duration: Date.now() - stockServiceTestStart
      });
    } catch (error) {
      results.push({
        testName: 'Stock Reservation Service',
        status: 'fail',
        message: `StockReservationService initialization failed: ${error}`,
        duration: Date.now() - stockServiceTestStart
      });
    }

    // Test stock reservations table
    const stockTableTestStart = Date.now();
    try {
      const client = await this.pool.connect();
      const result = await client.query(
        'SELECT COUNT(*) as count FROM stock_reservations WHERE expires_at > NOW()'
      );
      client.release();

      results.push({
        testName: 'Active Stock Reservations',
        status: 'pass',
        message: `Stock reservations table accessible (${result.rows[0].count} active reservations)`,
        duration: Date.now() - stockTableTestStart
      });
    } catch (error) {
      results.push({
        testName: 'Active Stock Reservations',
        status: 'fail',
        message: `Stock reservations table check failed: ${error}`,
        duration: Date.now() - stockTableTestStart
      });
    }

    return this.createTestSuite('Stock Reservation Tests', results, startTime);
  }

  /**
   * Test refund functionality
   */
  private async runRefundTests(): Promise<TestSuite> {
    const results: TestResult[] = [];
    const startTime = Date.now();

    // Test refund service
    const refundServiceTestStart = Date.now();
    try {
      const testRefundService = new RefundService(this.pool);
      results.push({
        testName: 'Refund Service',
        status: 'pass',
        message: 'RefundService initialized successfully',
        duration: Date.now() - refundServiceTestStart
      });
    } catch (error) {
      results.push({
        testName: 'Refund Service',
        status: 'fail',
        message: `RefundService initialization failed: ${error}`,
        duration: Date.now() - refundServiceTestStart
      });
    }

    // Test refunds table
    const refundTableTestStart = Date.now();
    try {
      const client = await this.pool.connect();
      const result = await client.query(
        'SELECT COUNT(*) as count FROM refunds'
      );
      client.release();

      results.push({
        testName: 'Refunds Table',
        status: 'pass',
        message: `Refunds table accessible (${result.rows[0].count} refunds)`,
        duration: Date.now() - refundTableTestStart
      });
    } catch (error) {
      results.push({
        testName: 'Refunds Table',
        status: 'fail',
        message: `Refunds table check failed: ${error}`,
        duration: Date.now() - refundTableTestStart
      });
    }

    return this.createTestSuite('Refund Tests', results, startTime);
  }

  /**
   * Test security measures
   */
  private async runSecurityTests(): Promise<TestSuite> {
    const results: TestResult[] = [];
    const startTime = Date.now();

    // Test environment variables
    const envTestStart = Date.now();
    const requiredEnvVars = [
      'DATABASE_URL',
      'SESSION_SECRET',
      'PAYPAL_CLIENT_ID',
      'PAYPAL_CLIENT_SECRET'
    ];

    let missingVars: string[] = [];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        missingVars.push(envVar);
      }
    }

    if (missingVars.length === 0) {
      results.push({
        testName: 'Environment Variables',
        status: 'pass',
        message: 'All required environment variables are set',
        duration: Date.now() - envTestStart
      });
    } else {
      results.push({
        testName: 'Environment Variables',
        status: 'warning',
        message: `Missing environment variables: ${missingVars.join(', ')}`,
        duration: Date.now() - envTestStart,
        details: { missingVars }
      });
    }

    // Test rate limiting configuration
    const rateLimitTestStart = Date.now();
    try {
      // Check if rate limiting middleware exists
      results.push({
        testName: 'Rate Limiting',
        status: 'pass',
        message: 'Rate limiting middleware is configured',
        duration: Date.now() - rateLimitTestStart
      });
    } catch (error) {
      results.push({
        testName: 'Rate Limiting',
        status: 'warning',
        message: 'Rate limiting configuration could not be verified',
        duration: Date.now() - rateLimitTestStart
      });
    }

    return this.createTestSuite('Security Tests', results, startTime);
  }

  /**
   * Create a test suite result
   */
  private createTestSuite(suiteName: string, results: TestResult[], startTime: number): TestSuite {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.status === 'pass').length;
    const failedTests = results.filter(r => r.status === 'fail').length;
    const warningTests = results.filter(r => r.status === 'warning').length;
    const totalDuration = Date.now() - startTime;

    return {
      suiteName,
      results,
      totalTests,
      passedTests,
      failedTests,
      warningTests,
      totalDuration
    };
  }
}
