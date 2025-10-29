/**
 * Logger Service
 * Handles logging of server errors (HTTP 5xx) to database
 */

import { Pool } from 'pg';
import { Request } from 'express';
import { AppError } from '../utils/errors';

/**
 * Parameters for logging a server error
 */
export interface LogErrorParams {
  requestId: string;
  error: Error;
  req: Request;
  statusCode: number;
  errorCode?: string;
  details?: any;
}

/**
 * Sensitive fields that should be sanitized from logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'pass',
  'passwd',
  'pwd',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'auth',
  'secret',
  'apiKey',
  'api_key',
  'apikey',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'cvv',
  'cvc',
  'securityCode',
  'ssn',
  'socialSecurityNumber'
];

/**
 * Maximum size for request body/headers (in characters)
 */
const MAX_BODY_SIZE = 10000;

/**
 * Sanitize object by removing sensitive fields
 */
function sanitizeObject(obj: any, maxDepth: number = 5): any {
  if (!obj || maxDepth <= 0) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, maxDepth - 1));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Skip sensitive fields
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, maxDepth - 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Truncate string if it exceeds maximum size
 */
function truncateString(str: string, maxSize: number): string {
  if (!str || str.length <= maxSize) {
    return str;
  }
  return str.substring(0, maxSize) + '... [TRUNCATED]';
}

/**
 * Sanitize and truncate request body
 */
function sanitizeRequestBody(body: any): any {
  if (!body) {
    return null;
  }

  try {
    const sanitized = sanitizeObject(body);
    const jsonString = JSON.stringify(sanitized);
    if (jsonString.length > MAX_BODY_SIZE) {
      return { _truncated: true, _size: jsonString.length };
    }
    return sanitized;
  } catch (error) {
    return { _error: 'Failed to serialize request body' };
  }
}

/**
 * Sanitize request headers
 */
function sanitizeHeaders(headers: any): any {
  if (!headers) {
    return null;
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    
    // Always redact authorization headers
    if (lowerKey.includes('authorization') || lowerKey.includes('auth')) {
      sanitized[key] = '[REDACTED]';
    } else if (lowerKey.includes('cookie')) {
      // Redact cookies but keep structure
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export class LoggerService {
  constructor(private pool: Pool) {}

  /**
   * Check if status code is a server error (5xx)
   */
  private isServerError(statusCode: number): boolean {
    return statusCode >= 500 && statusCode < 600;
  }

  /**
   * Log server error (5xx) to database
   * Non-blocking - catches errors to prevent logging failures from breaking requests
   */
  async logServerError(params: LogErrorParams): Promise<void> {
    // Only log server errors (5xx)
    if (!this.isServerError(params.statusCode)) {
      return;
    }

    try {
      const {
        requestId,
        error,
        req,
        statusCode,
        errorCode,
        details
      } = params;

      // Extract user ID from session if available
      const userId = (req.session as any)?.userId || null;

      // Sanitize request data
      const sanitizedBody = sanitizeRequestBody(req.body);
      const sanitizedHeaders = sanitizeHeaders(req.headers);
      
      // Sanitize query params
      const sanitizedQuery = req.query ? sanitizeObject(req.query) : null;

      // Prepare error details
      const errorDetails: any = {
        ...(details || {}),
        ...(error instanceof AppError && {
          isOperational: error.isOperational,
          details: error.details
        })
      };

      // Truncate stack trace if too long
      const stackTrace = error.stack 
        ? truncateString(error.stack, 50000)
        : null;

      // Truncate error message if too long
      const errorMessage = truncateString(error.message, 5000);

      // Insert error log
      await this.pool.query(
        `INSERT INTO server_error_logs (
          request_id,
          status_code,
          error_code,
          error_name,
          error_message,
          error_stack,
          http_method,
          path,
          query_params,
          request_body,
          user_id,
          ip_address,
          user_agent,
          request_headers,
          error_details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          requestId,
          statusCode,
          errorCode || null,
          error.name || 'Error',
          errorMessage,
          stackTrace,
          req.method,
          req.path || req.url || '/unknown',
          sanitizedQuery ? JSON.stringify(sanitizedQuery) : null,
          sanitizedBody ? JSON.stringify(sanitizedBody) : null,
          userId,
          req.ip || null,
          req.get('user-agent') || null,
          sanitizedHeaders ? JSON.stringify(sanitizedHeaders) : null,
          Object.keys(errorDetails).length > 0 ? JSON.stringify(errorDetails) : null
        ]
      );
    } catch (logError: any) {
      // Log to console as fallback - don't throw to prevent breaking the error response
      console.error('❌ Failed to log error to database:', logError.message);
      console.error('   Original error:', params.error.message);
      console.error('   Request ID:', params.requestId);
    }
  }
}

