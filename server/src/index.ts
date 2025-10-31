import express from 'express';
import cors from 'cors';
import session from 'express-session';
import path from 'path';
import authRouter from './routes/auth';
import faqsRouter from './routes/faqs';
import productDescriptionRouter from './routes/productDescriptions';
import { createProductRoutes } from './routes/products';
import { createAdminProductRoutes } from './routes/admin/products';
import { createAdminOrderRoutes } from './routes/admin/orders';
import { createAdminDashboardRoutes } from './routes/admin/dashboard';
import { createAdminRBACRoutes } from './routes/admin/rbac';
import { createAdminCouponRoutes } from './routes/admin/coupons';
import { createEmailTemplateRoutes } from './routes/admin/email-templates';
import { createVariationStockRoutes } from './routes/admin/variationStock';
import { createBundleRoutes } from './routes/admin/bundles';
import { createCartRoutes } from './routes/cart';
import { createOrderRoutes } from './routes/orders';
import { createPaymentRoutes } from './routes/payments';
import { createWishlistRoutes } from './routes/wishlist';
import { createWebhookRoutes } from './routes/webhooks';
import { createCleanupRoutes } from './routes/admin/cleanup';
import { createCronRoutes } from './routes/admin/cron';
import { createWebhookTestRoutes } from './routes/admin/webhookTest';
import { createProductionRoutes } from './routes/admin/production';
import { createTestingRoutes } from './routes/admin/testing';
import { createPhase4Routes } from './routes/admin/phase4';
import { createLogsRoutes } from './routes/admin/logs';
import { createWishlistNotificationRoutes } from './routes/admin/wishlist-notifications';
import { createShipStationRoutes } from './routes/shipstation';
import { createPageProductRoutes, createPublicPageProductRoutes } from './routes/pageProducts';
import { pool } from './config/database';
import { createErrorHandler } from './middleware/errorHandler';
import { regionDetection } from './middleware/regionDetection';
import { CleanupService } from './services/CleanupService';
import { CronService } from './services/CronService';
import { EmailService } from './services/EmailService';
import { LoggerService } from './services/LoggerService';
import { WishlistNotificationService } from './services/WishlistNotificationService';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Trust proxy for accurate IP addresses (Docker/Heroku/proxy)
app.set('trust proxy', 1);

// Session store - using PostgreSQL for all environments
const pgSession = require('connect-pg-simple')(session);

// Middleware - Temporary permissive CORS for debugging
const corsOptions = {
  origin: true, // Allow all origins temporarily
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Region']
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Region detection middleware - detects US vs EU from hostname/headers
app.use(regionDetection);

// Session middleware - PostgreSQL for all environments
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/simfab_dev';
const sessionStore = new pgSession({
  conString: connectionString,
  tableName: 'user_sessions'
});

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: true, // Changed to true for anonymous cart sessions
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for cart persistence
    sameSite: 'lax' // Allow cookies in cross-site requests
  }
}));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// Serve static files from public directory (for email logos, etc.)
app.use('/public', express.static(path.join(__dirname, '../../public')));

// Initialize cron service before setting up routes
const cronService = new CronService(pool);
cronService.initialize();

// Initialize wishlist notification service
const wishlistNotificationService = new WishlistNotificationService(pool);

// Wishlist sale checker - runs every hour
cronService.addJob(
  'wishlist-sale-check',
  {
    schedule: '0 * * * *', // Every hour at minute 0
    enabled: process.env.WISHLIST_SALE_CHECK_ENABLED !== 'false', // Enable by default
    description: 'Check wishlist items for sales and send notifications',
    timezone: process.env.TZ || 'America/New_York',
  },
  async () => {
    try {
      console.log('🔄 Running wishlist sale check...');
      const result = await wishlistNotificationService.checkSales();
      console.log(`✅ Wishlist sale check complete: ${result.notified} notifications sent`);
      
      // Log metrics
      if (result.errors > 0) {
        console.warn(`⚠️ ${result.errors} errors during wishlist sale check`);
      }
    } catch (error) {
      console.error('❌ Error in wishlist sale check job:', error);
    }
  }
);

// Wishlist stock checker - runs every 30 minutes
cronService.addJob(
  'wishlist-stock-check',
  {
    schedule: '*/30 * * * *', // Every 30 minutes
    enabled: process.env.WISHLIST_STOCK_CHECK_ENABLED !== 'false', // Enable by default
    description: 'Check wishlist items for stock availability and send notifications',
    timezone: process.env.TZ || 'America/New_York',
  },
  async () => {
    try {
      console.log('🔄 Running wishlist stock check...');
      const result = await wishlistNotificationService.checkStock();
      console.log(`✅ Wishlist stock check complete: ${result.notified} notifications sent`);
      
      // Log metrics
      if (result.errors > 0) {
        console.warn(`⚠️ ${result.errors} errors during wishlist stock check`);
      }
    } catch (error) {
      console.error('❌ Error in wishlist stock check job:', error);
    }
  }
);

console.log('✅ Wishlist notification cron jobs registered');

// Initialize email service
const emailService = new EmailService(pool);
emailService.initialize().catch(err => {
  console.error('Failed to initialize email service:', err);
});

// Initialize logger service
const loggerService = new LoggerService(pool);

// Routes
app.use('/api/auth', authRouter);
app.use('/api', faqsRouter);
app.use('/api', productDescriptionRouter);
app.use('/api/products', createProductRoutes(pool));
app.use('/api/cart', createCartRoutes(pool));
app.use('/api/wishlist', createWishlistRoutes(pool));
app.use('/api/orders', createOrderRoutes(pool));
app.use('/api/payments', createPaymentRoutes(pool));
app.use('/api/webhooks', createWebhookRoutes(pool));
app.use('/api/admin/products', createAdminProductRoutes(pool));
app.use('/api/admin/variation-stock', createVariationStockRoutes(pool));
app.use('/api/admin/bundles', createBundleRoutes(pool));
app.use('/api/admin/orders', createAdminOrderRoutes(pool));
app.use('/api/admin/dashboard', createAdminDashboardRoutes(pool));
app.use('/api/admin/rbac', createAdminRBACRoutes(pool));
app.use('/api/admin/coupons', createAdminCouponRoutes(pool));
app.use('/api/admin', createEmailTemplateRoutes(pool));
app.use('/api/admin/cleanup', createCleanupRoutes(pool));
app.use('/api/admin/cron', createCronRoutes(pool, cronService));
app.use('/api/admin/webhook-test', createWebhookTestRoutes(pool));
app.use('/api/admin/production', createProductionRoutes(pool));
app.use('/api/admin/testing', createTestingRoutes(pool));
app.use('/api/admin/phase4', createPhase4Routes(pool));
app.use('/api/admin/logs', createLogsRoutes(pool));
app.use('/api/admin/wishlist-notifications', createWishlistNotificationRoutes(pool));
app.use('/api/admin/page-products', createPageProductRoutes(pool));
app.use('/api/page-products', createPublicPageProductRoutes(pool));
app.use('/api/shipstation', createShipStationRoutes(pool));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    origin: req.headers.origin,
    referer: req.headers.referer,
    userAgent: req.headers['user-agent']
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SimFab Products API Server',
    version: '2.0.0 - FILTERING & IMAGES FIXED',
    endpoints: {
      health: '/health',
      products: '/api/products',
      upload: '/api/products/upload',
      auth: {
        register: '/api/auth/register',
        login: '/api/auth/login',
        logout: '/api/auth/logout',
        profile: '/api/auth/profile',
        passwordReset: '/api/auth/password-reset/request',
        passwordResetConfirm: '/api/auth/password-reset/reset',
        newsletterSubscribe: '/api/auth/newsletter/subscribe',
        newsletterUnsubscribe: '/api/auth/newsletter/unsubscribe'
      },
      payments: {
        create: '/api/payments/create',
        execute: '/api/payments/execute',
        status: '/api/payments/:paymentId'
      },
      shipstation: {
        orders: '/api/shipstation/orders',
        shipmentUpdate: '/api/shipstation/shipmentupdate',
        test: '/api/shipstation/test',
        health: '/api/shipstation/health'
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      path: req.originalUrl
    }
  });
});

// Error handling middleware (must be last)
// Pass LoggerService instance to enable database logging of server errors
app.use(createErrorHandler(loggerService));

// Start server
// Always bind to 0.0.0.0 in Docker to be accessible from outside the container
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🔧 SERVER VERSION 2.0 - FILTERING & IMAGES FIXED');
  console.log('='.repeat(60));
  console.log(`🚀 Server is running on ${HOST}:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`\n📦 Public API:`);
  console.log(`   Products: http://localhost:${PORT}/api/products`);
  console.log(`   Auth: http://localhost:${PORT}/api/auth`);
  console.log(`   Payments: http://localhost:${PORT}/api/payments`);
  console.log(`\n🔐 Admin API:`);
  console.log(`   Products: http://localhost:${PORT}/api/admin/products`);
  console.log(`\n📁 Static files: http://localhost:${PORT}/uploads`);
  console.log('='.repeat(60) + '\n');
});

export default app;
