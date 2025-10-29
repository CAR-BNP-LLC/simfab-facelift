# Phase 1: Database & Backend Core

**Status**: ⏳ Pending  
**Duration**: Week 1  
**Dependencies**: None  
**Priority**: High

---

## Overview

This phase establishes the foundation for the wishlist system by creating the database schema, backend models, services, controllers, and API routes.

---

## Objectives

- [ ] Create database migration for wishlist tables
- [ ] Create `WishlistModel` class with all CRUD operations
- [ ] Create `WishlistService` class with business logic
- [ ] Create `WishlistController` class with API handlers
- [ ] Create wishlist routes and register in main server
- [ ] Write unit tests for model and service
- [ ] Verify authentication middleware integration

---

## Database Schema

### Migration File

**File**: `server/src/migrations/sql/034_create_wishlist_tables.sql`

```sql
-- ============================================================================
-- Wishlist System Migration
-- Migration: 034_create_wishlist_tables.sql
-- Description: Creates tables for wishlist functionality with notifications
-- ============================================================================

-- Main wishlist table
CREATE TABLE IF NOT EXISTS wishlists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Notification preferences for this item
  notify_on_sale BOOLEAN DEFAULT true,
  notify_on_stock BOOLEAN DEFAULT true,
  
  -- Track notification history
  last_sale_notified_at TIMESTAMP,
  last_stock_notified_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one wishlist entry per user-product combination
  CONSTRAINT unique_user_product UNIQUE (user_id, product_id)
);

-- Wishlist notification log
CREATE TABLE IF NOT EXISTS wishlist_notifications (
  id SERIAL PRIMARY KEY,
  wishlist_id INTEGER NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  notification_type VARCHAR(20) NOT NULL,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP,
  email_log_id INTEGER REFERENCES email_logs(id),
  
  -- Product state at notification time
  product_price DECIMAL(10,2),
  product_sale_price DECIMAL(10,2),
  product_stock INTEGER,
  product_in_stock VARCHAR(1),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT wishlist_notifications_type_check CHECK (
    notification_type IN ('sale', 'stock')
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON wishlists(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_notify_sale ON wishlists(notify_on_sale, product_id) WHERE notify_on_sale = true;
CREATE INDEX IF NOT EXISTS idx_wishlists_notify_stock ON wishlists(notify_on_stock, product_id) WHERE notify_on_stock = true;
CREATE INDEX IF NOT EXISTS idx_wishlists_sale_check ON wishlists(notify_on_sale, product_id, last_sale_notified_at) WHERE notify_on_sale = true;
CREATE INDEX IF NOT EXISTS idx_wishlists_stock_check ON wishlists(notify_on_stock, product_id, last_stock_notified_at) WHERE notify_on_stock = true;

CREATE INDEX IF NOT EXISTS idx_wishlist_notifications_wishlist ON wishlist_notifications(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_notifications_type ON wishlist_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_wishlist_notifications_sent ON wishlist_notifications(email_sent, created_at);

-- Trigger for updated_at
CREATE TRIGGER update_wishlists_updated_at
  BEFORE UPDATE ON wishlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE wishlists IS 'User wishlist with notification preferences';
COMMENT ON TABLE wishlist_notifications IS 'Log of sent wishlist notifications';
```

---

## Backend Implementation

### 1. Wishlist Model

**File**: `server/src/models/wishlist.ts`

```typescript
import { Pool } from 'pg';
import { Product } from '../types/product';
import { ProductImage } from '../types/product';

export interface Wishlist {
  id?: number;
  user_id: number;
  product_id: number;
  notify_on_sale: boolean;
  notify_on_stock: boolean;
  last_sale_notified_at?: Date;
  last_stock_notified_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface WishlistWithProduct extends Wishlist {
  product: Product;
  product_images?: ProductImage[];
}

export interface WishlistNotification {
  id?: number;
  wishlist_id: number;
  notification_type: 'sale' | 'stock';
  email_sent: boolean;
  email_sent_at?: Date;
  email_log_id?: number;
  product_price?: number;
  product_sale_price?: number;
  product_stock?: number;
  product_in_stock?: string;
  created_at?: Date;
}

class WishlistModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get user's wishlist with full product details
   */
  async getWishlistByUserId(userId: number): Promise<WishlistWithProduct[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          w.*,
          json_build_object(
            'id', p.id,
            'sku', p.sku,
            'name', p.name,
            'slug', p.slug,
            'description', p.description,
            'short_description', p.short_description,
            'regular_price', p.regular_price,
            'sale_price', p.sale_price,
            'is_on_sale', p.is_on_sale,
            'stock', p.stock,
            'in_stock', p.in_stock,
            'status', p.status
          ) as product,
          COALESCE(
            (SELECT json_agg(row_to_json(pi))
             FROM (
               SELECT * FROM product_images 
               WHERE product_id = p.id 
               ORDER BY sort_order
             ) pi),
            '[]'::json
          ) as product_images
        FROM wishlists w
        INNER JOIN products p ON w.product_id = p.id
        WHERE w.user_id = $1
        ORDER BY w.created_at DESC
      `, [userId]);

      return result.rows.map(row => ({
        ...row,
        product: row.product,
        product_images: row.product_images || [],
        last_sale_notified_at: row.last_sale_notified_at ? new Date(row.last_sale_notified_at) : undefined,
        last_stock_notified_at: row.last_stock_notified_at ? new Date(row.last_stock_notified_at) : undefined,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Get specific wishlist item
   */
  async getWishlistItem(userId: number, productId: number): Promise<Wishlist | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM wishlists
        WHERE user_id = $1 AND product_id = $2
      `, [userId, productId]);

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        ...row,
        last_sale_notified_at: row.last_sale_notified_at ? new Date(row.last_sale_notified_at) : undefined,
        last_stock_notified_at: row.last_stock_notified_at ? new Date(row.last_stock_notified_at) : undefined,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Add product to wishlist
   */
  async addToWishlist(
    userId: number,
    productId: number,
    preferences?: {
      notify_on_sale?: boolean;
      notify_on_stock?: boolean;
    }
  ): Promise<Wishlist> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO wishlists (user_id, product_id, notify_on_sale, notify_on_stock)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, product_id)
        DO UPDATE SET
          notify_on_sale = COALESCE($3, wishlists.notify_on_sale),
          notify_on_stock = COALESCE($4, wishlists.notify_on_stock),
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [
        userId,
        productId,
        preferences?.notify_on_sale ?? true,
        preferences?.notify_on_stock ?? true
      ]);

      const row = result.rows[0];
      return {
        ...row,
        last_sale_notified_at: row.last_sale_notified_at ? new Date(row.last_sale_notified_at) : undefined,
        last_stock_notified_at: row.last_stock_notified_at ? new Date(row.last_stock_notified_at) : undefined,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Remove product from wishlist
   */
  async removeFromWishlist(userId: number, productId: number): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        DELETE FROM wishlists
        WHERE user_id = $1 AND product_id = $2
      `, [userId, productId]);
    } finally {
      client.release();
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    wishlistId: number,
    notify_on_sale?: boolean,
    notify_on_stock?: boolean
  ): Promise<Wishlist> {
    const client = await this.pool.connect();
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (notify_on_sale !== undefined) {
        updates.push(`notify_on_sale = $${paramIndex++}`);
        values.push(notify_on_sale);
      }

      if (notify_on_stock !== undefined) {
        updates.push(`notify_on_stock = $${paramIndex++}`);
        values.push(notify_on_stock);
      }

      if (updates.length === 0) {
        // Return existing record if no updates
        const result = await client.query('SELECT * FROM wishlists WHERE id = $1', [wishlistId]);
        const row = result.rows[0];
        return {
          ...row,
          last_sale_notified_at: row.last_sale_notified_at ? new Date(row.last_sale_notified_at) : undefined,
          last_stock_notified_at: row.last_stock_notified_at ? new Date(row.last_stock_notified_at) : undefined,
          created_at: new Date(row.created_at),
          updated_at: new Date(row.updated_at),
        };
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(wishlistId);

      const result = await client.query(`
        UPDATE wishlists
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `, values);

      const row = result.rows[0];
      return {
        ...row,
        last_sale_notified_at: row.last_sale_notified_at ? new Date(row.last_sale_notified_at) : undefined,
        last_stock_notified_at: row.last_stock_notified_at ? new Date(row.last_stock_notified_at) : undefined,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Check if product is in user's wishlist
   */
  async isInWishlist(userId: number, productId: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT EXISTS(
          SELECT 1 FROM wishlists
          WHERE user_id = $1 AND product_id = $2
        )
      `, [userId, productId]);

      return result.rows[0].exists;
    } finally {
      client.release();
    }
  }

  /**
   * Get wishlist count for user
   */
  async getWishlistCount(userId: number): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT COUNT(*) as count
        FROM wishlists
        WHERE user_id = $1
      `, [userId]);

      return parseInt(result.rows[0].count, 10);
    } finally {
      client.release();
    }
  }

  /**
   * Get products that need sale notifications
   */
  async getProductsNeedingSaleNotification(): Promise<WishlistWithProduct[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          w.*,
          json_build_object(
            'id', p.id,
            'sku', p.sku,
            'name', p.name,
            'slug', p.slug,
            'regular_price', p.regular_price,
            'sale_price', p.sale_price,
            'is_on_sale', p.is_on_sale,
            'sale_start_date', p.sale_start_date,
            'sale_end_date', p.sale_end_date
          ) as product
        FROM wishlists w
        INNER JOIN products p ON w.product_id = p.id
        WHERE w.notify_on_sale = true
          AND p.is_on_sale = true
          AND p.sale_price IS NOT NULL
          AND p.sale_price < p.regular_price
          AND (p.sale_start_date IS NULL OR p.sale_start_date <= CURRENT_TIMESTAMP)
          AND (p.sale_end_date IS NULL OR p.sale_end_date >= CURRENT_TIMESTAMP)
          AND (
            w.last_sale_notified_at IS NULL
            OR w.last_sale_notified_at < (
              SELECT created_at FROM products WHERE id = p.id
            )
          )
      `);

      return result.rows.map(row => ({
        ...row,
        product: row.product,
        last_sale_notified_at: row.last_sale_notified_at ? new Date(row.last_sale_notified_at) : undefined,
        last_stock_notified_at: row.last_stock_notified_at ? new Date(row.last_stock_notified_at) : undefined,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Get products that need stock notifications
   */
  async getProductsNeedingStockNotification(): Promise<WishlistWithProduct[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          w.*,
          json_build_object(
            'id', p.id,
            'sku', p.sku,
            'name', p.name,
            'slug', p.slug,
            'stock', p.stock,
            'in_stock', p.in_stock
          ) as product
        FROM wishlists w
        INNER JOIN products p ON w.product_id = p.id
        WHERE w.notify_on_stock = true
          AND p.in_stock = '1'
          AND p.stock > 0
          AND (
            w.last_stock_notified_at IS NULL
            OR w.last_stock_notified_at < p.updated_at
          )
      `);

      return result.rows.map(row => ({
        ...row,
        product: row.product,
        last_sale_notified_at: row.last_sale_notified_at ? new Date(row.last_sale_notified_at) : undefined,
        last_stock_notified_at: row.last_stock_notified_at ? new Date(row.last_stock_notified_at) : undefined,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Record notification sent
   */
  async recordNotification(
    notification: Omit<WishlistNotification, 'id' | 'created_at'>
  ): Promise<WishlistNotification> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO wishlist_notifications (
          wishlist_id, notification_type, email_sent, email_sent_at,
          email_log_id, product_price, product_sale_price, product_stock, product_in_stock
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        notification.wishlist_id,
        notification.notification_type,
        notification.email_sent,
        notification.email_sent_at || new Date(),
        notification.email_log_id || null,
        notification.product_price || null,
        notification.product_sale_price || null,
        notification.product_stock || null,
        notification.product_in_stock || null,
      ]);

      const row = result.rows[0];
      return {
        ...row,
        email_sent_at: row.email_sent_at ? new Date(row.email_sent_at) : undefined,
        created_at: new Date(row.created_at),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Update last notified timestamp
   */
  async updateLastNotified(wishlistId: number, type: 'sale' | 'stock'): Promise<void> {
    const client = await this.pool.connect();
    try {
      const field = type === 'sale' ? 'last_sale_notified_at' : 'last_stock_notified_at';
      await client.query(`
        UPDATE wishlists
        SET ${field} = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [wishlistId]);
    } finally {
      client.release();
    }
  }

  /**
   * Bulk check wishlist status for multiple products
   */
  async bulkCheckWishlistStatus(userId: number, productIds: number[]): Promise<Record<number, boolean>> {
    if (productIds.length === 0) return {};

    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT product_id
        FROM wishlists
        WHERE user_id = $1 AND product_id = ANY($2::int[])
      `, [userId, productIds]);

      const wishlistedIds = new Set(result.rows.map(row => row.product_id));
      const status: Record<number, boolean> = {};

      for (const productId of productIds) {
        status[productId] = wishlistedIds.has(productId);
      }

      return status;
    } finally {
      client.release();
    }
  }
}

export default WishlistModel;
```

### 2. Wishlist Service

**File**: `server/src/services/WishlistService.ts`

```typescript
import { Pool } from 'pg';
import WishlistModel, { Wishlist, WishlistWithProduct } from '../models/wishlist';
import { NotFoundError, ValidationError } from '../utils/errors';

export class WishlistService {
  private wishlistModel: WishlistModel;
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.wishlistModel = new WishlistModel(pool);
  }

  /**
   * Get user's wishlist with full product details
   */
  async getWishlist(userId: number): Promise<WishlistWithProduct[]> {
    return await this.wishlistModel.getWishlistByUserId(userId);
  }

  /**
   * Add product to wishlist
   */
  async addToWishlist(
    userId: number,
    productId: number,
    preferences?: { notify_on_sale?: boolean; notify_on_stock?: boolean }
  ): Promise<Wishlist> {
    // Verify product exists
    const client = await this.pool.connect();
    try {
      const productResult = await client.query('SELECT id FROM products WHERE id = $1', [productId]);
      if (productResult.rows.length === 0) {
        throw new NotFoundError('Product', { productId });
      }
    } finally {
      client.release();
    }

    return await this.wishlistModel.addToWishlist(userId, productId, preferences);
  }

  /**
   * Remove from wishlist
   */
  async removeFromWishlist(userId: number, productId: number): Promise<void> {
    const item = await this.wishlistModel.getWishlistItem(userId, productId);
    if (!item) {
      throw new NotFoundError('Wishlist item', { userId, productId });
    }

    await this.wishlistModel.removeFromWishlist(userId, productId);
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    wishlistId: number,
    userId: number,
    preferences: { notify_on_sale?: boolean; notify_on_stock?: boolean }
  ): Promise<Wishlist> {
    // Verify ownership
    const item = await this.wishlistModel.getWishlistItem(userId, 0); // We'll need to get by id
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT user_id FROM wishlists WHERE id = $1',
        [wishlistId]
      );
      if (result.rows.length === 0) {
        throw new NotFoundError('Wishlist item', { wishlistId });
      }
      if (result.rows[0].user_id !== userId) {
        throw new ValidationError('Unauthorized access to wishlist item');
      }
    } finally {
      client.release();
    }

    return await this.wishlistModel.updatePreferences(
      wishlistId,
      preferences.notify_on_sale,
      preferences.notify_on_stock
    );
  }

  /**
   * Check if product is wishlisted
   */
  async isWishlisted(userId: number, productId: number): Promise<boolean> {
    return await this.wishlistModel.isInWishlist(userId, productId);
  }

  /**
   * Get wishlist count
   */
  async getCount(userId: number): Promise<number> {
    return await this.wishlistModel.getWishlistCount(userId);
  }

  /**
   * Bulk check wishlist status
   */
  async bulkCheck(userId: number, productIds: number[]): Promise<Record<number, boolean>> {
    return await this.wishlistModel.bulkCheckWishlistStatus(userId, productIds);
  }
}
```

### 3. Wishlist Controller

**File**: `server/src/controllers/wishlistController.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { WishlistService } from '../services/WishlistService';
import { successResponse, errorResponse } from '../utils/response';

export class WishlistController {
  private wishlistService: WishlistService;
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.wishlistService = new WishlistService(pool);
  }

  /**
   * GET /api/wishlist
   * Get current user's wishlist
   */
  getWishlist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.session.userId;
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
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json(errorResponse('Unauthorized'));
        return;
      }

      const { productId, notifyOnSale, notifyOnStock } = req.body;

      if (!productId || typeof productId !== 'number') {
        res.status(400).json(errorResponse('Product ID is required'));
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
      const userId = req.session.userId;
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
      const userId = req.session.userId;
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
      const client = await this.pool.connect();
      let wishlistId: number;
      try {
        const result = await client.query(
          'SELECT id FROM wishlists WHERE user_id = $1 AND product_id = $2',
          [userId, productId]
        );
        if (result.rows.length === 0) {
          res.status(404).json(errorResponse('Wishlist item not found'));
          return;
        }
        wishlistId = result.rows[0].id;
      } finally {
        client.release();
      }

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
      const userId = req.session.userId;
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
      const userId = req.session.userId;
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
        const client = await this.pool.connect();
        try {
          const result = await client.query(
            'SELECT id FROM wishlists WHERE user_id = $1 AND product_id = $2',
            [userId, productId]
          );
          wishlistId = result.rows[0]?.id;
        } finally {
          client.release();
        }
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
      const userId = req.session.userId;
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
```

### 4. Wishlist Routes

**File**: `server/src/routes/wishlist.ts`

```typescript
import { Router } from 'express';
import { Pool } from 'pg';
import { WishlistController } from '../controllers/wishlistController';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/simfab_dev',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
const controller = new WishlistController(pool);

// All routes require authentication
router.use(requireAuth);

// Get wishlist
router.get('/', controller.getWishlist);

// Add to wishlist
router.post('/',
  validateRequest({
    body: {
      productId: { type: 'number', required: true },
      notifyOnSale: { type: 'boolean', required: false },
      notifyOnStock: { type: 'boolean', required: false }
    }
  }),
  controller.addToWishlist
);

// Remove from wishlist
router.delete('/:productId', controller.removeFromWishlist);

// Update preferences
router.put('/:productId/preferences',
  validateRequest({
    body: {
      notifyOnSale: { type: 'boolean', required: false },
      notifyOnStock: { type: 'boolean', required: false }
    }
  }),
  controller.updatePreferences
);

// Get count
router.get('/count', controller.getCount);

// Check single product (must come after /count route)
router.get('/:productId/check', controller.checkWishlist);

// Bulk check (query param: ?productIds=1,2,3,4)
router.get('/bulk-check', controller.bulkCheck);

export default router;
```

### 5. Register Routes

**File**: `server/src/index.ts` (add to existing routes)

```typescript
// Add this import
import wishlistRoutes from './routes/wishlist';

// Add this to your route registration
app.use('/api/wishlist', wishlistRoutes);
```

---

## Testing

### Unit Tests

**File**: `server/src/models/__tests__/wishlist.test.ts` (create test file)

Test all model methods:
- `getWishlistByUserId`
- `addToWishlist`
- `removeFromWishlist`
- `updatePreferences`
- `isInWishlist`
- `getWishlistCount`
- `bulkCheckWishlistStatus`

### Integration Tests

**File**: `server/src/routes/__tests__/wishlist.test.ts` (create test file)

Test all endpoints:
- GET `/api/wishlist`
- POST `/api/wishlist`
- DELETE `/api/wishlist/:productId`
- PUT `/api/wishlist/:productId/preferences`
- GET `/api/wishlist/count`
- GET `/api/wishlist/:productId/check`
- GET `/api/wishlist/bulk-check`

Test authentication requirements for all endpoints.

---

## API Documentation

### 1. Get Wishlist
```
GET /api/wishlist
Authorization: Required (Session cookie)
Response: {
  success: true,
  data: {
    items: [
      {
        id: 1,
        product_id: 123,
        notify_on_sale: true,
        notify_on_stock: true,
        created_at: "2024-01-01T00:00:00Z",
        product: { ...ProductWithDetails }
      }
    ],
    count: 10
  }
}
```

### 2. Add to Wishlist
```
POST /api/wishlist
Authorization: Required
Body: {
  productId: 123,
  notifyOnSale?: true,
  notifyOnStock?: true
}
Response: {
  success: true,
  data: {
    wishlist: { ...Wishlist },
    message: "Added to wishlist"
  }
}
```

### 3. Remove from Wishlist
```
DELETE /api/wishlist/:productId
Authorization: Required
Response: {
  success: true,
  message: "Removed from wishlist"
}
```

### 4. Update Preferences
```
PUT /api/wishlist/:productId/preferences
Authorization: Required
Body: {
  notifyOnSale?: false,
  notifyOnStock?: true
}
Response: {
  success: true,
  data: {
    wishlist: { ...Wishlist }
  }
}
```

### 5. Get Wishlist Count
```
GET /api/wishlist/count
Authorization: Required
Response: {
  success: true,
  data: {
    count: 10
  }
}
```

### 6. Check Wishlist Status
```
GET /api/wishlist/:productId/check
Authorization: Required
Response: {
  success: true,
  data: {
    isWishlisted: true,
    wishlistId: 1
  }
}
```

### 7. Bulk Check
```
GET /api/wishlist/bulk-check?productIds=1,2,3,4,5
Authorization: Required
Response: {
  success: true,
  data: {
    "1": true,
    "2": false,
    "3": true,
    "4": false,
    "5": false
  }
}
```

---

## Checklist

- [ ] Run migration: `034_create_wishlist_tables.sql`
- [ ] Create `WishlistModel` class
- [ ] Create `WishlistService` class
- [ ] Create `WishlistController` class
- [ ] Create wishlist routes
- [ ] Register routes in `server/src/index.ts`
- [ ] Verify authentication middleware works
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Test all API endpoints manually
- [ ] Verify database indexes are created
- [ ] Check error handling

---

## Next Steps

Once Phase 1 is complete, proceed to [Phase 2: Frontend Core](./PHASE_2_FRONTEND.md).

---

**Status**: Ready to implement  
**Estimated Time**: 2-3 days

