/**
 * Product Image Service
 * Manages product images and image uploads
 */

import { Pool } from 'pg';
import { ProductImage } from '../types/product';
import { NotFoundError, ValidationError } from '../utils/errors';
import path from 'path';
import fs from 'fs/promises';

export class ProductImageService {
  constructor(private pool: Pool) {}

  /**
   * Get all images for a product
   */
  async getImagesByProduct(productId: number): Promise<ProductImage[]> {
    const sql = `
      SELECT *
      FROM product_images
      WHERE product_id = $1
      ORDER BY sort_order
    `;

    const result = await this.pool.query(sql, [productId]);
    return result.rows;
  }

  /**
   * Get image by ID
   */
  async getImageById(id: number): Promise<ProductImage | null> {
    const sql = 'SELECT * FROM product_images WHERE id = $1';
    const result = await this.pool.query(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * Add image to product
   */
  async addImage(
    productId: number,
    imageUrl: string,
    altText?: string,
    isPrimary?: boolean
  ): Promise<ProductImage> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Verify product exists
      const productCheck = await client.query(
        'SELECT id FROM products WHERE id = $1',
        [productId]
      );

      if (productCheck.rows.length === 0) {
        throw new NotFoundError('Product', { productId });
      }

      // If setting as primary, unset other primary images
      if (isPrimary) {
        await client.query(
          'UPDATE product_images SET is_primary = false WHERE product_id = $1',
          [productId]
        );
      }

      // Get next sort order
      const sortOrderResult = await client.query(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM product_images WHERE product_id = $1',
        [productId]
      );
      const sortOrder = sortOrderResult.rows[0].next_order;

      const sql = `
        INSERT INTO product_images (
          product_id, image_url, alt_text, sort_order, is_primary
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const result = await client.query(sql, [
        productId,
        imageUrl,
        altText || null,
        sortOrder,
        isPrimary || false
      ]);

      await client.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundError) throw error;
      console.error('Error adding image:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update image metadata
   */
  async updateImage(
    id: number,
    data: {
      alt_text?: string;
      is_primary?: boolean;
      sort_order?: number;
    }
  ): Promise<ProductImage> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check image exists
      const image = await this.getImageById(id);
      if (!image) {
        throw new NotFoundError('Image', { imageId: id });
      }

      // If setting as primary, unset other primary images
      if (data.is_primary) {
        await client.query(
          'UPDATE product_images SET is_primary = false WHERE product_id = $1 AND id != $2',
          [image.product_id, id]
        );
      }

      // Build dynamic update
      const updates: string[] = [];
      const values: any[] = [];
      let paramCounter = 1;

      if (data.alt_text !== undefined) {
        updates.push(`alt_text = $${paramCounter++}`);
        values.push(data.alt_text);
      }
      if (data.is_primary !== undefined) {
        updates.push(`is_primary = $${paramCounter++}`);
        values.push(data.is_primary);
      }
      if (data.sort_order !== undefined) {
        updates.push(`sort_order = $${paramCounter++}`);
        values.push(data.sort_order);
      }

      if (updates.length === 0) {
        throw new ValidationError('No fields to update');
      }

      const sql = `
        UPDATE product_images
        SET ${updates.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING *
      `;

      values.push(id);
      const result = await client.query(sql, values);
      await client.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundError || error instanceof ValidationError) throw error;
      console.error('Error updating image:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Set primary image
   */
  async setPrimaryImage(imageId: number): Promise<ProductImage> {
    return this.updateImage(imageId, { is_primary: true });
  }

  /**
   * Delete image
   */
  async deleteImage(id: number): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get image details before deletion
      const image = await this.getImageById(id);
      if (!image) {
        throw new NotFoundError('Image', { imageId: id });
      }

      // Delete image from database
      await client.query('DELETE FROM product_images WHERE id = $1', [id]);

      // Try to delete physical file (don't fail if file doesn't exist)
      try {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        const filename = path.basename(image.image_url);
        const filePath = path.join(uploadsDir, filename);
        await fs.unlink(filePath);
      } catch (fileError) {
        console.warn('Could not delete physical file:', fileError);
        // Continue anyway - database record is deleted
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundError) throw error;
      console.error('Error deleting image:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reorder images
   */
  async reorderImages(productId: number, imageIds: number[]): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (let i = 0; i < imageIds.length; i++) {
        await client.query(
          'UPDATE product_images SET sort_order = $1 WHERE id = $2 AND product_id = $3',
          [i, imageIds[i], productId]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error reordering images:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get primary image for product
   */
  async getPrimaryImage(productId: number): Promise<ProductImage | null> {
    const sql = `
      SELECT *
      FROM product_images
      WHERE product_id = $1 AND is_primary = true
      LIMIT 1
    `;

    const result = await this.pool.query(sql, [productId]);
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // If no primary, return first image
    const firstImageSql = `
      SELECT *
      FROM product_images
      WHERE product_id = $1
      ORDER BY sort_order
      LIMIT 1
    `;

    const firstResult = await this.pool.query(firstImageSql, [productId]);
    return firstResult.rows[0] || null;
  }

  /**
   * Count images for product
   */
  async countImages(productId: number): Promise<number> {
    const sql = `
      SELECT COUNT(*)::int as count
      FROM product_images
      WHERE product_id = $1
    `;

    const result = await this.pool.query(sql, [productId]);
    return result.rows[0].count;
  }
}

