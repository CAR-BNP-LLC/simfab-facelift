/**
 * Coupon Service
 * Handles discount code validation and application
 */

import { Pool } from 'pg';
import { Coupon, CouponValidation, CartTotals } from '../types/cart';
import { ValidationError } from '../utils/errors';

export class CouponService {
  public pool: Pool;
  
  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get coupon by code
   */
  async getCouponByCode(code: string): Promise<any> {
    const sql = `
      SELECT 
        id, code, description, 
        discount_type as type, 
        discount_value as value,
        minimum_order_amount, maximum_discount_amount,
        usage_limit, usage_count, per_user_limit,
        valid_from as start_date, valid_until as end_date,
        is_active, applicable_products, applicable_categories, 
        excluded_products, created_at, updated_at
      FROM coupons
      WHERE UPPER(code) = UPPER($1) AND is_active = true
    `;

    const result = await this.pool.query(sql, [code]);
    return result.rows[0] || null;
  }

  /**
   * Validate coupon for cart
   */
  async validateCoupon(code: string, cartTotal: number): Promise<CouponValidation> {
    const errors: string[] = [];

    try {
      // Get coupon
      const coupon = await this.getCouponByCode(code);

      if (!coupon) {
        errors.push('Invalid coupon code');
        return { valid: false, errors };
      }

      // Check if expired
      const now = new Date();
      if (coupon.start_date && new Date(coupon.start_date) > now) {
        errors.push('Coupon is not yet valid');
      }

      if (coupon.end_date && new Date(coupon.end_date) < now) {
        errors.push('Coupon has expired');
      }

      // Check minimum order amount
      if (coupon.minimum_order_amount && cartTotal < coupon.minimum_order_amount) {
        errors.push(`Minimum order amount of $${coupon.minimum_order_amount} required`);
      }

      // Check usage limit
      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        errors.push('Coupon usage limit reached');
      }

      return {
        valid: errors.length === 0,
        coupon: errors.length === 0 ? coupon : undefined,
        errors
      };
    } catch (error) {
      console.error('Error validating coupon:', error);
      return {
        valid: false,
        errors: ['Error validating coupon']
      };
    }
  }

  /**
   * Calculate discount amount
   */
  calculateDiscount(coupon: Coupon, cartSubtotal: number): number {
    let discount = 0;

    if (coupon.type === 'percentage') {
      discount = (cartSubtotal * coupon.value) / 100;
    } else if (coupon.type === 'fixed') {
      discount = coupon.value;
    }

    // Apply maximum discount limit
    if (coupon.maximum_discount_amount && discount > coupon.maximum_discount_amount) {
      discount = coupon.maximum_discount_amount;
    }

    // Discount cannot exceed cart total
    if (discount > cartSubtotal) {
      discount = cartSubtotal;
    }

    return Math.round(discount * 100) / 100;
  }

  /**
   * Increment coupon usage count
   */
  async incrementUsageCount(couponId: number): Promise<void> {
    await this.pool.query(
      'UPDATE coupons SET usage_count = usage_count + 1 WHERE id = $1',
      [couponId]
    );
  }

  /**
   * Create coupon (admin only)
   */
  async createCoupon(data: {
    code: string;
    type: 'percentage' | 'fixed' | 'free_shipping';
    value: number;
    description?: string;
    minimum_order_amount?: number;
    maximum_discount_amount?: number;
    usage_limit?: number;
    per_user_limit?: number;
    start_date?: Date;
    end_date?: Date;
  }): Promise<any> {
    const sql = `
      INSERT INTO coupons (
        code, discount_type, discount_value, description, minimum_order_amount,
        maximum_discount_amount, usage_limit, per_user_limit, valid_from, valid_until, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      RETURNING 
        id, code, description, 
        discount_type as type, 
        discount_value as value,
        minimum_order_amount, maximum_discount_amount,
        usage_limit, usage_count, per_user_limit,
        valid_from as start_date, valid_until as end_date,
        is_active, created_at, updated_at
    `;

    const result = await this.pool.query(sql, [
      data.code.toUpperCase(),
      data.type,
      data.value,
      data.description || null,
      data.minimum_order_amount || null,
      data.maximum_discount_amount || null,
      data.usage_limit || null,
      data.per_user_limit || 1,
      data.start_date || null,
      data.end_date || null
    ]);

    return result.rows[0];
  }
}

