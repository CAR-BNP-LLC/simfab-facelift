import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

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
 * Global error handling middleware
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = uuidv4();

  // Log all errors
  logError(err, req, requestId);

  // Handle known operational errors
  if (err instanceof AppError) {
    const response = formatErrorResponse(err, requestId);
    res.status(err.statusCode).json(response);
    return;
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        requestId,
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid ID format',
        requestId,
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  // Handle Multer file upload errors
  if (err.message === 'File too large' || (err as any).code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'File size exceeds maximum allowed limit',
        requestId,
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  // Handle database errors
  if (err.name === 'QueryFailedError' || err.message.includes('database')) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: process.env.NODE_ENV === 'production' 
          ? 'Database operation failed' 
          : err.message,
        requestId,
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  // Handle unexpected errors (500)
  res.status(500).json({
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message,
      requestId,
      timestamp: new Date().toISOString()
    }
  });
};

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


