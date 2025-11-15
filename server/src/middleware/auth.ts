import { Request, Response, NextFunction } from 'express';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { ErrorCode } from '../utils/errors';
import RBACModel from '../models/rbac';

/**
 * Extended session interface
 */
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    role?: string; // deprecated - use authorities instead
    email?: string;
    authorities?: string[]; // NEW: cache authorities in session
  }
}

/**
 * Require authentication middleware
 * Ensures user is logged in
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const sessionId = req.sessionID;
  const hasSession = !!req.session;
  const hasUserId = !!(req.session?.userId);
  const cookieHeader = req.headers.cookie;
  const userAgent = req.headers['user-agent'];
  const isChrome = userAgent?.includes('Chrome') && !userAgent?.includes('Edg');
  
  if (!hasSession || !hasUserId) {
    // Log detailed information about why authentication failed
    const sessionKeys = req.session ? Object.keys(req.session) : [];
    const hasCookieHeader = !!cookieHeader;
    const cookieNames = cookieHeader 
      ? cookieHeader.split(';').map(c => c.trim().split('=')[0]).filter(Boolean)
      : [];
    // Check for common session cookie names (express-session default is 'connect.sid')
    const hasSessionCookie = cookieNames.some(name => 
      name === 'connect.sid' || 
      name.startsWith('connect.sid') ||
      name.includes('session') ||
      name.includes('sid')
    );
    
    // Determine the issue with detailed explanation
    let issue = 'Unknown';
    let solution = '';
    
    if (!hasCookieHeader) {
      // Check if this is a cross-origin request
      const origin = req.headers.origin;
      const host = req.get('host');
      const isCrossOrigin = origin && host && !origin.includes(host);
      
      if (isCrossOrigin) {
        issue = `Cross-origin cookie blocked: Browser (Chrome) is not sending session cookie from ${origin} to ${host}`;
        solution = 'The cookie was likely set with SameSite=Lax instead of SameSite=None. For cross-origin requests, the server must set cookies with SameSite=None; Secure. Check server cookie configuration - ensure NODE_ENV=production or set ALLOW_CROSS_ORIGIN=true environment variable.';
      } else {
        issue = 'No cookie header sent by browser - browser may have blocked the cookie';
        solution = 'Check browser cookie settings and ensure cookies are enabled for this domain.';
      }
    } else if (!hasSessionCookie) {
      issue = 'Cookie header present but session cookie (connect.sid) missing - other cookies are being sent but session cookie was blocked';
      solution = 'The session cookie was likely blocked by browser due to SameSite policy. For cross-origin requests, ensure cookie is set with SameSite=None; Secure.';
    } else if (hasSession && !hasUserId) {
      issue = 'Session exists but userId is missing - session was created but not authenticated';
      solution = 'This is a new/empty session. The session cookie is being sent but it contains no user data. User needs to log in again.';
    } else if (!hasSession) {
      issue = 'No session object - session cookie not being parsed by express-session';
      solution = 'The cookie may be malformed or the session store is not working. Check session store configuration.';
    }
    
    console.warn('🔒 Authentication failed in requireAuth:', {
      endpoint: req.path,
      method: req.method,
      issue,
      solution,
      sessionId,
      hasSession,
      hasUserId,
      sessionKeys,
      hasCookieHeader,
      cookieNames,
      hasSessionCookie,
      userAgent: userAgent?.substring(0, 50),
      isChrome,
      origin: req.headers.origin,
      referer: req.headers.referer,
      protocol: req.protocol,
      secure: req.secure,
      host: req.get('host'),
      isCrossOrigin: req.headers.origin && req.get('host') && !req.headers.origin.includes(req.get('host') || '')
    });
    
    throw new AuthenticationError('Authentication required', ErrorCode.UNAUTHORIZED);
  }

  next();
};

/**
 * Require admin middleware
 * Ensures user is logged in and has admin role
 * 
 * TEMPORARY: For testing, everyone is treated as admin
 * TODO: Remove this bypass before production!
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  // TEMPORARY BYPASS FOR TESTING - EVERYONE IS ADMIN
  console.log('Admin auth bypassed for testing - everyone is admin!');
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
      // Allow admin to access any resource - check for admin authorities
      if (req.session.authorities?.includes('rbac:manage')) {
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

// RBAC Authority-based middleware functions

/**
 * Load user authorities into session
 * This middleware should be used after requireAuth to populate authorities in session
 */
export const loadUserAuthorities = (rbacModel: RBACModel) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.session || !req.session.userId) {
      return next();
    }

    try {
      // Load authorities if not already cached in session
      if (!req.session.authorities) {
        const authorities = await rbacModel.getUserAuthorities(req.session.userId);
        req.session.authorities = authorities;
      }
      next();
    } catch (error) {
      console.error('Failed to load user authorities:', error);
      next();
    }
  };
};

/**
 * Require specific authority
 * Ensures user has the specified authority
 */
export const requireAuthority = (authority: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // First check if user is authenticated
    if (!req.session || !req.session.userId) {
      throw new AuthenticationError('Authentication required', ErrorCode.UNAUTHORIZED);
    }

    // Then check if user has the required authority
    if (!req.session.authorities || !req.session.authorities.includes(authority)) {
      throw new AuthorizationError(
        `Authority '${authority}' required`,
        ErrorCode.ACCESS_DENIED
      );
    }

    next();
  };
};

/**
 * Require any of the specified authorities
 * Ensures user has at least one of the specified authorities
 */
export const requireAnyAuthority = (...authorities: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session || !req.session.userId) {
      throw new AuthenticationError('Authentication required', ErrorCode.UNAUTHORIZED);
    }

    // TEMPORARY BYPASS FOR TESTING - ALLOW ALL AUTHORITIES
    console.log(`Any authority check bypassed for testing - checking ${authorities.join(' or ')}`);
    next();
    return;

    /* PRODUCTION CODE (commented out for testing):
    if (!req.session.authorities || authorities.length === 0) {
      throw new AuthorizationError(
        `One of the following authorities required: ${authorities.join(', ')}`,
        ErrorCode.ACCESS_DENIED
      );
    }

    const hasAnyAuthority = authorities.some(authority => 
      req.session.authorities!.includes(authority)
    );

    if (!hasAnyAuthority) {
      throw new AuthorizationError(
        `One of the following authorities required: ${authorities.join(', ')}`,
        ErrorCode.ACCESS_DENIED
      );
    }

    next();
    */
  };
};

/**
 * Require all of the specified authorities
 * Ensures user has all of the specified authorities
 */
export const requireAllAuthorities = (...authorities: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session || !req.session.userId) {
      throw new AuthenticationError('Authentication required', ErrorCode.UNAUTHORIZED);
    }

    // TEMPORARY BYPASS FOR TESTING - ALLOW ALL AUTHORITIES
    console.log(`All authorities check bypassed for testing - checking ${authorities.join(' and ')}`);
    next();
    return;

    /* PRODUCTION CODE (commented out for testing):
    if (!req.session.authorities || authorities.length === 0) {
      throw new AuthorizationError(
        `All of the following authorities required: ${authorities.join(', ')}`,
        ErrorCode.ACCESS_DENIED
      );
    }

    const hasAllAuthorities = authorities.every(authority => 
      req.session.authorities!.includes(authority)
    );

    if (!hasAllAuthorities) {
      throw new AuthorizationError(
        `All of the following authorities required: ${authorities.join(', ')}`,
        ErrorCode.ACCESS_DENIED
      );
    }

    next();
    */
  };
};

// Utility functions for authority checking

/**
 * Check if user has specific authority
 */
export const hasAuthority = (req: Request, authority: string): boolean => {
  return !!(req.session?.authorities?.includes(authority));
};

/**
 * Check if user has any of the specified authorities
 */
export const hasAnyAuthority = (req: Request, ...authorities: string[]): boolean => {
  if (!req.session?.authorities || authorities.length === 0) return false;
  return authorities.some(authority => req.session.authorities!.includes(authority));
};

/**
 * Check if user has all of the specified authorities
 */
export const hasAllAuthorities = (req: Request, ...authorities: string[]): boolean => {
  if (!req.session?.authorities || authorities.length === 0) return false;
  return authorities.every(authority => req.session.authorities!.includes(authority));
};

/**
 * Get current user authorities from session
 */
export const getCurrentUserAuthorities = (req: Request): string[] => {
  return req.session?.authorities || [];
};
