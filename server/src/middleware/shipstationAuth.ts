/**
 * ShipStation Authentication Middleware
 * Handles Basic HTTP Authentication for ShipStation endpoints
 */

import { Request, Response, NextFunction } from 'express';

export interface ShipStationRequest extends Request {
  shipstationAuth?: {
    username: string;
    password: string;
  };
}

/**
 * Basic HTTP Auth middleware for ShipStation
 */
export function shipstationAuth(req: ShipStationRequest, res: Response, next: NextFunction) {
  console.log('=== ShipStation Auth Middleware ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Has auth header:', !!req.headers.authorization);

  // Skip auth if ShipStation is disabled
  if (process.env.SHIPSTATION_ENABLED !== 'true') {
    console.error('ShipStation is disabled');
    return res.status(503).json({
      success: false,
      error: {
        code: 'SHIPSTATION_DISABLED',
        message: 'ShipStation integration is disabled'
      }
    });
  }

  // Check for Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    console.error('No basic auth header provided');
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Basic authentication required'
      }
    });
  }

  try {
    // Decode base64 credentials
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    console.log('Decoded credentials - Username:', username, '(length:', username?.length, ')');

    if (!username || !password) {
      console.error('Invalid credentials format');
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials format'
        }
      });
    }

    // Validate credentials against environment variables
    const expectedUsername = process.env.SHIPSTATION_USERNAME;
    const expectedPassword = process.env.SHIPSTATION_PASSWORD;

    if (!expectedUsername || !expectedPassword) {
      console.error('ShipStation credentials not configured in environment variables');
      return res.status(500).json({
        success: false,
        error: {
          code: 'CONFIG_ERROR',
          message: 'ShipStation credentials not configured'
        }
      });
    }

    if (username !== expectedUsername || password !== expectedPassword) {
      console.warn(`Invalid ShipStation credentials attempt from IP: ${req.ip}`);
      console.warn('Expected username length:', expectedUsername?.length, 'Provided:', username?.length);
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password'
        }
      });
    }

    // Store credentials in request for potential use in controllers
    req.shipstationAuth = { username, password };

    // Log successful authentication
    console.log(`ShipStation authenticated request from IP: ${req.ip}`);

    next();
  } catch (error) {
    console.error('Error in ShipStation auth middleware:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication error'
      }
    });
  }
}

/**
 * Optional auth middleware - allows requests through even if auth fails
 * Useful for testing endpoints
 */
export function optionalShipstationAuth(req: ShipStationRequest, res: Response, next: NextFunction) {
  // Skip auth if ShipStation is disabled
  if (process.env.SHIPSTATION_ENABLED !== 'true') {
    return next();
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    // No auth provided, continue without authentication
    return next();
  }

  try {
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    if (username && password) {
      const expectedUsername = process.env.SHIPSTATION_USERNAME;
      const expectedPassword = process.env.SHIPSTATION_PASSWORD;

      if (expectedUsername && expectedPassword && 
          username === expectedUsername && password === expectedPassword) {
        req.shipstationAuth = { username, password };
      }
    }
  } catch (error) {
    // Ignore auth errors in optional mode
    console.warn('Optional ShipStation auth failed:', error);
  }

  next();
}
