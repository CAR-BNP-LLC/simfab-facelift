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
    const item = await this.wishlistModel.getWishlistById(wishlistId, userId);
    if (!item) {
      throw new NotFoundError('Wishlist item', { wishlistId });
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

  /**
   * Get products needing sale notification (delegates to model)
   */
  async getProductsNeedingSaleNotification(): Promise<WishlistWithProduct[]> {
    return await this.wishlistModel.getProductsNeedingSaleNotification();
  }

  /**
   * Get products needing stock notification (delegates to model)
   */
  async getProductsNeedingStockNotification(): Promise<WishlistWithProduct[]> {
    return await this.wishlistModel.getProductsNeedingStockNotification();
  }
}

