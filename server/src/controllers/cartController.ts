/**
 * Cart Controller
 * Handles shopping cart HTTP endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { CartService } from '../services/CartService';
import { CouponService } from '../services/CouponService';
import { AddToCartData, ApplyCouponData } from '../types/cart';
import { successResponse } from '../utils/response';
import { ValidationError } from '../utils/errors';

export class CartController {
  private cartService: CartService;
  private couponService: CouponService;

  constructor(pool: Pool) {
    this.cartService = new CartService(pool);
    this.couponService = new CouponService(pool);
  }

  /**
   * Get current cart
   * GET /api/cart
   */
  getCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.sessionID;
      const userId = req.session?.userId;

      console.log('Getting cart for session:', sessionId, 'user:', userId);

      const cart = await this.cartService.getCartWithItems(sessionId, userId);

      if (!cart || cart.items.length === 0) {
        return res.json(successResponse({
          cart: null,
          message: 'Cart is empty'
        }));
      }

      res.json(successResponse(cart));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Add item to cart
   * POST /api/cart/add
   */
  addItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.sessionID;
      const userId = req.session?.userId;
      const data: AddToCartData = req.body;

      console.log('========== CART CONTROLLER: RECEIVED REQUEST ==========');
      console.log('Session ID:', sessionId);
      console.log('User ID:', userId);
      console.log('Product ID:', data.productId);
      console.log('Quantity:', data.quantity);
      console.log('Full Request Body:', JSON.stringify(req.body, null, 2));
      
      // Detailed configuration analysis
      const config = data.configuration || req.body.configuration;
      if (config) {
        console.log('--- Configuration Analysis ---');
        console.log('Configuration Type:', typeof config);
        console.log('Full Configuration:', JSON.stringify(config, null, 2));
        
        // Variations breakdown
        if (config.variations) {
          console.log('Variations Found:', Object.keys(config.variations).length, 'items');
          console.log('Variations Details:', Object.entries(config.variations).map(([k, v]) => ({
            key: k,
            keyType: typeof k,
            value: v,
            valueType: typeof v
          })));
        } else {
          console.log('⚠️  No variations in configuration!');
        }
        
        // Addons breakdown
        if (config.addons) {
          console.log('Addons Found:', config.addons.length, 'items');
          console.log('Addons Details:', JSON.stringify(config.addons, null, 2));
        } else {
          console.log('No addons in configuration');
        }
        
        // Bundle items breakdown
        if (config.bundleItems) {
          console.log('Bundle Items Found:');
          console.log('  - Selected Optional:', config.bundleItems.selectedOptional?.length || 0);
          console.log('  - Optional IDs:', config.bundleItems.selectedOptional || []);
          console.log('  - Configurations:', config.bundleItems.configurations ? Object.keys(config.bundleItems.configurations).length : 0);
          console.log('  - Full Bundle Config:', JSON.stringify(config.bundleItems, null, 2));
        } else {
          console.log('No bundle items in configuration');
        }
        
        // Model variation
        if (config.modelVariationId) {
          console.log('Model Variation ID:', config.modelVariationId);
        }
        
        // Dropdown selections (legacy)
        if (config.dropdownSelections) {
          console.log('Legacy Dropdown Selections:', JSON.stringify(config.dropdownSelections, null, 2));
        }
      } else {
        console.log('⚠️  ⚠️  ⚠️  NO CONFIGURATION PROVIDED! ⚠️  ⚠️  ⚠️');
      }
      
      console.log('====================================================');

      const cartItem = await this.cartService.addItem(sessionId, userId, data);

      // Get updated cart
      const cart = await this.cartService.getCartWithItems(sessionId, userId);

      res.status(201).json(successResponse({
        cartItem,
        cart: cart?.totals,
        message: 'Item added to cart'
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update cart item quantity
   * PUT /api/cart/items/:itemId
   */
  updateItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const { quantity } = req.body;
      const sessionId = req.sessionID;
      const userId = req.session?.userId;

      const cartItem = await this.cartService.updateItemQuantity(itemId, quantity, sessionId, userId);

      // Get updated cart
      const cart = await this.cartService.getCartWithItems(sessionId, userId);

      res.json(successResponse({
        cartItem,
        cart: cart?.totals,
        message: 'Cart updated'
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Remove item from cart
   * DELETE /api/cart/items/:itemId
   */
  removeItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const sessionId = req.sessionID;
      const userId = req.session?.userId;

      await this.cartService.removeItem(itemId);

      // Get updated cart
      const cart = await this.cartService.getCartWithItems(sessionId, userId);

      res.json(successResponse({
        cart: cart?.totals,
        message: 'Item removed from cart'
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Clear entire cart
   * DELETE /api/cart/clear
   */
  clearCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.sessionID;
      const userId = req.session?.userId;

      const cart = await this.cartService.findCart(sessionId, userId);

      if (cart) {
        await this.cartService.clearCart(cart.id);
      }

      res.json(successResponse({
        message: 'Cart cleared'
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Apply coupon code
   * POST /api/cart/apply-coupon
   */
  applyCoupon = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { couponCode }: ApplyCouponData = req.body;
      const sessionId = req.sessionID;
      const userId = req.session?.userId;

      // Get cart to get cartId
      const cart = await this.cartService.getOrCreateCart(sessionId, userId);

      if (!cart) {
        throw new ValidationError('Cart not found');
      }

      // Apply coupon using CartService
      const appliedCoupon = await this.cartService.applyCoupon(cart.id, couponCode);

      // Get updated cart with new totals
      const updatedCart = await this.cartService.getCartWithItems(sessionId, userId);

      res.json(successResponse({
        coupon: appliedCoupon,
        cart: updatedCart,
        message: 'Coupon applied successfully'
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Remove coupon from cart
   * POST /api/cart/remove-coupon
   */
  removeCoupon = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.sessionID;
      const userId = req.session?.userId;

      // Get cart
      const cart = await this.cartService.getOrCreateCart(sessionId, userId);

      if (!cart) {
        throw new ValidationError('Cart not found');
      }

      // Remove coupon
      await this.cartService.removeCoupon(cart.id);

      // Get updated cart with new totals
      const updatedCart = await this.cartService.getCartWithItems(sessionId, userId);

      res.json(successResponse({
        cart: updatedCart,
        message: 'Coupon removed successfully'
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get cart item count
   * GET /api/cart/count
   */
  getItemCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.sessionID;
      const userId = req.session?.userId;

      const count = await this.cartService.getCartItemCount(sessionId, userId);

      res.json(successResponse({ count }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Merge guest cart with user cart (called after login)
   * POST /api/cart/merge
   */
  mergeCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.sessionID;
      const userId = req.session?.userId;

      if (!userId) {
        throw new ValidationError('User must be logged in to merge cart');
      }

      const cart = await this.cartService.mergeGuestCart(sessionId, userId);

      res.json(successResponse({
        cart,
        message: 'Cart merged successfully'
      }));
    } catch (error) {
      next(error);
    }
  };
}

