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
import { BundleService } from './BundleService';
import { NotFoundError, ValidationError } from '../utils/errors';

export class CartService {
  private priceCalculator: PriceCalculatorService;
  private stockReservationService: StockReservationService;
  private bundleService: BundleService;

  constructor(private pool: Pool) {
    this.priceCalculator = new PriceCalculatorService(pool);
    this.stockReservationService = new StockReservationService(pool);
    this.bundleService = new BundleService(pool);
  }

  /**
   * Get or create cart for current session/user
   */
  async getOrCreateCart(sessionId?: string, userId?: number, region?: 'us' | 'eu'): Promise<Cart> {
    try {
      // First try to find existing cart with matching region
      let cart = await this.findCart(sessionId, userId, region);

      if (cart) {
        // Check if cart is expired
        if (new Date(cart.expires_at) < new Date()) {
          // Clear expired cart and create new one
          await this.clearCart(cart.id);
          cart = await this.createCart(sessionId, userId, region);
        }
        return cart;
      }

      // Create new cart if none exists (region required)
      if (!region) {
        throw new Error('Region is required to create a cart');
      }
      return await this.createCart(sessionId, userId, region);
    } catch (error) {
      console.error('Error getting or creating cart:', error);
      throw error;
    }
  }

  /**
   * Find existing cart
   * Excludes converted carts (carts that have been cleared after payment)
   * If region is provided, only finds carts matching that region
   */
  async findCart(sessionId?: string, userId?: number, region?: 'us' | 'eu'): Promise<Cart | null> {
    try {
      let sql: string;
      let params: any[];

      if (userId) {
        // Logged-in user - find by user_id, excluding converted carts
        if (region) {
          sql = `SELECT * FROM carts 
                 WHERE user_id = $1 
                 AND status != 'converted' 
                 AND region = $2
                 ORDER BY updated_at DESC LIMIT 1`;
          params = [userId, region];
        } else {
          sql = `SELECT * FROM carts 
                 WHERE user_id = $1 
                 AND status != 'converted' 
                 ORDER BY updated_at DESC LIMIT 1`;
          params = [userId];
        }
      } else if (sessionId) {
        // Guest user - find by session_id, excluding converted carts
        if (region) {
          sql = `SELECT * FROM carts 
                 WHERE session_id = $1 
                 AND user_id IS NULL 
                 AND status != 'converted'
                 AND region = $2
                 ORDER BY updated_at DESC LIMIT 1`;
          params = [sessionId, region];
        } else {
          sql = `SELECT * FROM carts 
                 WHERE session_id = $1 
                 AND user_id IS NULL 
                 AND status != 'converted'
                 ORDER BY updated_at DESC LIMIT 1`;
          params = [sessionId];
        }
      } else {
        console.warn('⚠️ findCart called without sessionId or userId');
        return null;
      }

      const result = await this.pool.query(sql, params);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error finding cart:', error);
      return null;
    }
  }

  /**
   * Create new cart
   * @param region - Cart region (required)
   */
  async createCart(sessionId?: string, userId?: number, region?: 'us' | 'eu'): Promise<Cart> {
    if (!region) {
      throw new Error('Region is required to create a cart');
    }
    
    const sql = `
      INSERT INTO carts (user_id, session_id, region, expires_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '7 days')
      RETURNING *
    `;

    const result = await this.pool.query(sql, [userId || null, sessionId || null, region]);
    return result.rows[0];
  }

  /**
   * Get cart with all items and details
   * @param sessionId - Session ID (optional)
   * @param userId - User ID (optional)
   * @param region - Region to filter cart by (optional, but recommended)
   * @param cartId - Specific cart ID to retrieve (optional, overrides other params)
   * @param createIfNotExists - If true, creates a new cart if none exists (default: false)
   */
  async getCartWithItems(sessionId?: string, userId?: number, region?: 'us' | 'eu', cartId?: number, createIfNotExists: boolean = false): Promise<CartWithItems | null> {
    try {
      let cart: Cart | null = null;
      
      // If cartId is provided, get that specific cart (with security check)
      if (cartId) {
        let cartSql = 'SELECT * FROM carts WHERE id = $1';
        const cartParams: any[] = [cartId];
        
        // Security: Verify cart belongs to this session/user
        if (userId) {
          cartSql += ' AND (user_id = $2 OR user_id IS NULL)';
          cartParams.push(userId);
        } else if (sessionId) {
          cartSql += ' AND (session_id = $2 OR user_id IS NULL)';
          cartParams.push(sessionId);
        }
        
        const cartResult = await this.pool.query(cartSql, cartParams);
        cart = cartResult.rows[0] || null;
        
        if (!cart) {
          console.warn(`Cart ${cartId} not found or access denied for session ${sessionId}, user ${userId}`);
        }
      } else if (region) {
        // If region is provided, find cart for that region (or create if createIfNotExists is true)
        if (createIfNotExists) {
          cart = await this.getOrCreateCart(sessionId, userId, region);
        } else {
          // Try to find cart with the specified region first
          cart = await this.findCart(sessionId, userId, region) || null;
          
          // If no cart found with region filter, try without region filter to find ANY cart
          // This handles cases where region detection might be incorrect
          if (!cart) {
            cart = await this.findCart(sessionId, userId) || null;
            if (cart) {
              // If we found a cart with a different region, update the region parameter
              // to ensure currency and totals are calculated correctly
              region = cart.region as 'us' | 'eu';
            }
          }
          // Note: We do NOT fall back to a different region's cart if the current region's cart is empty.
          // This prevents region/currency mismatches. If the cart for the requested region is empty,
          // we return it as-is and let the controller handle returning null for empty carts.
        }
      } else {
        // Otherwise, get existing cart (which should already have a region)
        // Don't create if region is not provided - we need region to create
        cart = await this.findCart(sessionId, userId) || null;
      }
      
      if (!cart) return null;

      // If cart is converted, return null so a new cart will be created on next operation
      if (cart.status === 'converted') {
        return null;
      }

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

      // Calculate totals (pass cart region for currency)
      const totals = await this.calculateTotals(cart.id, items, cart.region);

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

      // Validate product exists and get its region first
      const productSql = `
        SELECT 
          p.id, p.name, p.sku, p.slug, p.stock, p.status, p.is_bundle, p.region,
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
        await client.query('ROLLBACK');
        throw new NotFoundError('Product', { productId: data.productId });
      }

      const product = productResult.rows[0];

      if (product.status !== 'active') {
        await client.query('ROLLBACK');
        throw new ValidationError('Product is not available for purchase');
      }

      const productRegion = product.region as 'us' | 'eu';

      // Find or create cart within the transaction (using client, not pool)
      let cart: Cart | null = null;
      
      // Try to find existing cart with matching region within transaction
      let findCartSql: string;
      let findCartParams: any[];
      
      if (userId) {
        findCartSql = `SELECT * FROM carts 
                       WHERE user_id = $1 
                       AND status != 'converted' 
                       AND region = $2
                       ORDER BY updated_at DESC LIMIT 1`;
        findCartParams = [userId, productRegion];
      } else if (sessionId) {
        findCartSql = `SELECT * FROM carts 
                       WHERE session_id = $1 
                       AND user_id IS NULL 
                       AND status != 'converted'
                       AND region = $2
                       ORDER BY updated_at DESC LIMIT 1`;
        findCartParams = [sessionId, productRegion];
      } else {
        await client.query('ROLLBACK');
        throw new ValidationError('Session ID or User ID required');
      }
      
      const findCartResult = await client.query(findCartSql, findCartParams);
      cart = findCartResult.rows[0] || null;
      
      if (!cart) {
        // No cart exists for this region, create one within transaction
        const createCartSql = `
          INSERT INTO carts (user_id, session_id, region, expires_at)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '7 days')
          RETURNING *
        `;
        const createCartResult = await client.query(createCartSql, [
          userId || null,
          sessionId || null,
          productRegion
        ]);
        cart = createCartResult.rows[0];
      } else {
        // Cart exists - validate it matches product region
        if (cart.region !== productRegion) {
          await client.query('ROLLBACK');
          const existingRegion = cart.region === 'us' ? 'US' : 'EU';
          const newRegion = productRegion === 'us' ? 'US' : 'EU';
          throw new ValidationError(
            `You can only add products from ${newRegion} to your cart. Your cart currently contains ${existingRegion} products. Please clear your cart first or visit the ${existingRegion === 'US' ? 'EU' : 'US'} store.`,
            { code: 'REGION_MISMATCH', cartRegion: cart.region, productRegion }
          );
        }
      }

      // At this point, cart should never be null (either found or created)
      if (!cart) {
        await client.query('ROLLBACK');
        throw new Error('Failed to get or create cart');
      }

      // Normalize configuration first
      const normalizedConfig = this.normalizeConfigurationForComparison(data.configuration);
      
      // Validate required variations for the main product
      const mainProductValidation = await this.priceCalculator.validateConfiguration(
        data.productId,
        normalizedConfig
      );
      if (!mainProductValidation.valid) {
        await client.query('ROLLBACK');
        throw new ValidationError(
          'Invalid product configuration',
          {
            errors: mainProductValidation.errors,
            code: 'REQUIRED_VARIATIONS_MISSING'
          }
        );
      }
      
      // Validate bundle items if this is a bundle product
      if (product.is_bundle && normalizedConfig.bundleItems) {
        const bundleValidation = await this.bundleService.validateBundleConfiguration(
          product.id,
          {
            requiredItems: normalizedConfig.bundleItems.configurations || {},
            optionalItems: normalizedConfig.bundleItems.selectedOptional || []
          }
        );
        if (!bundleValidation.valid) {
          await client.query('ROLLBACK');
          throw new ValidationError(
            'Invalid bundle configuration',
            {
              errors: bundleValidation.errors,
              code: 'BUNDLE_CONFIGURATION_INVALID'
            }
          );
        }
      }
      
      // Check available stock (considering reservations and variation stock)
      const availableStock = await this.stockReservationService.getAvailableStock(
        product.id, 
        normalizedConfig
      );
      
      if (data.quantity > availableStock) {
        await client.query('ROLLBACK');
        throw new ValidationError(`Insufficient stock. Only ${availableStock} available`, {
          available: availableStock,
          requested: data.quantity
        });
      }

      // Track optional items that get removed due to stock
      let removedOptionalItems: string[] = [];
      
      // Check bundle items stock if this is a bundle product
      if (product.is_bundle && normalizedConfig.bundleItems) {
        
        // Get bundle items to identify required vs optional
        const allBundleItems = await this.bundleService.getBundleItems(product.id);
        const requiredBundleItemIds = allBundleItems.filter((item: any) => item.item_type === 'required').map((item: any) => item.id);
        const optionalBundleItemIds = allBundleItems.filter((item: any) => item.item_type === 'optional').map((item: any) => item.id);
        
        // Track original optional items before stock check
        const originalOptionalIds = [...(normalizedConfig.bundleItems.selectedOptional || [])];
        
        
        // Convert configuration format for BundleService
        // BundleService expects: requiredItems as Record<bundleItemId, ProductConfiguration>
        // Note: BundleService also looks for optional item configs in requiredItems, so include both
        const bundleItemsConfig: Record<number, any> = {};
        
        // Process required items configs
        for (const bundleItemId of requiredBundleItemIds) {
          if (normalizedConfig.bundleItems.configurations?.[bundleItemId]) {
            // Convert bundle item's variation config to ProductConfiguration format
            const bundleItemConfig = normalizedConfig.bundleItems.configurations[bundleItemId];
            bundleItemsConfig[bundleItemId] = {
              variations: bundleItemConfig
            };
          }
        }
        
        // Process optional items configs (BundleService checks these from requiredItems too)
        for (const bundleItemId of (normalizedConfig.bundleItems.selectedOptional || [])) {
          if (normalizedConfig.bundleItems.configurations?.[bundleItemId]) {
            const bundleItemConfig = normalizedConfig.bundleItems.configurations[bundleItemId];
            bundleItemsConfig[bundleItemId] = {
              variations: bundleItemConfig
            };
          }
        }
        
        const bundleConfig = {
          requiredItems: bundleItemsConfig,
          optionalItems: normalizedConfig.bundleItems.selectedOptional || []
        };
        
        const bundleAvailability = await this.bundleService.checkBundleAvailability(
          product.id,
          bundleConfig
        );
        
        // Check required items - if any are out of stock, block add to cart
        const requiredItems = bundleAvailability.variationStock?.filter((item: any) => item.required) || [];
        const outOfStockRequired = requiredItems.filter((item: any) => item.available <= 0);
        
        if (outOfStockRequired.length > 0) {
          await client.query('ROLLBACK');
          const itemNames = outOfStockRequired.map((item: any) => item.productName).join(', ');
          throw new ValidationError(
            `Cannot add to cart: Required bundle items are out of stock: ${itemNames}`,
            {
              outOfStockItems: outOfStockRequired,
              code: 'BUNDLE_REQUIRED_ITEM_OUT_OF_STOCK'
            }
          );
        }
        
        // Filter out unavailable optional items
        const optionalItems = bundleAvailability.variationStock?.filter((item: any) => !item.required) || [];
        const unavailableOptionals = optionalItems.filter((item: any) => item.available <= 0);
        
        if (unavailableOptionals.length > 0) {
          // Remove unavailable optional items from configuration
          // Need to map from productId back to bundle item ID
          const availableOptionalIds = (normalizedConfig.bundleItems.selectedOptional || []).filter((bundleItemId: number) => {
            const bundleItem = allBundleItems.find((item: any) => item.id === bundleItemId && item.item_type === 'optional');
            if (!bundleItem) return false;
            
            const item = optionalItems.find((opt: any) => opt.productId === bundleItem.item_product_id);
            return item && item.available > 0;
          });
          
          normalizedConfig.bundleItems.selectedOptional = availableOptionalIds;
          
          // Track which items were removed for warning message
          const removedIds = originalOptionalIds.filter((id: number) => !availableOptionalIds.includes(id));
          removedOptionalItems = removedIds.map((id: number) => {
            const bundleItem = allBundleItems.find((item: any) => item.id === id);
            if (bundleItem?.display_name) {
              return bundleItem.display_name;
            }
            // Try to find from unavailableOptionals
            const unavailableItem = unavailableOptionals.find((opt: any) => {
              const item = allBundleItems.find((bi: any) => bi.item_product_id === opt.productId && bi.id === id);
              return !!item;
            });
            if (unavailableItem) {
              return unavailableItem.productName || `Item ${id}`;
            }
            return `Item ${id}`;
          });
          
        }
        
      }

      // Configuration already normalized above for stock checking
      // Now use it for price calculation
      // Compare original vs normalized
      const originalStr = JSON.stringify(data.configuration);
      const normalizedStr = JSON.stringify(normalizedConfig);
      const priceCalc = await this.priceCalculator.calculatePrice(
        data.productId,
        normalizedConfig,
        data.quantity
      );

      const unitPrice = priceCalc.pricing.subtotal;
      const totalPrice = priceCalc.pricing.total;
      
      // Check if same product with same configuration already in cart
      // Normalize stored configurations for comparison
      const existingItemSql = `
        SELECT * FROM cart_items
        WHERE cart_id = $1 AND product_id = $2
      `;

      const existingItemsResult = await client.query(existingItemSql, [
        cart.id,
        data.productId
      ]);
      
      // Find matching configuration by comparing normalized versions
      const normalizedConfigStr = JSON.stringify(normalizedConfig);
      const existingResult = {
        rows: existingItemsResult.rows.filter((item: any) => {
          const storedConfig = typeof item.configuration === 'string' 
            ? JSON.parse(item.configuration) 
            : item.configuration;
          const normalizedStored = this.normalizeConfigurationForComparison(storedConfig);
          return JSON.stringify(normalizedStored) === normalizedConfigStr;
        })
      };
      

      let cartItem;

      if (existingResult.rows.length > 0) {
        // Update existing item quantity
        const existing = existingResult.rows[0];
        const newQuantity = existing.quantity + data.quantity;

        // Recalculate price with normalized configuration
        const newPriceCalc = await this.priceCalculator.calculatePrice(
          data.productId,
          normalizedConfig,
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
          JSON.stringify(normalizedConfig),
          unitPrice,
          totalPrice
        ]);

        cartItem = insertResult.rows[0];
      }

      // Clear all coupons when cart items change
      await client.query('DELETE FROM cart_coupons WHERE cart_id = $1', [cart.id]);

      await client.query('COMMIT');

      // Return cart item with product details
      // Include warning if optional items were removed
      const result: any = {
        ...cartItem,
        product_name: product.name,
        product_sku: product.sku,
        product_slug: product.slug,
        product_image: product.primary_image,
        product_images: product.images,
        product_stock: product.stock,
        product_status: product.status
      };
      
      // Add warning if optional bundle items were removed
      if (removedOptionalItems.length > 0) {
        result.warning = {
          message: `Some optional items were removed due to stock availability: ${removedOptionalItems.join(', ')}`,
          removedItems: removedOptionalItems,
          code: 'OPTIONAL_ITEMS_REMOVED'
        };
      }
      
      return result;
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
      // Configuration is parsed from JSON, so normalize it
      const normalizedConfig = typeof item.configuration === 'string' 
        ? JSON.parse(item.configuration) 
        : item.configuration;
      const priceCalc = await this.priceCalculator.calculatePrice(
        item.product_id,
        normalizedConfig,
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

      // Clear all coupons when cart items change
      await client.query('DELETE FROM cart_coupons WHERE cart_id = $1', [item.cart_id]);

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
    // Get cart_id before deleting the item
    const itemResult = await this.pool.query(
      'SELECT cart_id FROM cart_items WHERE id = $1',
      [itemId]
    );

    if (itemResult.rows.length === 0) {
      throw new NotFoundError('Cart item', { itemId });
    }

    const cartId = itemResult.rows[0].cart_id;

    // Delete the item
    const result = await this.pool.query('DELETE FROM cart_items WHERE id = $1', [itemId]);

    if (result.rowCount === 0) {
      throw new NotFoundError('Cart item', { itemId });
    }

    // Clear all coupons when cart items change
    await this.pool.query('DELETE FROM cart_coupons WHERE cart_id = $1', [cartId]);
  }

  /**
   * Clear all items from cart
   */
  async clearCart(cartId: number): Promise<void> {
    await this.pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
    await this.pool.query('DELETE FROM cart_coupons WHERE cart_id = $1', [cartId]);
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
          // Configuration is parsed from JSON, so normalize it
          const normalizedConfig = typeof item.configuration === 'string' 
            ? JSON.parse(item.configuration) 
            : item.configuration;
          const priceCalc = await this.priceCalculator.calculatePrice(
            item.product_id,
            normalizedConfig,
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
   * Normalize configuration for consistent comparison
   * This ensures variation IDs are numbers (handles JSON string keys)
   */
  private normalizeConfigurationForComparison(config: any): any {
    if (!config || typeof config !== 'object') return config;
    
    const normalized: any = {};
    
    // Copy non-variation fields
    if (config.modelVariationId !== undefined) normalized.modelVariationId = config.modelVariationId;
    
    // Normalize variations object keys
    if (config.variations) {
      normalized.variations = {};
      for (const [key, value] of Object.entries(config.variations)) {
        const numKey = typeof key === 'string' ? parseInt(key, 10) : (typeof key === 'number' ? key : NaN);
        const numValue = typeof value === 'string' ? parseInt(value, 10) : (typeof value === 'number' ? value : NaN);
        if (!isNaN(numKey) && !isNaN(numValue) && typeof numKey === 'number' && typeof numValue === 'number') {
          normalized.variations[numKey] = numValue;
        }
      }
    }
    
    // Normalize dropdownSelections if present
    if (config.dropdownSelections) {
      normalized.dropdownSelections = {};
      for (const [key, value] of Object.entries(config.dropdownSelections)) {
        const numKey = typeof key === 'string' ? parseInt(key, 10) : (typeof key === 'number' ? key : NaN);
        const numValue = typeof value === 'string' ? parseInt(value, 10) : (typeof value === 'number' ? value : NaN);
        if (!isNaN(numKey) && !isNaN(numValue) && typeof numKey === 'number' && typeof numValue === 'number') {
          normalized.dropdownSelections[numKey] = numValue;
        }
      }
    }
    
    // Normalize bundle items
    if (config.bundleItems) {
      normalized.bundleItems = {};
      if (config.bundleItems.selectedOptional) {
        normalized.bundleItems.selectedOptional = config.bundleItems.selectedOptional.map((id: any) =>
          typeof id === 'string' ? parseInt(id, 10) : id
        );
      }
      if (config.bundleItems.configurations) {
        normalized.bundleItems.configurations = {};
        for (const [bundleItemId, bundleConfig] of Object.entries(config.bundleItems.configurations)) {
          const numBundleItemId = typeof bundleItemId === 'string' ? parseInt(bundleItemId, 10) : bundleItemId;
          if (!isNaN(numBundleItemId) && bundleConfig && typeof bundleConfig === 'object') {
            const normalizedBundleVariations: Record<number, any> = {};
            for (const [varId, value] of Object.entries(bundleConfig as any)) {
              const numVarId = typeof varId === 'string' ? parseInt(varId, 10) : (typeof varId === 'number' ? varId : NaN);
              if (!isNaN(numVarId) && typeof numVarId === 'number') {
                // Preserve the original value type - can be number (optionId), string (text), or boolean
                normalizedBundleVariations[numVarId] = value;
              }
            }
            normalized.bundleItems.configurations[numBundleItemId] = normalizedBundleVariations;
          }
        }
      }
    }
    
    return normalized;
  }

  /**
   * Calculate cart totals
   * @param cartRegion - Cart region for determining currency
   */
  private async calculateTotals(cartId: number, items: CartItemWithProduct[], cartRegion?: 'us' | 'eu'): Promise<CartTotals> {
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

    // Determine currency from cart region
    const currency = cartRegion === 'eu' ? 'EUR' : 'USD';

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(totalDiscount * 100) / 100,
      shipping: Math.round(shipping * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
      currency,
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
      const deleteResult = await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
      
      // Clear applied coupons
      const deleteCouponsResult = await client.query('DELETE FROM cart_coupons WHERE cart_id = $1', [cartId]);
      
      // Update cart status to converted
      const updateResult = await client.query('UPDATE carts SET status = $1 WHERE id = $2', ['converted', cartId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error clearing cart after payment:', error);
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
      
      // Get cart items with product_id for product filtering
      const itemsResult = await client.query(
        `SELECT ci.product_id, ci.quantity, ci.total_price 
         FROM cart_items ci 
         WHERE ci.cart_id = $1`,
        [cartId]
      );
      
      if (itemsResult.rows.length === 0) {
        throw new ValidationError('Cannot apply coupon to empty cart');
      }
      
      // Calculate total cart subtotal (for minimum order amount check)
      const cartSubtotal = itemsResult.rows.reduce((sum, item) => 
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
      const cart = cartResult.rows[0];
      
      // Validate coupon region matches cart region
      if (coupon.region !== cart.region) {
        throw new ValidationError(
          `This coupon is only valid for ${coupon.region.toUpperCase()} region. Your cart is for ${cart.region.toUpperCase()} region.`
        );
      }
      
      // Parse product restrictions from JSONB
      const applicableProducts: number[] = coupon.applicable_products 
        ? (Array.isArray(coupon.applicable_products) ? coupon.applicable_products : JSON.parse(coupon.applicable_products))
        : [];
      const excludedProducts: number[] = coupon.excluded_products 
        ? (Array.isArray(coupon.excluded_products) ? coupon.excluded_products : JSON.parse(coupon.excluded_products))
        : [];
      
      // Filter eligible cart items based on product restrictions
      const eligibleItems = itemsResult.rows.filter(item => {
        const productId = item.product_id;
        
        // If applicable_products is set and not empty, product must be in the list
        if (applicableProducts.length > 0 && !applicableProducts.includes(productId)) {
          return false;
        }
        
        // If excluded_products is set and not empty, product must not be in the list
        if (excludedProducts.length > 0 && excludedProducts.includes(productId)) {
          return false;
        }
        
        return true;
      });
      
      if (eligibleItems.length === 0) {
        throw new ValidationError('This coupon cannot be applied to any products in your cart');
      }
      
      // Calculate subtotal only from eligible products (for discount calculation)
      const eligibleSubtotal = eligibleItems.reduce((sum, item) => 
        sum + parseFloat(item.total_price.toString()), 0
      );
      
      // Validate coupon dates
      const now = new Date();
      if (coupon.valid_from && new Date(coupon.valid_from) > now) {
        throw new ValidationError('Coupon is not yet valid');
      }
      
      if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        throw new ValidationError('Coupon has expired');
      }
      
      // Check minimum order amount against entire cart total, not just eligible products
      // This ensures customers meet the minimum threshold for the whole order
      if (coupon.minimum_order_amount && cartSubtotal < coupon.minimum_order_amount) {
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
      
      // Calculate discount based on eligible products only
      let discount = 0;
      if (coupon.discount_type === 'percentage') {
        discount = (eligibleSubtotal * coupon.discount_value) / 100;
      } else if (coupon.discount_type === 'fixed') {
        discount = coupon.discount_value;
      }
      
      // Apply maximum discount limit
      if (coupon.maximum_discount_amount && discount > coupon.maximum_discount_amount) {
        discount = coupon.maximum_discount_amount;
      }
      
      // Discount cannot exceed eligible products subtotal
      if (discount > eligibleSubtotal) {
        discount = eligibleSubtotal;
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

