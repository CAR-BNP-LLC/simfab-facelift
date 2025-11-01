import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { LoggerService } from '../services/LoggerService';

/**
 * Standard error response format
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    requestId: string;
    timestamp: string;
  };
}

/**
 * Format error response
 */
const formatErrorResponse = (error: AppError, requestId: string): ErrorResponse => {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      requestId,
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * Log error for monitoring
 */
const logError = (error: Error, req: Request, requestId: string) => {
  const errorLog = {
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    userId: (req.session as any)?.userId,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error instanceof AppError && {
        statusCode: error.statusCode,
        code: error.code,
        details: error.details
      })
    }
  };

  // In production, you'd send this to a logging service (e.g., Winston, Sentry)
  if (process.env.NODE_ENV === 'production') {
    console.error('Error:', JSON.stringify(errorLog));
  } else {
    console.error('\n🔴 Error:', errorLog.error.name);
    console.error('Message:', errorLog.error.message);
    console.error('Request:', `${errorLog.method} ${errorLog.path}`);
    console.error('RequestId:', errorLog.requestId);
    if (errorLog.error.stack) {
      console.error('Stack:', errorLog.error.stack);
    }
    console.error('');
  }
};

/**
 * Global error handling middleware factory
 * Accepts LoggerService instance for database logging
 */
export const createErrorHandler = (loggerService?: LoggerService) => {
  return (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const requestId = uuidv4();
    let statusCode: number;
    let errorCode: string | undefined;

    // Log all errors
    logError(err, req, requestId);

    // Handle known operational errors
    if (err instanceof AppError) {
      statusCode = err.statusCode;
      // Use details.code if provided (for cases like REGION_MISMATCH)
      errorCode = (err.details?.code as string) || err.code;
      const response = formatErrorResponse(err, requestId);
      // Override code in response if details.code was provided
      if (err.details?.code) {
        response.error.code = err.details.code as string;
      }
      
      // Log server errors (5xx) to database
      if (loggerService) {
        loggerService.logServerError({
          requestId,
          error: err,
          req,
          statusCode,
          errorCode,
          details: err.details
        }).catch(() => {
          // Error already handled in LoggerService, just suppress
        });
      }
      
      res.status(statusCode).json(response);
      return;
    }

    // Handle specific error types
    if (err.name === 'ValidationError') {
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: err.message,
          requestId,
          timestamp: new Date().toISOString()
        }
      });
      // Don't log 4xx errors
      return;
    }

    if (err.name === 'CastError') {
      statusCode = 400;
      errorCode = 'INVALID_ID';
      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: 'Invalid ID format',
          requestId,
          timestamp: new Date().toISOString()
        }
      });
      // Don't log 4xx errors
      return;
    }

    // Handle Multer file upload errors
    if (err.message === 'File too large' || (err as any).code === 'LIMIT_FILE_SIZE') {
      statusCode = 413;
      errorCode = 'FILE_TOO_LARGE';
      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: 'File size exceeds maximum allowed limit',
          requestId,
          timestamp: new Date().toISOString()
        }
      });
      // Don't log 4xx errors
      return;
    }

    // Handle database errors
    if (err.name === 'QueryFailedError' || err.message.includes('database')) {
      statusCode = 500;
      errorCode = 'DATABASE_ERROR';
      const response = {
        success: false,
        error: {
          code: errorCode,
          message: process.env.NODE_ENV === 'production' 
            ? 'Database operation failed' 
            : err.message,
          requestId,
          timestamp: new Date().toISOString()
        }
      };
      
      // Log server errors (5xx) to database
      if (loggerService) {
        loggerService.logServerError({
          requestId,
          error: err,
          req,
          statusCode,
          errorCode
        }).catch(() => {
          // Error already handled in LoggerService, just suppress
        });
      }
      
      res.status(statusCode).json(response);
      return;
    }

    // Handle unexpected errors (500)
    statusCode = 500;
    errorCode = 'SERVER_ERROR';
    const response = {
      success: false,
      error: {
        code: errorCode,
        message: process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : err.message,
        requestId,
        timestamp: new Date().toISOString()
      }
    };
    
    // Log server errors (5xx) to database
    if (loggerService) {
      loggerService.logServerError({
        requestId,
        error: err,
        req,
        statusCode,
        errorCode
      }).catch(() => {
        // Error already handled in LoggerService, just suppress
      });
    }
    
    res.status(statusCode).json(response);
  };
};

/**
 * Default error handler (backwards compatibility)
 * Uses no logger service - logs only to console
 */
export const errorHandler = createErrorHandler();

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      requestId: uuidv4(),
      timestamp: new Date().toISOString()
    }
  });
};


