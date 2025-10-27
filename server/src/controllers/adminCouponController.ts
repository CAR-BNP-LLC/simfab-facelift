/**
 * Admin Coupon Controller
 * Handles admin coupon management endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { CouponService } from '../services/CouponService';
import { successResponse } from '../utils/response';
import { ValidationError, NotFoundError } from '../utils/errors';

export class AdminCouponController {
  private couponService: CouponService;

  constructor(pool: Pool) {
    this.couponService = new CouponService(pool);
  }

  /**
   * List all coupons (with pagination and filters)
   * GET /api/admin/coupons
   */
  listCoupons = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 20, status, type } = req.query;

      const pool = this.couponService.pool;
      const client = await pool.connect();

      try {
        // Build query with filters
        let whereConditions: string[] = [];
        let params: any[] = [];
        let paramCounter = 1;

        if (status === 'active') {
          whereConditions.push(`is_active = $${paramCounter}`);
          params.push(true);
          paramCounter++;
        } else if (status === 'inactive') {
          whereConditions.push(`is_active = $${paramCounter}`);
          params.push(false);
          paramCounter++;
        }

        if (type) {
          whereConditions.push(`discount_type = $${paramCounter}`);
          params.push(type);
          paramCounter++;
        }

        const whereClause = whereConditions.length > 0 
          ? `WHERE ${whereConditions.join(' AND ')}` 
          : '';

        // Count total
        const countResult = await client.query(
          `SELECT COUNT(*)::int as total FROM coupons ${whereClause}`,
          params
        );
        const total = countResult.rows[0].total;

        // Get coupons - map database column names to API field names
        const offset = (Number(page) - 1) * Number(limit);
        const result = await client.query(
          `SELECT 
            id, code, description, 
            discount_type as type, 
            discount_value as value,
            minimum_order_amount, maximum_discount_amount,
            usage_limit, usage_count, per_user_limit,
            valid_from as start_date, valid_until as end_date,
            is_active, applicable_products, applicable_categories, 
            excluded_products, created_by, created_at, updated_at
           FROM coupons ${whereClause} ORDER BY created_at DESC LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`,
          [...params, limit, offset]
        );

        res.json(successResponse({
          coupons: result.rows,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit))
          }
        }));
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get single coupon
   * GET /api/admin/coupons/:id
   */
  getCoupon = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const pool = this.couponService.pool;
      
      const result = await pool.query(
        `SELECT 
          id, code, description, 
          discount_type as type, 
          discount_value as value,
          minimum_order_amount, maximum_discount_amount,
          usage_limit, usage_count, per_user_limit,
          valid_from as start_date, valid_until as end_date,
          is_active, applicable_products, applicable_categories, 
          excluded_products, created_by, created_at, updated_at
        FROM coupons WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Coupon', { couponId: id });
      }

      res.json(successResponse(result.rows[0]));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create new coupon
   * POST /api/admin/coupons
   */
  createCoupon = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        code,
        type,
        value,
        description,
        minimum_order_amount,
        maximum_discount_amount,
        usage_limit,
        per_user_limit,
        start_date,
        end_date
      } = req.body;

      // Validate required fields
      if (!code || !type || value === undefined) {
        throw new ValidationError('Code, type, and value are required');
      }

      // Validate value based on type
      if (type === 'percentage' && (value < 0 || value > 100)) {
        throw new ValidationError('Percentage value must be between 0 and 100');
      }

      if ((type === 'fixed' || type === 'free_shipping') && value < 0) {
        throw new ValidationError('Value must be non-negative');
      }

      const coupon = await this.couponService.createCoupon({
        code,
        type,
        value,
        description,
        minimum_order_amount,
        maximum_discount_amount,
        usage_limit,
        per_user_limit: per_user_limit || 1,
        start_date: start_date ? new Date(start_date) : undefined,
        end_date: end_date ? new Date(end_date) : undefined
      });

      res.status(201).json(successResponse(coupon, 'Coupon created successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update coupon
   * PUT /api/admin/coupons/:id
   */
  updateCoupon = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const pool = this.couponService.pool;
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Check coupon exists
        const checkResult = await client.query(
          'SELECT id FROM coupons WHERE id = $1',
          [id]
        );

        if (checkResult.rows.length === 0) {
          throw new NotFoundError('Coupon', { couponId: id });
        }

        // Build update query - map API field names to database column names
        const updates: string[] = [];
        const values: any[] = [];
        let paramCounter = 1;

        const fieldMapping: Record<string, string> = {
          'code': 'code',
          'type': 'discount_type',
          'value': 'discount_value',
          'description': 'description',
          'minimum_order_amount': 'minimum_order_amount',
          'maximum_discount_amount': 'maximum_discount_amount',
          'usage_limit': 'usage_limit',
          'per_user_limit': 'per_user_limit',
          'start_date': 'valid_from',
          'end_date': 'valid_until',
          'is_active': 'is_active'
        };

        for (const [apiField, dbField] of Object.entries(fieldMapping)) {
          if (req.body[apiField] !== undefined) {
            updates.push(`${dbField} = $${paramCounter}`);
            values.push(req.body[apiField]);
            paramCounter++;
          }
        }

        if (updates.length === 0) {
          throw new ValidationError('No fields to update');
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);

        values.push(id);
        paramCounter++;

        const sql = `
          UPDATE coupons
          SET ${updates.join(', ')}
          WHERE id = $${paramCounter}
          RETURNING 
            id, code, description, 
            discount_type as type, 
            discount_value as value,
            minimum_order_amount, maximum_discount_amount,
            usage_limit, usage_count, per_user_limit,
            valid_from as start_date, valid_until as end_date,
            is_active, created_at, updated_at
        `;

        const result = await client.query(sql, values);
        await client.query('COMMIT');

        res.json(successResponse(result.rows[0], 'Coupon updated successfully'));
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete coupon
   * DELETE /api/admin/coupons/:id
   */
  deleteCoupon = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const pool = this.couponService.pool;

      const result = await pool.query(
        'DELETE FROM coupons WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Coupon', { couponId: id });
      }

      res.json(successResponse({ id }, 'Coupon deleted successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get coupon statistics
   * GET /api/admin/coupons/:id/stats
   */
  getCouponStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const pool = this.couponService.pool;

      // Get coupon details
      const couponResult = await pool.query(
        'SELECT * FROM coupons WHERE id = $1',
        [id]
      );

      if (couponResult.rows.length === 0) {
        throw new NotFoundError('Coupon', { couponId: id });
      }

      // Get usage statistics
      const statsResult = await pool.query(
        `SELECT 
          COUNT(*) as total_uses,
          COALESCE(SUM(discount_amount), 0) as total_discount,
          COUNT(DISTINCT user_id) as unique_users
        FROM coupon_usage
        WHERE coupon_id = $1`,
        [id]
      );

      res.json(successResponse({
        coupon: couponResult.rows[0],
        stats: statsResult.rows[0]
      }));
    } catch (error) {
      next(error);
    }
  };
}
