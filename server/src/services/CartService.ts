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
   * Excludes converted carts (carts that have been cleared after payment)
   */
  async findCart(sessionId?: string, userId?: number): Promise<Cart | null> {
    try {
      let sql: string;
      let params: any[];

      if (userId) {
        // Logged-in user - find by user_id, excluding converted carts
        sql = `SELECT * FROM carts 
               WHERE user_id = $1 
               AND status != 'converted' 
               ORDER BY updated_at DESC LIMIT 1`;
        params = [userId];
      } else if (sessionId) {
        // Guest user - find by session_id, excluding converted carts
        sql = `SELECT * FROM carts 
               WHERE session_id = $1 
               AND user_id IS NULL 
               AND status != 'converted'
               ORDER BY updated_at DESC LIMIT 1`;
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

      // If cart is converted, return null so a new cart will be created on next operation
      if (cart.status === 'converted') {
        console.log(`Cart ${cart.id} is converted, returning null to trigger new cart creation`);
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
          p.id, p.name, p.sku, p.slug, p.stock, p.status, p.is_bundle,
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

      // Normalize configuration first
      const normalizedConfig = this.normalizeConfigurationForComparison(data.configuration);
      
      // Check available stock (considering reservations and variation stock)
      const availableStock = await this.stockReservationService.getAvailableStock(
        product.id, 
        normalizedConfig
      );
      
      if (data.quantity > availableStock) {
        throw new ValidationError(`Insufficient stock. Only ${availableStock} available`, {
          available: availableStock,
          requested: data.quantity
        });
      }

      // Track optional items that get removed due to stock
      let removedOptionalItems: string[] = [];
      
      // Check bundle items stock if this is a bundle product
      if (product.is_bundle && normalizedConfig.bundleItems) {
        console.log('========== BUNDLE STOCK VALIDATION ==========');
        
        // Get bundle items to identify required vs optional
        const allBundleItems = await this.bundleService.getBundleItems(product.id);
        const requiredBundleItemIds = allBundleItems.filter((item: any) => item.item_type === 'required').map((item: any) => item.id);
        const optionalBundleItemIds = allBundleItems.filter((item: any) => item.item_type === 'optional').map((item: any) => item.id);
        
        // Track original optional items before stock check
        const originalOptionalIds = [...(normalizedConfig.bundleItems.selectedOptional || [])];
        
        console.log('Required bundle item IDs:', requiredBundleItemIds);
        console.log('Optional bundle item IDs:', optionalBundleItemIds);
        
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
        
        console.log('Bundle configuration for stock check:', JSON.stringify(bundleConfig, null, 2));
        
        const bundleAvailability = await this.bundleService.checkBundleAvailability(
          product.id,
          bundleConfig
        );
        
        console.log('Bundle availability result:', JSON.stringify(bundleAvailability, null, 2));
        
        // Check required items - if any are out of stock, block add to cart
        const requiredItems = bundleAvailability.variationStock?.filter((item: any) => item.required) || [];
        const outOfStockRequired = requiredItems.filter((item: any) => item.available <= 0);
        
        if (outOfStockRequired.length > 0) {
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
          console.log('⚠️  Removing unavailable optional bundle items:', unavailableOptionals.map((item: any) => item.productName));
          
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
          
          console.log('Updated optional items:', availableOptionalIds);
          console.log('Removed items:', removedOptionalItems);
        }
        
        console.log('====================================================');
      }

      // Configuration already normalized above for stock checking
      // Now use it for price calculation
      console.log('========== CART SERVICE: PRICE CALCULATION ==========');
      console.log('Configuration for price calculation:', JSON.stringify(normalizedConfig, null, 2));
      console.log('Normalized Configuration:', JSON.stringify(normalizedConfig, null, 2));
      
      // Compare original vs normalized
      const originalStr = JSON.stringify(data.configuration);
      const normalizedStr = JSON.stringify(normalizedConfig);
      if (originalStr !== normalizedStr) {
        console.log('⚠️  Configuration was normalized (string keys converted to numbers)');
      } else {
        console.log('✓ Configuration was already in correct format');
      }
      
      console.log('--- Calling PriceCalculatorService ---');
      const priceCalc = await this.priceCalculator.calculatePrice(
        data.productId,
        normalizedConfig,
        data.quantity
      );

      const unitPrice = priceCalc.pricing.subtotal;
      const totalPrice = priceCalc.pricing.total;
      
      console.log('--- Price Calculation Results ---');
      console.log('Unit Price (subtotal):', unitPrice);
      console.log('Total Price (quantity × unit):', totalPrice);
      console.log('Price Breakdown:', JSON.stringify(priceCalc.breakdown, null, 2));
      console.log('Full Price Calculation:', JSON.stringify(priceCalc, null, 2));
      console.log('====================================================');

      console.log('CartService: Checking for existing item with configuration:', JSON.stringify(normalizedConfig));
      
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
      
      console.log('CartService: Found existing items:', existingResult.rows.length);

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
    if (config.colorId !== undefined) normalized.colorId = config.colorId;
    if (config.modelVariationId !== undefined) normalized.modelVariationId = config.modelVariationId;
    if (config.addons !== undefined) normalized.addons = config.addons;
    
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
      console.log(`📦 Clearing cart after payment: cart_id=${cartId}`);
      await client.query('BEGIN');

      // Clear cart items
      const deleteResult = await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
      console.log(`   Deleted ${deleteResult.rowCount} cart items`);
      
      // Clear applied coupons
      const deleteCouponsResult = await client.query('DELETE FROM cart_coupons WHERE cart_id = $1', [cartId]);
      console.log(`   Deleted ${deleteCouponsResult.rowCount} cart coupons`);
      
      // Update cart status to converted
      const updateResult = await client.query('UPDATE carts SET status = $1 WHERE id = $2', ['converted', cartId]);
      console.log(`   Updated cart status: ${updateResult.rowCount} row(s) affected`);

      await client.query('COMMIT');
      console.log(`✅ Cart ${cartId} successfully cleared and marked as converted`);
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

