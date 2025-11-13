import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { VisitorTrackingService } from '../services/VisitorTrackingService';
import { successResponse, errorResponse } from '../utils/response';
import { v4 as uuidv4 } from 'uuid';

export class AnalyticsController {
  private visitorTrackingService: VisitorTrackingService;

  constructor(pool: Pool) {
    this.visitorTrackingService = new VisitorTrackingService(pool);
  }

  /**
   * Track a page view
   * POST /api/analytics/track-pageview
   */
  trackPageView = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { session_id, page_path, page_title, referrer, query_string, load_time, ...sessionData } = req.body;

      if (!session_id || !page_path) {
        return res.status(400).json(errorResponse('session_id and page_path are required'));
      }

      const userId = (req as any).user?.id || null;

      // Get or create session
      await this.visitorTrackingService.getOrCreateSession(session_id, sessionData);

      // Track page view
      await this.visitorTrackingService.trackPageView(session_id, userId, {
        page_path,
        page_title,
        referrer,
        query_string,
        load_time
      });

      res.json(successResponse({ success: true }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Track a custom event
   * POST /api/analytics/track-event
   */
  trackEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { session_id, event_type, event_data, page_path } = req.body;

      if (!session_id || !event_type) {
        return res.status(400).json(errorResponse('session_id and event_type are required'));
      }

      const userId = (req as any).user?.id || null;

      // Track event
      await this.visitorTrackingService.trackEvent(session_id, userId, {
        event_type,
        event_data,
        page_path
      });

      res.json(successResponse({ success: true }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Link session to user when they log in
   * POST /api/analytics/link-session
   */
  linkSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { session_id } = req.body;
      const userId = (req as any).user?.id;

      if (!session_id) {
        return res.status(400).json(errorResponse('session_id is required'));
      }

      if (!userId) {
        return res.status(401).json(errorResponse('User must be authenticated'));
      }

      const linked = await this.visitorTrackingService.linkSessionToUser(session_id, userId);

      res.json(successResponse({ linked }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get visitor overview statistics
   * GET /api/admin/analytics/visitors/overview?period=30d
   */
  getVisitorOverview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { period = '30d' } = req.query;

      const uniqueVisitors = await this.visitorTrackingService.getUniqueVisitors(period as string);
      const newVsReturning = await this.visitorTrackingService.getNewVsReturningVisitors(period as string);

      // Get additional stats from database
      const pool = (this.visitorTrackingService as any).pool;
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

      const stats = await pool.query(
        `SELECT 
           COUNT(*) as total_sessions,
           SUM(page_views_count) as total_page_views,
           AVG(page_views_count) as avg_page_views_per_session,
           COUNT(DISTINCT page_path) as unique_pages
         FROM visitor_sessions vs
         LEFT JOIN page_views pv ON vs.session_id = pv.session_id
         WHERE ${dateCondition}`
      );

      res.json(successResponse({
        period,
        unique_visitors: uniqueVisitors,
        new_visitors: newVsReturning.new,
        returning_visitors: newVsReturning.returning,
        total_sessions: parseInt(stats.rows[0].total_sessions) || 0,
        total_page_views: parseInt(stats.rows[0].total_page_views) || 0,
        avg_page_views_per_session: parseFloat(stats.rows[0].avg_page_views_per_session) || 0,
        unique_pages: parseInt(stats.rows[0].unique_pages) || 0
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get referrer breakdown
   * GET /api/admin/analytics/visitors/referrers?period=30d
   */
  getReferrerBreakdown = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { period = '30d' } = req.query;

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

      const pool = (this.visitorTrackingService as any).pool;

      // Get referrer breakdown
      const referrers = await pool.query(
        `SELECT 
           CASE 
             WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
             WHEN referrer LIKE '%google%' OR referrer LIKE '%bing%' OR referrer LIKE '%yahoo%' THEN 'Search Engine'
             WHEN referrer LIKE '%facebook%' OR referrer LIKE '%twitter%' OR referrer LIKE '%instagram%' OR referrer LIKE '%linkedin%' THEN 'Social Media'
             WHEN referrer LIKE '%mail%' OR referrer LIKE '%email%' THEN 'Email'
             ELSE 'Other'
           END as referrer_category,
           COUNT(DISTINCT COALESCE(user_id::text, session_id)) as visitors,
           COUNT(*) as sessions
         FROM visitor_sessions
         WHERE ${dateCondition}
         GROUP BY referrer_category
         ORDER BY visitors DESC`
      );

      // Get UTM source breakdown
      const utmSources = await pool.query(
        `SELECT 
           COALESCE(utm_source, 'None') as utm_source,
           COUNT(DISTINCT COALESCE(user_id::text, session_id)) as visitors
         FROM visitor_sessions
         WHERE ${dateCondition}
         GROUP BY utm_source
         ORDER BY visitors DESC
         LIMIT 20`
      );

      res.json(successResponse({
        period,
        referrers: referrers.rows,
        utm_sources: utmSources.rows
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get returning vs new visitor stats
   * GET /api/admin/analytics/visitors/returning?period=30d
   */
  getReturningVisitors = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { period = '30d' } = req.query;

      const newVsReturning = await this.visitorTrackingService.getNewVsReturningVisitors(period as string);

      res.json(successResponse({
        period,
        ...newVsReturning,
        returning_rate: newVsReturning.new + newVsReturning.returning > 0
          ? (newVsReturning.returning / (newVsReturning.new + newVsReturning.returning)) * 100
          : 0
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get top pages
   * GET /api/admin/analytics/visitors/pages?period=30d&limit=20
   */
  getTopPages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { period = '30d', limit = '20' } = req.query;

      let dateCondition = '';
      switch (period) {
        case '7d':
          dateCondition = "pv.created_at >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case '30d':
          dateCondition = "pv.created_at >= CURRENT_DATE - INTERVAL '30 days'";
          break;
        case '90d':
          dateCondition = "pv.created_at >= CURRENT_DATE - INTERVAL '90 days'";
          break;
        case '1y':
          dateCondition = "pv.created_at >= CURRENT_DATE - INTERVAL '1 year'";
          break;
        default:
          dateCondition = "pv.created_at >= CURRENT_DATE - INTERVAL '30 days'";
      }

      const pool = (this.visitorTrackingService as any).pool;

      const pages = await pool.query(
        `SELECT 
           pv.page_path,
           COUNT(*) as views,
           COUNT(DISTINCT pv.session_id) as unique_sessions,
           COUNT(DISTINCT COALESCE(pv.user_id::text, pv.session_id)) as unique_visitors
         FROM page_views pv
         WHERE ${dateCondition}
         GROUP BY pv.page_path
         ORDER BY views DESC
         LIMIT $1`,
        [parseInt(limit as string)]
      );

      res.json(successResponse({
        period,
        pages: pages.rows
      }));
    } catch (error) {
      next(error);
    }
  };
}

