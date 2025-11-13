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
  
  // Production: Check hostname for eu.simfab.com
  if (hostname.startsWith('eu.') || hostname.includes('.eu.')) {
    return 'eu';
  }
  
  // Development/Testing: Check X-Region header
  if (headerRegion === 'eu' || headerRegion === 'us') {
    return headerRegion as Region;
  }
  
  // Development/Testing: Check query parameter
  if (queryRegion === 'eu' || queryRegion === 'us') {
    return queryRegion as Region;
  }
  
  // No region provided - fallback to 'us'
  return null as any;
}

/**
 * Middleware to detect and set region on request
 */
export function regionDetection(req: Request, res: Response, next: NextFunction): void {
  try {
    const detectedRegion = detectRegion(req);
    req.region = detectedRegion || 'us'; // Fallback to 'us' if no region detected
    next();
  } catch (error) {
    req.region = 'us'; // Fallback to 'us' on error
    next();
  }
}

