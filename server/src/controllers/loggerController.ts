import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { successResponse, errorResponse } from '../utils/response';
import { ValidationError } from '../utils/errors';

export class LoggerController {
  constructor(private pool: Pool) {}

  /**
   * Get error logs with pagination and filtering
   * GET /api/admin/logs
   */
  getErrorLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        page = '1',
        limit = '50',
        statusCode,
        errorCode,
        path,
        userId,
        startDate,
        endDate,
        search
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = Math.min(parseInt(limit as string, 10), 100); // Max 100 per page
      const offset = (pageNum - 1) * limitNum;

      // Build WHERE clause
      const conditions: string[] = [];
      const params: any[] = [];
      let paramCount = 0;

      if (statusCode) {
        paramCount++;
        conditions.push(`status_code = $${paramCount}`);
        params.push(parseInt(statusCode as string, 10));
      }

      if (errorCode) {
        paramCount++;
        conditions.push(`error_code = $${paramCount}`);
        params.push(errorCode);
      }

      if (path) {
        paramCount++;
        conditions.push(`path ILIKE $${paramCount}`);
        params.push(`%${path}%`);
      }

      if (userId) {
        paramCount++;
        conditions.push(`user_id = $${paramCount}`);
        params.push(parseInt(userId as string, 10));
      }

      if (startDate) {
        paramCount++;
        conditions.push(`created_at >= $${paramCount}`);
        params.push(startDate);
      }

      if (endDate) {
        paramCount++;
        conditions.push(`created_at <= $${paramCount}`);
        params.push(endDate);
      }

      if (search) {
        paramCount++;
        conditions.push(`(
          error_message ILIKE $${paramCount} OR
          error_name ILIKE $${paramCount} OR
          request_id::text ILIKE $${paramCount}
        )`);
        params.push(`%${search}%`);
      }

      const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM server_error_logs ${whereClause}`;
      const countResult = await this.pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count, 10);

      // Get logs
      paramCount++;
      const selectQuery = `
        SELECT 
          id,
          request_id,
          status_code,
          error_code,
          error_name,
          error_message,
          error_stack,
          http_method,
          path,
          query_params,
          request_body,
          user_id,
          ip_address,
          user_agent,
          request_headers,
          error_details,
          created_at
        FROM server_error_logs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;
      params.push(limitNum, offset);
      const result = await this.pool.query(selectQuery, params);

      res.json(successResponse({
        data: result.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get a single error log by ID
   * GET /api/admin/logs/:id
   */
  getErrorLog = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const result = await this.pool.query(
        `SELECT 
          id,
          request_id,
          status_code,
          error_code,
          error_name,
          error_message,
          error_stack,
          http_method,
          path,
          query_params,
          request_body,
          user_id,
          ip_address,
          user_agent,
          request_headers,
          error_details,
          created_at
        FROM server_error_logs
        WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json(errorResponse('Error log not found'));
      }

      res.json(successResponse({
        data: result.rows[0]
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get error logs statistics
   * GET /api/admin/logs/stats
   */
  getErrorLogStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { days = '7' } = req.query;
      const daysNum = parseInt(days as string, 10);

      // Get total errors
      const totalResult = await this.pool.query(
        'SELECT COUNT(*) as total FROM server_error_logs'
      );
      const total = parseInt(totalResult.rows[0].total, 10);

      // Get errors in last N days
      const recentResult = await this.pool.query(
        `SELECT COUNT(*) as count FROM server_error_logs
         WHERE created_at >= NOW() - INTERVAL '${daysNum} days'`
      );
      const recent = parseInt(recentResult.rows[0].count, 10);

      // Get errors by status code
      const statusResult = await this.pool.query(
        `SELECT status_code, COUNT(*) as count
         FROM server_error_logs
         GROUP BY status_code
         ORDER BY count DESC`
      );

      // Get errors by error code
      const errorCodeResult = await this.pool.query(
        `SELECT error_code, COUNT(*) as count
         FROM server_error_logs
         WHERE error_code IS NOT NULL
         GROUP BY error_code
         ORDER BY count DESC
         LIMIT 10`
      );

      // Get errors by path
      const pathResult = await this.pool.query(
        `SELECT path, COUNT(*) as count
         FROM server_error_logs
         GROUP BY path
         ORDER BY count DESC
         LIMIT 10`
      );

      // Get errors over time (last N days)
      const timeSeriesResult = await this.pool.query(
        `SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
         FROM server_error_logs
         WHERE created_at >= NOW() - INTERVAL '${daysNum} days'
         GROUP BY DATE(created_at)
         ORDER BY date ASC`
      );

      res.json(successResponse({
        data: {
          total,
          recent,
          byStatusCode: statusResult.rows,
          byErrorCode: errorCodeResult.rows,
          byPath: pathResult.rows,
          timeSeries: timeSeriesResult.rows,
          days: daysNum
        }
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete error logs (with optional filters)
   * DELETE /api/admin/logs
   */
  deleteErrorLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        olderThan,
        statusCode,
        errorCode,
        keepRecent = '100' // Keep most recent N logs by default
      } = req.body;

      let query = 'DELETE FROM server_error_logs';
      const conditions: string[] = [];
      const params: any[] = [];
      let paramCount = 0;

      // Always keep the most recent N logs
      paramCount++;
      conditions.push(`id NOT IN (
        SELECT id FROM server_error_logs
        ORDER BY created_at DESC
        LIMIT $${paramCount}
      )`);
      params.push(parseInt(keepRecent as string, 10));

      if (olderThan) {
        paramCount++;
        conditions.push(`created_at < $${paramCount}`);
        params.push(olderThan);
      }

      if (statusCode) {
        paramCount++;
        conditions.push(`status_code = $${paramCount}`);
        params.push(parseInt(statusCode as string, 10));
      }

      if (errorCode) {
        paramCount++;
        conditions.push(`error_code = $${paramCount}`);
        params.push(errorCode);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      const result = await this.pool.query(query, params);

      res.json(successResponse({
        message: `Deleted ${result.rowCount} error log(s)`,
        data: { deletedCount: result.rowCount }
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a single error log by ID
   * DELETE /api/admin/logs/:id
   */
  deleteErrorLog = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const result = await this.pool.query(
        'DELETE FROM server_error_logs WHERE id = $1',
        [id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json(errorResponse('Error log not found'));
      }

      res.json(successResponse({
        message: 'Error log deleted successfully'
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Test endpoint to generate a 500 error for testing logging
   * POST /api/admin/logs/test
   */
  testErrorLogging = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Intentionally throw an error to test logging
      throw new Error('Test error for logging system - This is intentional');
    } catch (error) {
      // Pass error to next middleware (errorHandler) which will log it
      next(error);
    }
  };

  /**
   * Get logging system status and table info
   * GET /api/admin/logs/status
   */
  getLoggingStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if table exists
      const tableCheck = await this.pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'server_error_logs'
        ) as table_exists
      `);

      const tableExists = tableCheck.rows[0]?.table_exists || false;

      if (!tableExists) {
        return res.json(successResponse({
          message: 'Error logs table does not exist. Please run migrations.',
          data: {
            tableExists: false,
            migrationNeeded: true
          }
        }));
      }

      // Get table info
      const tableInfo = await this.pool.query(`
        SELECT 
          COUNT(*) as total_logs,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as logs_last_24h,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as logs_last_7d,
          MIN(created_at) as earliest_log,
          MAX(created_at) as latest_log
        FROM server_error_logs
      `);

      const info = tableInfo.rows[0];

      res.json(successResponse({
        message: 'Logging system is operational',
        data: {
          tableExists: true,
          totalLogs: parseInt(info.total_logs, 10),
          logsLast24h: parseInt(info.logs_last_24h, 10),
          logsLast7d: parseInt(info.logs_last_7d, 10),
          earliestLog: info.earliest_log,
          latestLog: info.latest_log,
          migrationNeeded: false
        }
      }));
    } catch (error) {
      next(error);
    }
  };
}

