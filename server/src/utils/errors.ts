/**
 * Custom Error Classes for SimFab API
 * Provides standardized error handling with proper HTTP status codes
 */

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', code: string = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', code: string = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', details?: any) {
    super(`${resource} not found`, 404, 'NOT_FOUND', details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', code: string = 'CONFLICT', details?: any) {
    super(message, 409, code, details);
  }
}

export class PaymentError extends AppError {
  constructor(message: string = 'Payment processing failed', code: string = 'PAYMENT_FAILED', details?: any) {
    super(message, 402, code, details);
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message: string = 'Unprocessable entity', details?: any) {
    super(message, 422, 'UNPROCESSABLE_ENTITY', details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable', code: string = 'SERVICE_UNAVAILABLE') {
    super(message, 503, code);
  }
}

// Error codes enum for consistency
export enum ErrorCode {
  // Authentication
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  
  // Authorization
  FORBIDDEN = 'FORBIDDEN',
  ADMIN_ACCESS_REQUIRED = 'ADMIN_ACCESS_REQUIRED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  REQUIRED_FIELD = 'REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // Resources
  NOT_FOUND = 'NOT_FOUND',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  CART_EMPTY = 'CART_EMPTY',
  
  // Conflict
  EMAIL_EXISTS = 'EMAIL_EXISTS',
  SKU_EXISTS = 'SKU_EXISTS',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  
  // Business Logic
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  INVALID_QUANTITY = 'INVALID_QUANTITY',
  INVALID_COUPON = 'INVALID_COUPON',
  COUPON_EXPIRED = 'COUPON_EXPIRED',
  MINIMUM_NOT_MET = 'MINIMUM_NOT_MET',
  MAXIMUM_EXCEEDED = 'MAXIMUM_EXCEEDED',
  
  // Payment
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_DECLINED = 'PAYMENT_DECLINED',
  INVALID_PAYMENT_METHOD = 'INVALID_PAYMENT_METHOD',
  PAYMENT_ALREADY_PROCESSED = 'PAYMENT_ALREADY_PROCESSED',
  
  // Shipping
  SHIPPING_RESTRICTED = 'SHIPPING_RESTRICTED',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  SHIPPING_CALCULATION_FAILED = 'SHIPPING_CALCULATION_FAILED',
  
  // Orders
  CANNOT_CANCEL = 'CANNOT_CANCEL',
  STOCK_UNAVAILABLE = 'STOCK_UNAVAILABLE',
  PRODUCT_NOT_AVAILABLE = 'PRODUCT_NOT_AVAILABLE',
  
  // System
  SERVER_ERROR = 'SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE'
}


