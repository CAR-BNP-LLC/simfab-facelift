/**
 * Product Color Service
 * Manages product color variations
 */

import { Pool } from 'pg';
import { CreateColorDto, ProductColor } from '../types/product';
import { NotFoundError, ValidationError } from '../utils/errors';

export class ProductColorService {
  constructor(private pool: Pool) {}

  /**
   * Get all colors for a product
   */
  async getColorsByProduct(productId: number): Promise<ProductColor[]> {
    const sql = `
      SELECT *
      FROM product_colors
      WHERE product_id = $1
      ORDER BY sort_order
    `;

    const result = await this.pool.query(sql, [productId]);
    return result.rows;
  }

  /**
   * Get color by ID
   */
  async getColorById(id: number): Promise<ProductColor | null> {
    const sql = 'SELECT * FROM product_colors WHERE id = $1';
    const result = await this.pool.query(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * Create color
   */
  async createColor(data: CreateColorDto): Promise<ProductColor> {
    try {
      // Verify product exists
      const productCheck = await this.pool.query(
        'SELECT id FROM products WHERE id = $1',
        [data.product_id]
      );

      if (productCheck.rows.length === 0) {
        throw new NotFoundError('Product', { productId: data.product_id });
      }

      const sql = `
        INSERT INTO product_colors (
          product_id, color_name, color_code, color_image_url,
          is_available, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await this.pool.query(sql, [
        data.product_id,
        data.color_name,
        data.color_code || null,
        data.color_image_url || null,
        data.is_available ?? true,
        data.sort_order || 0
      ]);

      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.error('Error creating color:', error);
      throw error;
    }
  }

  /**
   * Update color
   */
  async updateColor(
    id: number,
    data: Partial<Omit<CreateColorDto, 'product_id'>>
  ): Promise<ProductColor> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check color exists
      const checkResult = await client.query(
        'SELECT id FROM product_colors WHERE id = $1',
        [id]
      );

      if (checkResult.rows.length === 0) {
        throw new NotFoundError('Color', { colorId: id });
      }

      // Build dynamic update
      const updates: string[] = [];
      const values: any[] = [];
      let paramCounter = 1;

      if (data.color_name !== undefined) {
        updates.push(`color_name = $${paramCounter++}`);
        values.push(data.color_name);
      }
      if (data.color_code !== undefined) {
        updates.push(`color_code = $${paramCounter++}`);
        values.push(data.color_code);
      }
      if (data.color_image_url !== undefined) {
        updates.push(`color_image_url = $${paramCounter++}`);
        values.push(data.color_image_url);
      }
      if (data.is_available !== undefined) {
        updates.push(`is_available = $${paramCounter++}`);
        values.push(data.is_available);
      }
      if (data.sort_order !== undefined) {
        updates.push(`sort_order = $${paramCounter++}`);
        values.push(data.sort_order);
      }

      if (updates.length === 0) {
        throw new ValidationError('No fields to update');
      }

      const sql = `
        UPDATE product_colors
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
      console.error('Error updating color:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete color
   */
  async deleteColor(id: number): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM product_colors WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Color', { colorId: id });
    }
  }

  /**
   * Reorder colors
   */
  async reorderColors(productId: number, colorIds: number[]): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (let i = 0; i < colorIds.length; i++) {
        await client.query(
          'UPDATE product_colors SET sort_order = $1 WHERE id = $2 AND product_id = $3',
          [i, colorIds[i], productId]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error reordering colors:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Toggle color availability
   */
  async toggleAvailability(id: number): Promise<ProductColor> {
    const color = await this.getColorById(id);
    if (!color) {
      throw new NotFoundError('Color', { colorId: id });
    }

    const sql = `
      UPDATE product_colors
      SET is_available = NOT is_available
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(sql, [id]);
    return result.rows[0];
  }
}

