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
    console.log('📝 Note: Header overrides DEFAULT_REGION env var. If this is wrong, check VITE_DEFAULT_REGION in frontend .env and restart frontend dev server.');
    return headerRegion as Region;
  }
  
  // Development/Testing: Check query parameter
  if (queryRegion === 'eu' || queryRegion === 'us') {
    console.log('✅ Detected region from query param:', queryRegion);
    return queryRegion as Region;
  }
  
  // No region provided - client must specify region via header or query param
  // This ensures the client is always in control of region selection
  console.error('❌ No region detected! Client must provide region via X-Region header or ?region query parameter.');
  // Return null instead of throwing - let controllers handle missing region
  return null as any;
}

/**
 * Middleware to detect and set region on request
 */
export function regionDetection(req: Request, res: Response, next: NextFunction): void {
  try {
    const detectedRegion = detectRegion(req);
    if (!detectedRegion) {
      console.error('❌ regionDetection middleware: No region detected for', req.method, req.path);
      req.region = 'us'; // Fallback to 'us' but log the error
      console.warn('⚠️ Falling back to "us" region. Client should provide X-Region header or ?region query parameter.');
    } else {
      req.region = detectedRegion;
      console.log('🌐 regionDetection middleware: Set req.region =', detectedRegion, 'for', req.method, req.path);
    }
    next();
  } catch (error) {
    console.error('❌ Error in regionDetection middleware:', error);
    req.region = 'us'; // Fallback to 'us' on error
    next();
  }
}

