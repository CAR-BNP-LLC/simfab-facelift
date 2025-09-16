import express from 'express';
import cors from 'cors';
import session from 'express-session';
import fs from 'fs';
import productsRouter from './routes/products';
import authRouter from './routes/auth';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Session store - using PostgreSQL for all environments
const pgSession = require('connect-pg-simple')(session);

// Middleware
const corsOptions = {
  origin: '*', // Allow all origins
  credentials: false, // Must be false when origin is '*'
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
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Routes
app.use('/api/products', productsRouter);
app.use('/api/auth', authRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SimFab Products API Server',
    version: '1.0.0',
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

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File too large. Maximum size is 10MB.'
    });
  }
  
  if (err.message === 'Only CSV files are allowed') {
    return res.status(400).json({
      success: false,
      error: 'Only CSV files are allowed'
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server is running on ${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
  console.log(`📦 Products API: http://${HOST}:${PORT}/api/products`);
  console.log(`📤 Upload endpoint: http://${HOST}:${PORT}/api/products/upload`);
  console.log(`🔐 Auth endpoints: http://${HOST}:${PORT}/api/auth/*`);
  console.log(`📧 Newsletter: http://${HOST}:${PORT}/api/auth/newsletter/*`);
});

export default app;
