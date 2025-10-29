/**
 * Wishlist Controller
 * Handles wishlist HTTP endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { WishlistService } from '../services/WishlistService';
import WishlistModel from '../models/wishlist';
import { successResponse, errorResponse } from '../utils/response';
import { AuthenticationError } from '../utils/errors';

export class WishlistController {
  private wishlistService: WishlistService;
  private wishlistModel: WishlistModel;

  constructor(pool: Pool) {
    this.wishlistService = new WishlistService(pool);
    this.wishlistModel = new WishlistModel(pool);
  }

  /**
   * GET /api/wishlist
   * Get current user's wishlist
   */
  getWishlist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        res.status(401).json(errorResponse('Unauthorized'));
        return;
      }

      const items = await this.wishlistService.getWishlist(userId);
      const count = items.length;

      res.json(successResponse({
        items,
        count
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/wishlist
   * Add product to wishlist
   */
  addToWishlist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        res.status(401).json(errorResponse('Unauthorized'));
        return;
      }

      const { productId, notifyOnSale, notifyOnStock } = req.body;

      if (!productId || typeof productId !== 'number') {
        res.status(400).json(errorResponse('Product ID is required and must be a number'));
        return;
      }

      const wishlist = await this.wishlistService.addToWishlist(userId, productId, {
        notify_on_sale: notifyOnSale,
        notify_on_stock: notifyOnStock,
      });

      res.json(successResponse({
        wishlist,
        message: 'Added to wishlist'
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/wishlist/:productId
   * Remove product from wishlist
   */
  removeFromWishlist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        res.status(401).json(errorResponse('Unauthorized'));
        return;
      }

      const productId = parseInt(req.params.productId, 10);
      if (isNaN(productId)) {
        res.status(400).json(errorResponse('Invalid product ID'));
        return;
      }

      await this.wishlistService.removeFromWishlist(userId, productId);

      res.json(successResponse({
        message: 'Removed from wishlist'
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/wishlist/:productId/preferences
   * Update notification preferences
   */
  updatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        res.status(401).json(errorResponse('Unauthorized'));
        return;
      }

      const productId = parseInt(req.params.productId, 10);
      if (isNaN(productId)) {
        res.status(400).json(errorResponse('Invalid product ID'));
        return;
      }

      const { notifyOnSale, notifyOnStock } = req.body;

      // Get wishlist item to find the id
      const wishlistItem = await this.wishlistModel.getWishlistItem(userId, productId);
      if (!wishlistItem) {
        res.status(404).json(errorResponse('Wishlist item not found'));
        return;
      }

      const wishlistId = wishlistItem.id!;

      const wishlist = await this.wishlistService.updatePreferences(wishlistId, userId, {
        notify_on_sale: notifyOnSale,
        notify_on_stock: notifyOnStock,
      });

      res.json(successResponse({
        wishlist
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/wishlist/count
   * Get wishlist item count
   */
  getCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        res.status(401).json(errorResponse('Unauthorized'));
        return;
      }

      const count = await this.wishlistService.getCount(userId);

      res.json(successResponse({ count }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/wishlist/:productId/check
   * Check if product is in wishlist
   */
  checkWishlist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        res.status(401).json(errorResponse('Unauthorized'));
        return;
      }

      const productId = parseInt(req.params.productId, 10);
      if (isNaN(productId)) {
        res.status(400).json(errorResponse('Invalid product ID'));
        return;
      }

      const isWishlisted = await this.wishlistService.isWishlisted(userId, productId);

      // Get wishlist ID if wishlisted
      let wishlistId: number | undefined;
      if (isWishlisted) {
        const wishlistItem = await this.wishlistModel.getWishlistItem(userId, productId);
        wishlistId = wishlistItem?.id;
      }

      res.json(successResponse({
        isWishlisted,
        wishlistId
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/wishlist/bulk-check
   * Check multiple products at once
   */
  bulkCheck = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        res.status(401).json(errorResponse('Unauthorized'));
        return;
      }

      const productIdsParam = req.query.productIds as string;
      if (!productIdsParam) {
        res.status(400).json(errorResponse('productIds query parameter is required'));
        return;
      }

      const productIds = productIdsParam
        .split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(id => !isNaN(id));

      if (productIds.length === 0) {
        res.status(400).json(errorResponse('Invalid product IDs'));
        return;
      }

      const status = await this.wishlistService.bulkCheck(userId, productIds);

      res.json(successResponse(status));
    } catch (error) {
      next(error);
    }
  };
}

