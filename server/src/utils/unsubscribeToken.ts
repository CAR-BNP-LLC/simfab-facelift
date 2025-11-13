/**
 * Unsubscribe Token Utility
 * Generates and validates secure unsubscribe tokens for marketing emails
 */

import crypto from 'crypto';

const SECRET_KEY = process.env.UNSUBSCRIBE_SECRET || 'change-this-secret-key-in-production';

/**
 * Generate a secure unsubscribe token
 * Format: base64url(hmac(email + timestamp, secret))
 */
export function generateUnsubscribeToken(email: string, campaignId: number, userId?: number): string {
  const timestamp = Date.now();
  const data = `${email}:${campaignId}:${userId || 0}:${timestamp}`;
  
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(data);
  const signature = hmac.digest('base64url');
  
  // Combine data and signature
  const token = Buffer.from(`${data}:${signature}`).toString('base64url');
  
  return token;
}

/**
 * Validate and decode unsubscribe token
 * Returns { email, campaignId, userId, timestamp } or null if invalid
 */
export function validateUnsubscribeToken(token: string): {
  email: string;
  campaignId: number;
  userId?: number;
  timestamp: number;
} | null {
  try {
    console.log('🔍 Validating token:', {
      tokenLength: token.length,
      tokenStart: token.substring(0, 30) + '...',
      secretKeySet: !!process.env.UNSUBSCRIBE_SECRET,
      secretKeyLength: (process.env.UNSUBSCRIBE_SECRET || SECRET_KEY).length
    });
    
    // Decode URL-encoded token if needed (Express already decodes query params, but be safe)
    let decodedToken = token;
    try {
      // Try decoding - if it fails, the token might not be URL-encoded
      const testDecode = decodeURIComponent(token);
      // Only use decoded if it's different (was actually encoded)
      if (testDecode !== token) {
        decodedToken = testDecode;
        console.log('📝 Token was URL-encoded, decoded it');
      }
    } catch {
      // If it's not URL-encoded, use as-is
      decodedToken = token;
    }
    
    const decoded = Buffer.from(decodedToken, 'base64url').toString('utf-8');
    console.log('📝 Decoded token data:', {
      decodedLength: decoded.length,
      decodedPreview: decoded.substring(0, 50) + '...'
    });
    
    const [data, signature] = decoded.split(':');
    
    if (!data || !signature) {
      console.error('❌ Token validation failed: Missing data or signature', { 
        hasData: !!data, 
        hasSignature: !!signature,
        decodedLength: decoded.length 
      });
      return null;
    }
    
    // Verify signature
    const hmac = crypto.createHmac('sha256', SECRET_KEY);
    hmac.update(data);
    const expectedSignature = hmac.digest('base64url');
    
    if (signature !== expectedSignature) {
      console.error('❌ Token validation failed: Invalid signature', {
        received: signature.substring(0, 10) + '...',
        expected: expectedSignature.substring(0, 10) + '...'
      });
      return null;
    }
    
    // Parse data
    const [email, campaignIdStr, userIdStr, timestampStr] = data.split(':');
    
    if (!email || !campaignIdStr || !timestampStr) {
      console.error('❌ Token validation failed: Missing required fields', {
        hasEmail: !!email,
        hasCampaignId: !!campaignIdStr,
        hasTimestamp: !!timestampStr
      });
      return null;
    }
    
    const campaignId = parseInt(campaignIdStr, 10);
    const userId = userIdStr && userIdStr !== '0' ? parseInt(userIdStr, 10) : undefined;
    const timestamp = parseInt(timestampStr, 10);
    
    if (isNaN(campaignId) || isNaN(timestamp)) {
      console.error('❌ Token validation failed: Invalid numeric values', {
        campaignId: campaignIdStr,
        timestamp: timestampStr
      });
      return null;
    }
    
    // Check if token is too old (30 days)
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    const age = Date.now() - timestamp;
    if (age > maxAge) {
      console.error('❌ Token validation failed: Token expired', {
        age: Math.round(age / (24 * 60 * 60 * 1000)) + ' days',
        maxAge: '30 days'
      });
      return null;
    }
    
    console.log('✅ Token validated successfully:', { email, campaignId, userId, age: Math.round(age / (60 * 60 * 1000)) + ' hours old' });
    
    return {
      email,
      campaignId,
      userId,
      timestamp
    };
  } catch (error) {
    console.error('❌ Error validating unsubscribe token:', error);
    if (error instanceof Error) {
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    return null;
  }
}

