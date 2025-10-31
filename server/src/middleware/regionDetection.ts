/**
 * Region Detection Middleware
 * Detects the region (US or EU) from the request hostname or headers
 * Sets req.region for use in controllers
 */

import { Request, Response, NextFunction } from 'express';

export type Region = 'us' | 'eu';

// Extend Express Request to include region
declare global {
  namespace Express {
    interface Request {
      region?: Region;
    }
  }
}

/**
 * Detect region from hostname
 * Production: eu.simfab.com -> 'eu', simfab.com -> 'us'
 * Development: Use X-Region header or ?region query param
 */
export function detectRegion(req: Request): Region {
  const hostname = req.get('host') || req.hostname || '';
  const headerRegion = req.get('X-Region')?.toLowerCase();
  const queryRegion = (req.query.region as string)?.toLowerCase();
  
  console.log('🔍 Region Detection Debug:', {
    hostname,
    headerRegion,
    queryRegion,
    DEFAULT_REGION: process.env.DEFAULT_REGION,
    'req.query': req.query,
    'req.headers': {
      'x-region': req.get('X-Region'),
      'host': req.get('host')
    }
  });
  
  // Production: Check hostname for eu.simfab.com
  if (hostname.startsWith('eu.') || hostname.includes('.eu.')) {
    console.log('✅ Detected EU from hostname:', hostname);
    return 'eu';
  }
  
  // Development/Testing: Check X-Region header
  if (headerRegion === 'eu' || headerRegion === 'us') {
    console.log('✅ Detected region from X-Region header:', headerRegion);
    return headerRegion as Region;
  }
  
  // Development/Testing: Check query parameter
  if (queryRegion === 'eu' || queryRegion === 'us') {
    console.log('✅ Detected region from query param:', queryRegion);
    return queryRegion as Region;
  }
  
  // Default to US or from env var
  const defaultRegion = process.env.DEFAULT_REGION === 'eu' ? 'eu' : 'us';
  console.log('⚠️ Using default region:', defaultRegion);
  return defaultRegion;
}

/**
 * Middleware to detect and set region on request
 */
export function regionDetection(req: Request, res: Response, next: NextFunction): void {
  req.region = detectRegion(req);
  next();
}

