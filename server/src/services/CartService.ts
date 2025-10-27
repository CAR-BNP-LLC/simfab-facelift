/**
 * Cart Service
 * Handles shopping cart operations for guest and logged-in users
 */

import { Pool } from 'pg';
import {
  Cart,
  CartItem,
  CartWithItems,
  CartItemWithProduct,
  CartTotals,
  AddToCartData,
  UpdateCartItemData,
  AppliedCoupon
} from '../types/cart';
import { PriceCalculatorService } from './PriceCalculatorService';
import { StockReservationService } from './StockReservationService';
import { NotFoundError, ValidationError } from '../utils/errors';

export class CartService {
  private priceCalculator: PriceCalculatorService;
  private stockReservationService: StockReservationService;

  constructor(private pool: Pool) {
    this.priceCalculator = new PriceCalculatorService(pool);
    this.stockReservationService = new StockReservationService(pool);
  }

  /**
   * Get or create cart for current session/user
   */
  async getOrCreateCart(sessionId?: string, userId?: number): Promise<Cart> {
    try {
      // First try to find existing cart
      let cart = await this.findCart(sessionId, userId);

      if (cart) {
        // Check if cart is expired
        if (new Date(cart.expires_at) < new Date()) {
          // Clear expired cart and create new one
          await this.clearCart(cart.id);
          cart = await this.createCart(sessionId, userId);
        }
        return cart;
      }

      // Create new cart if none exists
      return await this.createCart(sessionId, userId);
    } catch (error) {
      console.error('Error getting or creating cart:', error);
      throw error;
    }
  }

  /**
   * Find existing cart
   */
  async findCart(sessionId?: string, userId?: number): Promise<Cart | null> {
    try {
      let sql: string;
      let params: any[];

      if (userId) {
        // Logged-in user - find by user_id
        sql = 'SELECT * FROM carts WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1';
        params = [userId];
      } else if (sessionId) {
        // Guest user - find by session_id
        sql = 'SELECT * FROM carts WHERE session_id = $1 AND user_id IS NULL ORDER BY updated_at DESC LIMIT 1';
        params = [sessionId];
      } else {
        return null;
      }

      const result = await this.pool.query(sql, params);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding cart:', error);
      return null;
    }
  }

  /**
   * Create new cart
   */
  async createCart(sessionId?: string, userId?: number): Promise<Cart> {
    const sql = `
      INSERT INTO carts (user_id, session_id, expires_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '7 days')
      RETURNING *
    `;

    const result = await this.pool.query(sql, [userId || null, sessionId || null]);
    return result.rows[0];
  }

  /**
   * Get cart with all items and details
   */
  async getCartWithItems(sessionId?: string, userId?: number): Promise<CartWithItems | null> {
    try {
      const cart = await this.getOrCreateCart(sessionId, userId);
      if (!cart) return null;

      // Get cart items with product details
      const itemsSql = `
        SELECT 
          ci.*,
          p.name as product_name,
          p.sku as product_sku,
          p.slug as product_slug,
          p.regular_price,
          p.sale_price,
          p.is_on_sale,
          p.sale_start_date,
          p.sale_end_date,
          COALESCE(
            (SELECT json_agg(row_to_json(pi))
             FROM (SELECT * FROM product_images WHERE product_id = p.id ORDER BY sort_order) pi),
            '[]'::json
          ) as product_images,
          (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as product_image,
          p.stock as product_stock,
          p.status as product_status
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        WHERE ci.cart_id = $1
        ORDER BY ci.created_at ASC
      `;

      const itemsResult = await this.pool.query(itemsSql, [cart.id]);
      const items = itemsResult.rows;

      // Get applied coupons
      const couponsResult = await this.pool.query(
        `SELECT c.id, c.code, c.discount_type as type, c.discount_value as value, 
                c.description, cc.discount_amount as amount
         FROM cart_coupons cc
         JOIN coupons c ON c.id = cc.coupon_id
         WHERE cc.cart_id = $1`,
        [cart.id]
      );
      const appliedCoupons = couponsResult.rows;

      // Calculate totals
      const totals = await this.calculateTotals(cart.id, items);

      return {
        ...cart,
        items,
        totals,
        appliedCoupons
      };
    } catch (error) {
      console.error('Error getting cart with items:', error);
      throw error;
    }
  }

  /**
   * Add item to cart
   */
  async addItem(
    sessionId: string | undefined,
    userId: number | undefined,
    data: AddToCartData
  ): Promise<CartItemWithProduct> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get or create cart
      const cart = await this.getOrCreateCart(sessionId, userId);

      // Validate product exists and is in stock
      const productSql = `
        SELECT 
          p.id, p.name, p.sku, p.slug, p.stock, p.status,
          COALESCE(
            (SELECT json_agg(row_to_json(pi))
             FROM (SELECT * FROM product_images WHERE product_id = p.id ORDER BY sort_order) pi),
            '[]'::json
          ) as images,
          (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as primary_image
        FROM products p 
        WHERE p.id = $1
      `;
      const productResult = await client.query(productSql, [data.productId]);

      if (productResult.rows.length === 0) {
        throw new NotFoundError('Product', { productId: data.productId });
      }

      const product = productResult.rows[0];

      if (product.status !== 'active') {
        throw new ValidationError('Product is not available for purchase');
      }

      // Check available stock (considering reservations)
      const availableStock = await this.stockReservationService.getAvailableStock(product.id);
      
      if (data.quantity > availableStock) {
        throw new ValidationError(`Insufficient stock. Only ${availableStock} available`, {
          available: availableStock,
          requested: data.quantity
        });
      }

      // Calculate price with configuration
      console.log('CartService: Calculating price for product', data.productId, 'with configuration:', data.configuration);
      const priceCalc = await this.priceCalculator.calculatePrice(
        data.productId,
        data.configuration,
        data.quantity
      );

      const unitPrice = priceCalc.pricing.subtotal;
      const totalPrice = priceCalc.pricing.total;
      console.log('CartService: Calculated unit price:', unitPrice, 'total price:', totalPrice);

      console.log('CartService: Checking for existing item with configuration:', JSON.stringify(data.configuration));
      
      // Check if same product with same configuration already in cart
      const existingItemSql = `
        SELECT * FROM cart_items
        WHERE cart_id = $1 AND product_id = $2 AND configuration = $3
      `;

      const existingResult = await client.query(existingItemSql, [
        cart.id,
        data.productId,
        JSON.stringify(data.configuration)
      ]);
      
      console.log('CartService: Found existing items:', existingResult.rows.length);

      let cartItem;

      if (existingResult.rows.length > 0) {
        // Update existing item quantity
        const existing = existingResult.rows[0];
        const newQuantity = existing.quantity + data.quantity;

        // Recalculate price
        const newPriceCalc = await this.priceCalculator.calculatePrice(
          data.productId,
          data.configuration,
          newQuantity
        );

        const updateSql = `
          UPDATE cart_items
          SET quantity = $1, total_price = $2, updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
          RETURNING *
        `;

        const updateResult = await client.query(updateSql, [
          newQuantity,
          newPriceCalc.pricing.total,
          existing.id
        ]);

        cartItem = updateResult.rows[0];
      } else {
        // Add new item
        const insertSql = `
          INSERT INTO cart_items (
            cart_id, product_id, quantity, configuration, unit_price, total_price
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;

        const insertResult = await client.query(insertSql, [
          cart.id,
          data.productId,
          data.quantity,
          JSON.stringify(data.configuration),
          unitPrice,
          totalPrice
        ]);

        cartItem = insertResult.rows[0];
      }

      await client.query('COMMIT');

      // Return cart item with product details
      return {
        ...cartItem,
        product_name: product.name,
        product_sku: product.sku,
        product_slug: product.slug,
        product_image: product.primary_image,
        product_images: product.images,
        product_stock: product.stock,
        product_status: product.status
      };
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error('Error adding item to cart:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update cart item quantity
   */
  async updateItemQuantity(
    itemId: number,
    quantity: number,
    sessionId?: string,
    userId?: number
  ): Promise<CartItem> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get cart item with product info
      const itemSql = `
        SELECT ci.*, p.stock, p.status
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        WHERE ci.id = $1
      `;

      const itemResult = await client.query(itemSql, [itemId]);

      if (itemResult.rows.length === 0) {
        throw new NotFoundError('Cart item', { itemId });
      }

      const item = itemResult.rows[0];

      // Validate quantity
      if (quantity < 1) {
        throw new ValidationError('Quantity must be at least 1');
      }

      if (quantity > 100) {
        throw new ValidationError('Quantity cannot exceed 100');
      }

      // Check available stock (considering reservations)
      const availableStock = await this.stockReservationService.getAvailableStock(item.product_id);
      
      if (quantity > availableStock) {
        throw new ValidationError(`Insufficient stock. Only ${availableStock} available`, {
          available: availableStock,
          requested: quantity
        });
      }

      // Recalculate price
      const priceCalc = await this.priceCalculator.calculatePrice(
        item.product_id,
        item.configuration,
        quantity
      );

      // Update item
      const updateSql = `
        UPDATE cart_items
        SET quantity = $1, total_price = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;

      const result = await client.query(updateSql, [
        quantity,
        priceCalc.pricing.total,
        itemId
      ]);

      await client.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error('Error updating cart item:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Remove item from cart
   */
  async removeItem(itemId: number): Promise<void> {
    const result = await this.pool.query('DELETE FROM cart_items WHERE id = $1', [itemId]);

    if (result.rowCount === 0) {
      throw new NotFoundError('Cart item', { itemId });
    }
  }

  /**
   * Clear all items from cart
   */
  async clearCart(cartId: number): Promise<void> {
    await this.pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
  }

  /**
   * Delete cart
   */
  async deleteCart(cartId: number): Promise<void> {
    await this.pool.query('DELETE FROM carts WHERE id = $1', [cartId]);
  }

  /**
   * Merge guest cart with user cart on login
   */
  async mergeGuestCart(sessionId: string, userId: number): Promise<CartWithItems> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get guest cart
      const guestCart = await this.findCart(sessionId, undefined);
      if (!guestCart) {
        // No guest cart to merge
        return (await this.getCartWithItems(undefined, userId))!;
      }

      // Get user cart (or create)
      const userCart = await this.getOrCreateCart(undefined, userId);

      // Get all guest cart items
      const guestItemsSql = 'SELECT * FROM cart_items WHERE cart_id = $1';
      const guestItemsResult = await client.query(guestItemsSql, [guestCart.id]);

      // Move items to user cart
      for (const item of guestItemsResult.rows) {
        // Check if same product+config exists in user cart
        const existingSql = `
          SELECT * FROM cart_items
          WHERE cart_id = $1 AND product_id = $2 AND configuration = $3
        `;

        const existingResult = await client.query(existingSql, [
          userCart.id,
          item.product_id,
          item.configuration
        ]);

        if (existingResult.rows.length > 0) {
          // Merge quantities
          const existing = existingResult.rows[0];
          const newQuantity = existing.quantity + item.quantity;

          // Recalculate price
          const priceCalc = await this.priceCalculator.calculatePrice(
            item.product_id,
            item.configuration,
            newQuantity
          );

          await client.query(
            'UPDATE cart_items SET quantity = $1, total_price = $2 WHERE id = $3',
            [newQuantity, priceCalc.pricing.total, existing.id]
          );
        } else {
          // Add item to user cart
          await client.query(
            'INSERT INTO cart_items (cart_id, product_id, quantity, configuration, unit_price, total_price) VALUES ($1, $2, $3, $4, $5, $6)',
            [userCart.id, item.product_id, item.quantity, item.configuration, item.unit_price, item.total_price]
          );
        }
      }

      // Delete guest cart
      await client.query('DELETE FROM carts WHERE id = $1', [guestCart.id]);

      await client.query('COMMIT');

      // Return merged cart
      return (await this.getCartWithItems(undefined, userId))!;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error merging carts:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate cart totals
   */
  private async calculateTotals(cartId: number, items: CartItemWithProduct[]): Promise<CartTotals> {
    // Calculate subtotal from items
    const subtotal = items.reduce((sum, item) => sum + parseFloat(item.total_price.toString()), 0);

    // Calculate product discounts (from sale prices)
    const productDiscount = items.reduce((sum, item) => {
      // Access discount fields directly from item (they're joined in the SQL query)
      const isOnSale = (item as any).is_on_sale;
      if (isOnSale && this.isSaleActive(item)) {
        const regularPrice = parseFloat(((item as any).regular_price || 0).toString());
        const salePrice = parseFloat(((item as any).sale_price || 0).toString());
        const discountPerUnit = Math.max(0, regularPrice - salePrice);
        return sum + (discountPerUnit * item.quantity);
      }
      return sum;
    }, 0);

    // Get coupon discounts
    const couponDiscount = await this.getCouponDiscounts(cartId);

    const totalDiscount = productDiscount + couponDiscount;
    const shipping = 0; // TODO: Calculate based on shipping method
    const tax = 0; // TODO: Calculate based on address
    const total = subtotal - totalDiscount + shipping + tax;
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(totalDiscount * 100) / 100,
      shipping: Math.round(shipping * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
      currency: 'USD',
      itemCount
    };
  }

  /**
   * Check if product sale is currently active
   */
  private isSaleActive(item: any): boolean {
    if (!item?.is_on_sale) return false;

    const now = new Date();
    
    // Check start date
    if (item.sale_start_date && new Date(item.sale_start_date) > now) {
      return false;
    }
    
    // Check end date
    if (item.sale_end_date && new Date(item.sale_end_date) < now) {
      return false;
    }
    
    return true;
  }

  /**
   * Get total coupon discount amount for cart
   */
  private async getCouponDiscounts(cartId: number): Promise<number> {
    try {
      const result = await this.pool.query(
        'SELECT COALESCE(SUM(discount_amount), 0) as total FROM cart_coupons WHERE cart_id = $1',
        [cartId]
      );
      return parseFloat(result.rows[0]?.total || 0);
    } catch (error) {
      console.error('Error getting coupon discounts:', error);
      return 0;
    }
  }

  /**
   * Validate cart before checkout
   */
  async validateCartForCheckout(cartId: number): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Get cart items
      const itemsSql = `
        SELECT ci.*, p.stock, p.status, p.name
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        WHERE ci.cart_id = $1
      `;

      const result = await this.pool.query(itemsSql, [cartId]);
      const items = result.rows;

      if (items.length === 0) {
        errors.push('Cart is empty');
      }

      // Validate each item
      for (const item of items) {
        // Check product is active
        if (item.status !== 'active') {
          errors.push(`Product "${item.name}" is no longer available`);
        }

        // Check stock
        if (item.stock < item.quantity) {
          errors.push(`Insufficient stock for "${item.name}". Only ${item.stock} available`);
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      console.error('Error validating cart:', error);
      throw error;
    }
  }

  /**
   * Get cart item count
   */
  async getCartItemCount(sessionId?: string, userId?: number): Promise<number> {
    try {
      const cart = await this.findCart(sessionId, userId);
      if (!cart) return 0;

      const sql = `
        SELECT COALESCE(SUM(quantity), 0)::int as count
        FROM cart_items
        WHERE cart_id = $1
      `;

      const result = await this.pool.query(sql, [cart.id]);
      return result.rows[0].count;
    } catch (error) {
      console.error('Error getting cart item count:', error);
      return 0;
    }
  }

  /**
   * Clean up expired carts (run periodically)
   */
  async cleanupExpiredCarts(): Promise<number> {
    try {
      const result = await this.pool.query(
        'DELETE FROM carts WHERE expires_at < CURRENT_TIMESTAMP AND user_id IS NULL'
      );

      return result.rowCount || 0;
    } catch (error) {
      console.error('Error cleaning up expired carts:', error);
      return 0;
    }
  }

  /**
   * Preserve cart for checkout process
   */
  async preserveCartForCheckout(cartId: string): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE carts SET status = $1 WHERE id = $2',
        ['checkout', cartId]
      );
    } catch (error) {
      console.error('Error preserving cart for checkout:', error);
      throw error;
    }
  }

  /**
   * Clear cart after successful payment
   */
  async clearCartAfterPayment(cartId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Clear cart items
      await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
      
      // Update cart status to completed
      await client.query('UPDATE carts SET status = $1 WHERE id = $2', ['completed', cartId]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error clearing cart after payment:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Restore cart from checkout if payment failed
   */
  async restoreCartFromCheckout(cartId: string): Promise<CartWithItems | null> {
    try {
      const result = await this.pool.query(
        'UPDATE carts SET status = $1 WHERE id = $2 AND status = $3 RETURNING *',
        ['active', cartId, 'checkout']
      );

      if (result.rows.length === 0) {
        return null;
      }

      return await this.getCartWithItems(cartId);
    } catch (error) {
      console.error('Error restoring cart from checkout:', error);
      throw error;
    }
  }

  /**
   * Apply coupon to cart
   */
  async applyCoupon(cartId: number, couponCode: string): Promise<AppliedCoupon> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get cart with items to calculate subtotal
      const cartResult = await client.query(
        'SELECT * FROM carts WHERE id = $1',
        [cartId]
      );
      
      if (cartResult.rows.length === 0) {
        throw new NotFoundError('Cart', { cartId });
      }
      
      // Get cart items and calculate subtotal
      const itemsResult = await client.query(
        `SELECT ci.quantity, ci.total_price 
         FROM cart_items ci 
         WHERE ci.cart_id = $1`,
        [cartId]
      );
      
      if (itemsResult.rows.length === 0) {
        throw new ValidationError('Cannot apply coupon to empty cart');
      }
      
      const subtotal = itemsResult.rows.reduce((sum, item) => 
        sum + parseFloat(item.total_price.toString()), 0
      );
      
      // Get coupon
      const couponResult = await client.query(
        'SELECT * FROM coupons WHERE UPPER(code) = UPPER($1) AND is_active = true',
        [couponCode]
      );
      
      if (couponResult.rows.length === 0) {
        throw new ValidationError('Invalid coupon code');
      }
      
      const coupon = couponResult.rows[0];
      
      // Validate coupon dates
      const now = new Date();
      if (coupon.valid_from && new Date(coupon.valid_from) > now) {
        throw new ValidationError('Coupon is not yet valid');
      }
      
      if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        throw new ValidationError('Coupon has expired');
      }
      
      // Check minimum order amount
      if (coupon.minimum_order_amount && subtotal < coupon.minimum_order_amount) {
        throw new ValidationError(`Minimum order amount of $${coupon.minimum_order_amount} required`);
      }
      
      // Check usage limit
      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        throw new ValidationError('Coupon usage limit reached');
      }
      
      // Check per-user limit if user is logged in
      if (cartResult.rows[0].user_id && coupon.per_user_limit) {
        const userUsageResult = await client.query(
          `SELECT COUNT(*)::int as count 
           FROM coupon_usage 
           WHERE coupon_id = $1 AND user_id = $2`,
          [coupon.id, cartResult.rows[0].user_id]
        );
        
        const userUsageCount = userUsageResult.rows[0].count;
        
        if (userUsageCount >= coupon.per_user_limit) {
          throw new ValidationError('You have already used this coupon the maximum number of times');
        }
      }
      
      // Calculate discount
      let discount = 0;
      if (coupon.discount_type === 'percentage') {
        discount = (subtotal * coupon.discount_value) / 100;
      } else if (coupon.discount_type === 'fixed') {
        discount = coupon.discount_value;
      }
      
      // Apply maximum discount limit
      if (coupon.maximum_discount_amount && discount > coupon.maximum_discount_amount) {
        discount = coupon.maximum_discount_amount;
      }
      
      // Discount cannot exceed cart total
      if (discount > subtotal) {
        discount = subtotal;
      }
      
      discount = Math.round(discount * 100) / 100;
      
      // Store applied coupon
      await client.query(
        `INSERT INTO cart_coupons (cart_id, coupon_id, discount_amount)
         VALUES ($1, $2, $3)
         ON CONFLICT (cart_id, coupon_id) DO UPDATE
         SET discount_amount = $3`,
        [cartId, coupon.id, discount]
      );
      
      await client.query('COMMIT');
      
      return {
        code: coupon.code,
        type: coupon.discount_type,
        value: coupon.discount_value,
        discountAmount: discount,
        amount: discount,
        description: coupon.description
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Remove coupon from cart
   */
  async removeCoupon(cartId: number): Promise<void> {
    await this.pool.query(
      'DELETE FROM cart_coupons WHERE cart_id = $1',
      [cartId]
    );
  }
}

