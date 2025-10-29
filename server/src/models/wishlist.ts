import { Pool } from 'pg';
import { Product } from '../types/product';

export interface ProductImage {
  id: number;
  product_id: number;
  image_url: string;
  alt_text?: string;
  sort_order: number;
  is_primary: boolean;
  created_at: Date;
}

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
            'type', p.type,
            'status', p.status,
            'featured', p.featured,
            'regular_price', p.regular_price,
            'sale_price', p.sale_price,
            'is_on_sale', COALESCE(p.is_on_sale, false),
            'sale_start_date', p.sale_start_date,
            'sale_end_date', p.sale_end_date,
            'stock', p.stock,
            'in_stock', p.in_stock,
            'created_at', p.created_at,
            'updated_at', p.updated_at
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
        id: row.id,
        user_id: row.user_id,
        product_id: row.product_id,
        notify_on_sale: row.notify_on_sale,
        notify_on_stock: row.notify_on_stock,
        last_sale_notified_at: row.last_sale_notified_at ? new Date(row.last_sale_notified_at) : undefined,
        last_stock_notified_at: row.last_stock_notified_at ? new Date(row.last_stock_notified_at) : undefined,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
        product: {
          ...row.product,
          created_at: new Date(row.product.created_at),
          updated_at: new Date(row.product.updated_at),
        } as Product,
        product_images: row.product_images || [],
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
        id: row.id,
        user_id: row.user_id,
        product_id: row.product_id,
        notify_on_sale: row.notify_on_sale,
        notify_on_stock: row.notify_on_stock,
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
   * Get wishlist item by ID
   */
  async getWishlistById(wishlistId: number, userId: number): Promise<Wishlist | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM wishlists
        WHERE id = $1 AND user_id = $2
      `, [wishlistId, userId]);

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        user_id: row.user_id,
        product_id: row.product_id,
        notify_on_sale: row.notify_on_sale,
        notify_on_stock: row.notify_on_stock,
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
        id: row.id,
        user_id: row.user_id,
        product_id: row.product_id,
        notify_on_sale: row.notify_on_sale,
        notify_on_stock: row.notify_on_stock,
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
          id: row.id,
          user_id: row.user_id,
          product_id: row.product_id,
          notify_on_sale: row.notify_on_sale,
          notify_on_stock: row.notify_on_stock,
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
        id: row.id,
        user_id: row.user_id,
        product_id: row.product_id,
        notify_on_sale: row.notify_on_sale,
        notify_on_stock: row.notify_on_stock,
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
        ) as exists
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
        SELECT COUNT(*)::int as count
        FROM wishlists
        WHERE user_id = $1
      `, [userId]);

      return result.rows[0].count;
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
            'is_on_sale', COALESCE(p.is_on_sale, false),
            'sale_start_date', p.sale_start_date,
            'sale_end_date', p.sale_end_date
          ) as product
        FROM wishlists w
        INNER JOIN products p ON w.product_id = p.id
        WHERE w.notify_on_sale = true
          AND COALESCE(p.is_on_sale, false) = true
          AND p.sale_price IS NOT NULL
          AND p.regular_price IS NOT NULL
          AND p.sale_price < p.regular_price
          AND (p.sale_start_date IS NULL OR p.sale_start_date <= CURRENT_TIMESTAMP)
          AND (p.sale_end_date IS NULL OR p.sale_end_date >= CURRENT_TIMESTAMP)
          AND (
            w.last_sale_notified_at IS NULL
            OR w.last_sale_notified_at < p.updated_at
          )
      `);

      return result.rows.map(row => ({
        id: row.id,
        user_id: row.user_id,
        product_id: row.product_id,
        notify_on_sale: row.notify_on_sale,
        notify_on_stock: row.notify_on_stock,
        last_sale_notified_at: row.last_sale_notified_at ? new Date(row.last_sale_notified_at) : undefined,
        last_stock_notified_at: row.last_stock_notified_at ? new Date(row.last_stock_notified_at) : undefined,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
        product: row.product as any,
        product_images: [],
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
          AND COALESCE(p.stock, 0) > 0
          AND (
            w.last_stock_notified_at IS NULL
            OR w.last_stock_notified_at < p.updated_at
          )
      `);

      return result.rows.map(row => ({
        id: row.id,
        user_id: row.user_id,
        product_id: row.product_id,
        notify_on_sale: row.notify_on_sale,
        notify_on_stock: row.notify_on_stock,
        last_sale_notified_at: row.last_sale_notified_at ? new Date(row.last_sale_notified_at) : undefined,
        last_stock_notified_at: row.last_stock_notified_at ? new Date(row.last_stock_notified_at) : undefined,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
        product: row.product as any,
        product_images: [],
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
        id: row.id,
        wishlist_id: row.wishlist_id,
        notification_type: row.notification_type,
        email_sent: row.email_sent,
        email_sent_at: row.email_sent_at ? new Date(row.email_sent_at) : undefined,
        email_log_id: row.email_log_id || undefined,
        product_price: row.product_price || undefined,
        product_sale_price: row.product_sale_price || undefined,
        product_stock: row.product_stock || undefined,
        product_in_stock: row.product_in_stock || undefined,
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

