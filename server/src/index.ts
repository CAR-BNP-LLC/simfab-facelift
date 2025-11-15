import express from 'express';
import cors from 'cors';
import session from 'express-session';
import path from 'path';
import { Server } from 'http';
import authRouter from './routes/auth';
import faqsRouter from './routes/faqs';
import productDescriptionRouter from './routes/productDescriptions';
import { createProductRoutes } from './routes/products';
import { createAdminProductRoutes } from './routes/admin/products';
import { createAdminOrderRoutes } from './routes/admin/orders';
import { createAdminDashboardRoutes } from './routes/admin/dashboard';
import { createAdminRBACRoutes } from './routes/admin/rbac';
import { createAdminCouponRoutes } from './routes/admin/coupons';
import { createAdminMarketingCampaignRoutes } from './routes/admin/marketing-campaigns';
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
import { createShippingRoutes } from './routes/shipping';
import { createAdminShippingQuoteRoutes } from './routes/admin/shippingQuotes';
import { createPageProductRoutes, createPublicPageProductRoutes } from './routes/pageProducts';
import { createAdminAssemblyManualRoutes } from './routes/admin/assemblyManuals';
import { createAssemblyManualRoutes } from './routes/assemblyManuals';
import { createAdminSettingsRoutes } from './routes/admin/settings';
import { createSettingsRoutes } from './routes/settings';
import { createSiteNoticeRoutes } from './routes/site-notices';
import { createAdminSiteNoticeRoutes } from './routes/admin/site-notices';
import { createAnalyticsRoutes } from './routes/analytics';
import { createSharedConfigRoutes } from './routes/sharedConfigs';
import { pool, getSSLConfig } from './config/database';
import { createErrorHandler } from './middleware/errorHandler';
import { regionDetection } from './middleware/regionDetection';
import { CleanupService } from './services/CleanupService';
import { CronService } from './services/CronService';
import { EmailService } from './services/EmailService';
import { LoggerService } from './services/LoggerService';
import { WishlistNotificationService } from './services/WishlistNotificationService';
import { CartReminderService } from './services/CartReminderService';

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
const sslConfig = getSSLConfig(connectionString);

const sessionStore = new pgSession({
  conString: connectionString,
  tableName: 'user_sessions',
  // connect-pg-simple accepts ssl option directly
  ...(sslConfig ? { ssl: sslConfig } : {})
});

// Cookie configuration based on NODE_ENV:
// Production: API and frontend are on different servers/domains,
// so we MUST use SameSite=None with Secure=true for cross-site cookies
// Development: Use SameSite=Lax (same-site cookies)
const isProduction = process.env.NODE_ENV === 'production';
const cookieSameSite: 'none' | 'lax' | 'strict' = isProduction ? 'none' : 'lax';
const cookieSecure = isProduction; // Secure=true in production (HTTPS required), false in dev

// For cross-origin cookies, don't set domain (let browser handle it)
// Setting domain explicitly can cause issues with cross-origin cookies
const cookieDomain = undefined; // undefined = browser sets domain automatically

console.log('🍪 Cookie Configuration:', {
  isProduction,
  sameSite: cookieSameSite,
  secure: cookieSecure,
  domain: cookieDomain || '(not set - browser default)',
  reason: isProduction 
    ? 'Production: API and frontend on different servers (cross-site required)' 
    : 'Development: Same-site cookies',
  NODE_ENV: process.env.NODE_ENV || '(not set)',
  all_node_env_keys: Object.keys(process.env).filter(k => k.includes('NODE'))
});

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false, // Changed to false - only save sessions that have data (userId)
  name: 'connect.sid', // Explicit cookie name
  cookie: {
    secure: cookieSecure, // true for cross-site cookies or production (HTTPS required)
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for cart persistence
    sameSite: cookieSameSite, // 'none' for cross-site, 'lax' for same-site dev
    domain: cookieDomain, // undefined = browser sets domain automatically (better for cross-origin)
    path: '/' // Explicit path
  }
}));

// Serve static files from uploads directory with proper headers for PDFs
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="manual.pdf"');
      // Allow PDFs to be embedded in iframes (remove X-Frame-Options if set elsewhere)
      res.removeHeader('X-Frame-Options');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  }
}));
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

// Initialize email service - MUST initialize before routes
const emailService = new EmailService(pool);
emailService.initialize()
  .then(() => {
    console.log('✅ Email service initialized successfully');
  })
  .catch(err => {
    console.error('❌ Failed to initialize email service:', err);
  });

// Initialize cart reminder service
const cartReminderService = new CartReminderService(pool, emailService);

// Cart reminder checker - runs every hour
cronService.addJob(
  'cart-reminder-check',
  {
    schedule: '0 * * * *', // Every hour at minute 0
    enabled: process.env.CART_REMINDER_ENABLED !== 'false', // Enable by default
    description: 'Check for abandoned carts and send reminder emails',
    timezone: process.env.TZ || 'America/New_York',
  },
  async () => {
    try {
      console.log('🔄 Running cart reminder check...');
      const result = await cartReminderService.checkAndSendReminders();
      console.log(`✅ Cart reminder check complete:`);
      console.log(`   - 1-day reminders: ${result.day1.sent} sent, ${result.day1.errors} errors`);
      console.log(`   - 7-day reminders: ${result.day7.sent} sent, ${result.day7.errors} errors`);
      
      // Log metrics
      if (result.day1.errors > 0 || result.day7.errors > 0) {
        console.warn(`⚠️ ${result.day1.errors + result.day7.errors} errors during cart reminder check`);
      }
    } catch (error) {
      console.error('❌ Error in cart reminder check job:', error);
    }
  }
);

console.log('✅ Cart reminder cron job registered');

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
app.use('/api/admin/marketing-campaigns', createAdminMarketingCampaignRoutes(pool));
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
app.use('/api/shipping', createShippingRoutes(pool));
app.use('/api/admin/shipping-quotes', createAdminShippingQuoteRoutes(pool));
app.use('/api/admin/assembly-manuals', createAdminAssemblyManualRoutes(pool));
app.use('/api/manuals', createAssemblyManualRoutes(pool));
app.use('/api/admin/settings', createAdminSettingsRoutes(pool));
app.use('/api/settings', createSettingsRoutes(pool));
app.use('/api/site-notices', createSiteNoticeRoutes(pool));
app.use('/api/admin/site-notices', createAdminSiteNoticeRoutes(pool));
app.use('/api/analytics', createAnalyticsRoutes(pool));
app.use('/api/shared-configs', createSharedConfigRoutes(pool));

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
const server: Server = app.listen(PORT, HOST, () => {
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

const gracefulShutdown = (signal: NodeJS.Signals) => {
  console.warn(`[Lifecycle] Received ${signal}. Closing HTTP server at ${new Date().toISOString()}`);
  server.close(() => {
    console.warn('[Lifecycle] HTTP server closed. Exiting process.');
    process.exit(0);
  });

  // Force exit if close takes too long
  setTimeout(() => {
    console.error('[Lifecycle] Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000).unref();
};

['SIGTERM', 'SIGINT'].forEach(signal => {
  process.on(signal, () => gracefulShutdown(signal as NodeJS.Signals));
});

process.on('uncaughtException', (error) => {
  console.error('[Unhandled] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled] Unhandled promise rejection:', reason);
});

export default app;
