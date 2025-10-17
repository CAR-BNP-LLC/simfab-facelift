import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate limiter error handler
 */
const rateLimitHandler = (req: Request, res: Response) => {
  const rateLimitInfo = (req as any).rateLimit;
  const retryAfter = rateLimitInfo?.resetTime 
    ? Math.ceil((rateLimitInfo.resetTime.getTime() - Date.now()) / 1000) 
    : 60;

  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
      retryAfter,
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: rateLimitHandler
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 5 requests per window
  skipSuccessfulRequests: true, // Don't count successful requests
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

/**
 * Medium rate limiter for form submissions
 * 10 requests per 15 minutes per IP
 */
export const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 10 requests per window
  message: 'Too many submissions, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

/**
 * Generous rate limiter for admin endpoints
 * 60 requests per minute per IP
 */
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 600, // Limit each IP to 60 requests per minute
  message: 'Too many admin requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

/**
 * Rate limiter for file uploads
 * 20 uploads per hour per IP
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // Limit each IP to 20 uploads per hour
  message: 'Too many file uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

/**
 * Very strict rate limiter for password reset
 * 3 requests per hour per IP
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 3 requests per hour
  message: 'Too many password reset attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

/**
 * Search rate limiter
 * 30 searches per minute per IP
 */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // Limit each IP to 30 searches per minute
  message: 'Too many search requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

/**
 * Newsletter subscription limiter
 * 5 subscriptions per hour per IP
 */
export const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 5 subscriptions per hour
  message: 'Too many newsletter subscription attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

/**
 * Create custom rate limiter
 */
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
}) => {
  return rateLimit({
    ...options,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler
  });
};

// Aliases for consistency with route imports
export const apiRateLimiter = generalLimiter;
export const adminRateLimiter = adminLimiter;

