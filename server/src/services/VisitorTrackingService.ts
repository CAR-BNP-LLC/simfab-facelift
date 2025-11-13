import { Pool } from 'pg';

export interface PageViewData {
  page_path: string;
  page_title?: string;
  referrer?: string;
  query_string?: string;
  load_time?: number;
}

export interface EventData {
  event_type: string;
  event_data?: Record<string, any>;
  page_path?: string;
}

export interface SessionData {
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  device_type?: string;
  browser?: string;
  browser_version?: string;
  os?: string;
  os_version?: string;
  screen_width?: number;
  screen_height?: number;
  is_mobile?: boolean;
  is_tablet?: boolean;
  is_desktop?: boolean;
  ip_address?: string;
  country_code?: string;
  city?: string;
}

export class VisitorTrackingService {
  constructor(private pool: Pool) {}

  /**
   * Get or create a session
   * If session_id exists, update last_visit_at
   * If not, create new session
   */
  async getOrCreateSession(sessionId: string, sessionData?: SessionData): Promise<string> {
    const client = await this.pool.connect();
    try {
      // Check if session exists
      const existing = await client.query(
        `SELECT session_id, user_id, is_returning FROM visitor_sessions WHERE session_id = $1`,
        [sessionId]
      );

      if (existing.rows.length > 0) {
        // Update last visit
        await client.query(
          `UPDATE visitor_sessions 
           SET last_visit_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE session_id = $1`,
          [sessionId]
        );
        return sessionId;
      }

      // Create new session
      const isReturning = await this.checkIfReturning(sessionId, sessionData?.ip_address);
      
      await client.query(
        `INSERT INTO visitor_sessions (
          session_id, referrer, utm_source, utm_medium, utm_campaign, utm_term, utm_content,
          device_type, browser, browser_version, os, os_version,
          screen_width, screen_height, is_mobile, is_tablet, is_desktop,
          ip_address, country_code, city, is_returning
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
        [
          sessionId,
          sessionData?.referrer || null,
          sessionData?.utm_source || null,
          sessionData?.utm_medium || null,
          sessionData?.utm_campaign || null,
          sessionData?.utm_term || null,
          sessionData?.utm_content || null,
          sessionData?.device_type || null,
          sessionData?.browser || null,
          sessionData?.browser_version || null,
          sessionData?.os || null,
          sessionData?.os_version || null,
          sessionData?.screen_width || null,
          sessionData?.screen_height || null,
          sessionData?.is_mobile || false,
          sessionData?.is_tablet || false,
          sessionData?.is_desktop || false,
          sessionData?.ip_address || null,
          sessionData?.country_code || null,
          sessionData?.city || null,
          isReturning
        ]
      );

      return sessionId;
    } finally {
      client.release();
    }
  }

  /**
   * Check if this is a returning visitor
   * Checks by session_id or IP address (for anonymous visitors)
   */
  private async checkIfReturning(sessionId: string, ipAddress?: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      // Check by session_id (shouldn't exist for new session, but check anyway)
      const sessionCheck = await client.query(
        `SELECT COUNT(*) as count FROM visitor_sessions WHERE session_id = $1`,
        [sessionId]
      );

      if (parseInt(sessionCheck.rows[0].count) > 0) {
        return true;
      }

      // Check by IP address (for anonymous visitors)
      if (ipAddress) {
        const ipCheck = await client.query(
          `SELECT COUNT(*) as count 
           FROM visitor_sessions 
           WHERE ip_address = $1 
           AND created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'`,
          [ipAddress]
        );

        if (parseInt(ipCheck.rows[0].count) > 0) {
          return true;
        }
      }

      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Track a page view
   */
  async trackPageView(sessionId: string, userId: number | null, pageData: PageViewData): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO page_views (session_id, user_id, page_path, page_title, referrer, query_string, load_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          sessionId,
          userId,
          pageData.page_path,
          pageData.page_title || null,
          pageData.referrer || null,
          pageData.query_string || null,
          pageData.load_time || null
        ]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Track a custom event
   */
  async trackEvent(sessionId: string, userId: number | null, eventData: EventData): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO visitor_events (session_id, user_id, event_type, event_data, page_path)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          sessionId,
          userId,
          eventData.event_type,
          eventData.event_data ? JSON.stringify(eventData.event_data) : null,
          eventData.page_path || null
        ]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Link an anonymous session to a user_id when they log in
   * This ensures anonymous + authenticated activity is counted as one visitor
   */
  async linkSessionToUser(sessionId: string, userId: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      // Check if user_id already has previous sessions (for returning visitor detection)
      const userSessions = await client.query(
        `SELECT COUNT(*) as count 
         FROM visitor_sessions 
         WHERE user_id = $1 
         AND session_id != $2
         AND created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'`,
        [userId, sessionId]
      );

      const isReturning = parseInt(userSessions.rows[0].count) > 0;

      // Update the session to link user_id
      const result = await client.query(
        `UPDATE visitor_sessions 
         SET user_id = $1,
             authenticated_at = CURRENT_TIMESTAMP,
             is_returning = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE session_id = $3 
         AND user_id IS NULL`,
        [userId, isReturning, sessionId]
      );

      // Also update page_views and events to link user_id
      await client.query(
        `UPDATE page_views SET user_id = $1 WHERE session_id = $2 AND user_id IS NULL`,
        [userId, sessionId]
      );

      await client.query(
        `UPDATE visitor_events SET user_id = $1 WHERE session_id = $2 AND user_id IS NULL`,
        [userId, sessionId]
      );

      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }

  /**
   * Get unique visitor count for a period
   * Uses deduplication: COUNT(DISTINCT COALESCE(user_id::text, session_id))
   */
  async getUniqueVisitors(period: string): Promise<number> {
    const client = await this.pool.connect();
    try {
      let dateCondition = '';
      switch (period) {
        case '7d':
          dateCondition = "first_visit_at >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case '30d':
          dateCondition = "first_visit_at >= CURRENT_DATE - INTERVAL '30 days'";
          break;
        case '90d':
          dateCondition = "first_visit_at >= CURRENT_DATE - INTERVAL '90 days'";
          break;
        case '1y':
          dateCondition = "first_visit_at >= CURRENT_DATE - INTERVAL '1 year'";
          break;
        default:
          dateCondition = "first_visit_at >= CURRENT_DATE - INTERVAL '30 days'";
      }

      const result = await client.query(
        `SELECT COUNT(DISTINCT COALESCE(user_id::text, session_id)) as unique_visitors
         FROM visitor_sessions
         WHERE ${dateCondition}`
      );

      return parseInt(result.rows[0].unique_visitors);
    } finally {
      client.release();
    }
  }

  /**
   * Get new vs returning visitors
   */
  async getNewVsReturningVisitors(period: string): Promise<{ new: number; returning: number }> {
    const client = await this.pool.connect();
    try {
      let dateCondition = '';
      switch (period) {
        case '7d':
          dateCondition = "first_visit_at >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case '30d':
          dateCondition = "first_visit_at >= CURRENT_DATE - INTERVAL '30 days'";
          break;
        case '90d':
          dateCondition = "first_visit_at >= CURRENT_DATE - INTERVAL '90 days'";
          break;
        case '1y':
          dateCondition = "first_visit_at >= CURRENT_DATE - INTERVAL '1 year'";
          break;
        default:
          dateCondition = "first_visit_at >= CURRENT_DATE - INTERVAL '30 days'";
      }

      const result = await client.query(
        `SELECT 
           COUNT(DISTINCT CASE WHEN is_returning = FALSE THEN COALESCE(user_id::text, session_id) END) as new_visitors,
           COUNT(DISTINCT CASE WHEN is_returning = TRUE THEN COALESCE(user_id::text, session_id) END) as returning_visitors
         FROM visitor_sessions
         WHERE ${dateCondition}`
      );

      return {
        new: parseInt(result.rows[0].new_visitors) || 0,
        returning: parseInt(result.rows[0].returning_visitors) || 0
      };
    } finally {
      client.release();
    }
  }
}

