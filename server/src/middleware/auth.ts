import { Request, Response, NextFunction } from 'express';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { ErrorCode } from '../utils/errors';

/**
 * Extended session interface
 */
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    role?: string;
    email?: string;
  }
}

/**
 * Require authentication middleware
 * Ensures user is logged in
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.session || !req.session.userId) {
    throw new AuthenticationError('Authentication required', ErrorCode.UNAUTHORIZED);
  }

  next();
};

/**
 * Require admin middleware
 * Ensures user is logged in and has admin role
 * 
 * ⚠️ TEMPORARY: For testing, everyone is treated as admin
 * TODO: Remove this bypass before production!
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  // TEMPORARY BYPASS FOR TESTING - EVERYONE IS ADMIN
  console.log('⚠️  Admin auth bypassed for testing - everyone is admin!');
  next();
  return;
  
  /* PRODUCTION CODE (commented out for testing):
  if (!req.session || !req.session.userId) {
    throw new AuthenticationError('Authentication required', ErrorCode.UNAUTHORIZED);
  }

  if (req.session.role !== 'admin') {
    throw new AuthorizationError(
      'Administrator privileges required',
      ErrorCode.ADMIN_ACCESS_REQUIRED
    );
  }

  next();
  */
};

/**
 * Require staff or admin middleware
 * Ensures user is logged in and has staff or admin role
 */
export const requireStaff = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.session || !req.session.userId) {
    throw new AuthenticationError('Authentication required', ErrorCode.UNAUTHORIZED);
  }

  if (req.session.role !== 'admin' && req.session.role !== 'staff') {
    throw new AuthorizationError(
      'Staff privileges required',
      ErrorCode.ADMIN_ACCESS_REQUIRED
    );
  }

  next();
};

/**
 * Optional authentication middleware
 * Doesn't throw error if user is not logged in, but sets user data if available
 * Useful for cart operations where guest users should be supported
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  // Just pass through - session data will be available if user is logged in
  next();
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (req: Request): boolean => {
  return !!(req.session && req.session.userId);
};

/**
 * Check if user is admin
 */
export const isAdmin = (req: Request): boolean => {
  return !!(req.session && req.session.userId && req.session.role === 'admin');
};

/**
 * Check if user is staff or admin
 */
export const isStaff = (req: Request): boolean => {
  return !!(
    req.session &&
    req.session.userId &&
    (req.session.role === 'admin' || req.session.role === 'staff')
  );
};

/**
 * Get current user ID from session
 */
export const getCurrentUserId = (req: Request): number | null => {
  return req.session?.userId || null;
};

/**
 * Get current user role from session
 */
export const getCurrentUserRole = (req: Request): string | null => {
  return req.session?.role || null;
};

/**
 * Check if user owns resource
 * Useful for endpoints where users can only access their own resources
 */
export const requireOwnership = (userIdField: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session || !req.session.userId) {
      throw new AuthenticationError('Authentication required', ErrorCode.UNAUTHORIZED);
    }

    // Extract user ID from request (could be in params, body, or from database query)
    const resourceUserId = (req as any)[userIdField];

    if (resourceUserId && resourceUserId !== req.session.userId) {
      // Allow admin to access any resource
      if (req.session.role === 'admin') {
        next();
        return;
      }

      throw new AuthorizationError(
        'You do not have permission to access this resource',
        ErrorCode.ACCESS_DENIED
      );
    }

    next();
  };
};
