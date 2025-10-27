/**
 * Admin Coupon Routes
 * Routes for admin coupon management
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { AdminCouponController } from '../../controllers/adminCouponController';
import { requireAuthority } from '../../middleware/auth';
import { adminRateLimiter } from '../../middleware/rateLimiter';

export const createAdminCouponRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new AdminCouponController(pool);

  // Apply rate limiting to all admin routes
  router.use(adminRateLimiter);

  /**
   * @route   GET /api/admin/coupons
   * @desc    List all coupons with pagination and filters
   * @access  Admin with coupons:view authority
   */
  router.get(
    '/',
    requireAuthority('coupons:view'),
    controller.listCoupons
  );

  /**
   * @route   GET /api/admin/coupons/:id
   * @desc    Get single coupon details
   * @access  Admin with coupons:view authority
   */
  router.get(
    '/:id',
    requireAuthority('coupons:view'),
    controller.getCoupon
  );

  /**
   * @route   POST /api/admin/coupons
   * @desc    Create new coupon
   * @access  Admin with coupons:create authority
   */
  router.post(
    '/',
    requireAuthority('coupons:create'),
    controller.createCoupon
  );

  /**
   * @route   PUT /api/admin/coupons/:id
   * @desc    Update coupon
   * @access  Admin with coupons:edit authority
   */
  router.put(
    '/:id',
    requireAuthority('coupons:edit'),
    controller.updateCoupon
  );

  /**
   * @route   DELETE /api/admin/coupons/:id
   * @desc    Delete coupon
   * @access  Admin with coupons:delete authority
   */
  router.delete(
    '/:id',
    requireAuthority('coupons:delete'),
    controller.deleteCoupon
  );

  /**
   * @route   GET /api/admin/coupons/:id/stats
   * @desc    Get coupon usage statistics
   * @access  Admin with coupons:view authority
   */
  router.get(
    '/:id/stats',
    requireAuthority('coupons:view'),
    controller.getCouponStats
  );

  return router;
};
