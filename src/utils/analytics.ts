/**
 * Frontend Analytics Tracking Utility
 * Handles page view tracking, event tracking, and session management
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const SESSION_COOKIE_NAME = 'analytics_session_id';
const SESSION_DURATION = 30 * 60 * 60 * 1000; // 30 days

/**
 * Get or create session ID from cookie
 */
export function getSessionId(): string {
  // Try to get from cookie first
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === SESSION_COOKIE_NAME && value) {
      return value;
    }
  }

  // Generate new session ID
  const newSessionId = generateSessionId();
  setCookie(SESSION_COOKIE_NAME, newSessionId, SESSION_DURATION);
  return newSessionId;
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Set a cookie
 */
function setCookie(name: string, value: string, maxAge: number): void {
  const expires = new Date(Date.now() + maxAge).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

/**
 * Get UTM parameters from URL
 */
export function getUTMParams(): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
} {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
    utm_term: params.get('utm_term') || undefined,
    utm_content: params.get('utm_content') || undefined,
  };
}

/**
 * Get device information
 */
export function getDeviceInfo(): {
  device_type: string;
  browser: string;
  browser_version: string;
  os: string;
  os_version: string;
  screen_width: number;
  screen_height: number;
  is_mobile: boolean;
  is_tablet: boolean;
  is_desktop: boolean;
} {
  const ua = navigator.userAgent;
  const screen = window.screen;

  // Detect device type
  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
  const isTablet = /iPad|Android/i.test(ua) && !/Mobile/i.test(ua);
  const isDesktop = !isMobile && !isTablet;

  // Detect browser
  let browser = 'Unknown';
  let browserVersion = 'Unknown';
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    browser = 'Chrome';
    const match = ua.match(/Chrome\/(\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (ua.includes('Firefox')) {
    browser = 'Firefox';
    const match = ua.match(/Firefox\/(\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browser = 'Safari';
    const match = ua.match(/Version\/(\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (ua.includes('Edg')) {
    browser = 'Edge';
    const match = ua.match(/Edg\/(\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  }

  // Detect OS
  let os = 'Unknown';
  let osVersion = 'Unknown';
  if (ua.includes('Windows')) {
    os = 'Windows';
    const match = ua.match(/Windows NT (\d+\.\d+)/);
    osVersion = match ? match[1] : 'Unknown';
  } else if (ua.includes('Mac OS X')) {
    os = 'macOS';
    const match = ua.match(/Mac OS X (\d+[._]\d+)/);
    osVersion = match ? match[1].replace('_', '.') : 'Unknown';
  } else if (ua.includes('Linux')) {
    os = 'Linux';
    osVersion = 'Unknown';
  } else if (ua.includes('Android')) {
    os = 'Android';
    const match = ua.match(/Android (\d+\.\d+)/);
    osVersion = match ? match[1] : 'Unknown';
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS';
    const match = ua.match(/OS (\d+[._]\d+)/);
    osVersion = match ? match[1].replace('_', '.') : 'Unknown';
  }

  return {
    device_type: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
    browser,
    browser_version: browserVersion,
    os,
    os_version: osVersion,
    screen_width: screen.width,
    screen_height: screen.height,
    is_mobile: isMobile,
    is_tablet: isTablet,
    is_desktop: isDesktop,
  };
}

/**
 * Track a page view
 */
export async function trackPageView(
  pagePath: string,
  pageTitle?: string,
  loadTime?: number
): Promise<void> {
  try {
    const sessionId = getSessionId();
    const referrer = document.referrer || undefined;
    const queryString = window.location.search || undefined;
    const utmParams = getUTMParams();
    const deviceInfo = getDeviceInfo();

    await fetch(`${API_URL}/api/analytics/track-pageview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        session_id: sessionId,
        page_path: pagePath,
        page_title: pageTitle || document.title,
        referrer,
        query_string: queryString,
        load_time: loadTime,
        ...utmParams,
        ...deviceInfo,
      }),
    });
  } catch (error) {
    // Silently fail - don't interrupt user experience
    console.warn('Analytics tracking failed:', error);
  }
}

/**
 * Track a custom event
 */
export async function trackEvent(
  eventType: string,
  eventData?: Record<string, any>
): Promise<void> {
  try {
    const sessionId = getSessionId();
    const pagePath = window.location.pathname;

    await fetch(`${API_URL}/api/analytics/track-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        session_id: sessionId,
        event_type: eventType,
        event_data: eventData,
        page_path: pagePath,
      }),
    });
  } catch (error) {
    // Silently fail - don't interrupt user experience
    console.warn('Analytics event tracking failed:', error);
  }
}

/**
 * Link session to user when they log in
 */
export async function linkSessionToUser(): Promise<void> {
  try {
    const sessionId = getSessionId();

    await fetch(`${API_URL}/api/analytics/link-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        session_id: sessionId,
      }),
    });
  } catch (error) {
    // Silently fail - don't interrupt user experience
    console.warn('Analytics session linking failed:', error);
  }
}

