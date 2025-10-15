import express from 'express';
import cors from 'cors';
import session from 'express-session';
import path from 'path';
import authRouter from './routes/auth';
import { createProductRoutes } from './routes/products';
import { createAdminProductRoutes } from './routes/admin/products';
import { createAdminOrderRoutes } from './routes/admin/orders';
import { createAdminDashboardRoutes } from './routes/admin/dashboard';
import { createCartRoutes } from './routes/cart';
import { createOrderRoutes } from './routes/orders';
import { pool } from './config/database';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Session store - using PostgreSQL for all environments
const pgSession = require('connect-pg-simple')(session);

// Middleware - Temporary permissive CORS for debugging
const corsOptions = {
  origin: true, // Allow all origins temporarily
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Routes
app.use('/api/auth', authRouter);
app.use('/api/products', createProductRoutes(pool));
app.use('/api/cart', createCartRoutes(pool));
app.use('/api/orders', createOrderRoutes(pool));
app.use('/api/admin/products', createAdminProductRoutes(pool));
app.use('/api/admin/orders', createAdminOrderRoutes(pool));
app.use('/api/admin/dashboard', createAdminDashboardRoutes(pool));

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
app.use(errorHandler);

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
  console.log(`\n🔐 Admin API:`);
  console.log(`   Products: http://localhost:${PORT}/api/admin/products`);
  console.log(`\n📁 Static files: http://localhost:${PORT}/uploads`);
  console.log('='.repeat(60) + '\n');
});

export default app;
