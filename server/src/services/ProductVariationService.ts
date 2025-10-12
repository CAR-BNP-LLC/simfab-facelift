/**
 * Product Variation Service
 * Manages product variations (model types, dropdown options)
 */

import { Pool } from 'pg';
import { CreateVariationDto, ProductVariation, VariationOption } from '../types/product';
import { NotFoundError, ValidationError } from '../utils/errors';

export class ProductVariationService {
  constructor(private pool: Pool) {}

  /**
   * Get all variations for a product
   */
  async getVariationsByProduct(productId: number): Promise<ProductVariation[]> {
    const sql = `
      SELECT 
        v.*,
        COALESCE(
          (SELECT json_agg(vo ORDER BY vo.sort_order)
           FROM variation_options vo
           WHERE vo.variation_id = v.id),
          '[]'::json
        ) as options
      FROM product_variations v
      WHERE v.product_id = $1
      ORDER BY v.sort_order
    `;

    const result = await this.pool.query(sql, [productId]);
    return result.rows;
  }

  /**
   * Get variation by ID with options
   */
  async getVariationById(id: number): Promise<(ProductVariation & { options: VariationOption[] }) | null> {
    const sql = `
      SELECT 
        v.*,
        COALESCE(
          (SELECT json_agg(vo ORDER BY vo.sort_order)
           FROM variation_options vo
           WHERE vo.variation_id = v.id),
          '[]'::json
        ) as options
      FROM product_variations v
      WHERE v.id = $1
    `;

    const result = await this.pool.query(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * Create variation with options
   */
  async createVariation(data: CreateVariationDto): Promise<ProductVariation> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Verify product exists
      const productCheck = await client.query(
        'SELECT id FROM products WHERE id = $1',
        [data.product_id]
      );

      if (productCheck.rows.length === 0) {
        throw new NotFoundError('Product', { productId: data.product_id });
      }

      // Create variation
      const variationSql = `
        INSERT INTO product_variations (
          product_id, variation_type, name, description, is_required, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const variationResult = await client.query(variationSql, [
        data.product_id,
        data.variation_type,
        data.name,
        data.description || null,
        data.is_required ?? true,
        data.sort_order || 0
      ]);

      const variation = variationResult.rows[0];

      // Create options
      if (data.options && data.options.length > 0) {
        const optionsSql = `
          INSERT INTO variation_options (
            variation_id, option_name, option_value, price_adjustment,
            image_url, is_default, sort_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;

        for (let i = 0; i < data.options.length; i++) {
          const option = data.options[i];
          await client.query(optionsSql, [
            variation.id,
            option.option_name,
            option.option_value,
            option.price_adjustment || 0,
            option.image_url || null,
            option.is_default || (i === 0), // First option is default if not specified
            i
          ]);
        }
      }

      await client.query('COMMIT');

      return this.getVariationById(variation.id) as Promise<ProductVariation>;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundError) throw error;
      console.error('Error creating variation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update variation
   */
  async updateVariation(
    id: number,
    data: Partial<Omit<CreateVariationDto, 'product_id' | 'options'>>
  ): Promise<ProductVariation> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check variation exists
      const checkResult = await client.query(
        'SELECT id FROM product_variations WHERE id = $1',
        [id]
      );

      if (checkResult.rows.length === 0) {
        throw new NotFoundError('Variation', { variationId: id });
      }

      // Build dynamic update
      const updates: string[] = [];
      const values: any[] = [];
      let paramCounter = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramCounter++}`);
        values.push(data.name);
      }
      if (data.description !== undefined) {
        updates.push(`description = $${paramCounter++}`);
        values.push(data.description);
      }
      if (data.variation_type !== undefined) {
        updates.push(`variation_type = $${paramCounter++}`);
        values.push(data.variation_type);
      }
      if (data.is_required !== undefined) {
        updates.push(`is_required = $${paramCounter++}`);
        values.push(data.is_required);
      }
      if (data.sort_order !== undefined) {
        updates.push(`sort_order = $${paramCounter++}`);
        values.push(data.sort_order);
      }

      if (updates.length === 0) {
        throw new ValidationError('No fields to update');
      }

      const sql = `
        UPDATE product_variations
        SET ${updates.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING *
      `;

      values.push(id);
      await client.query(sql, values);
      await client.query('COMMIT');

      return this.getVariationById(id) as Promise<ProductVariation>;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundError || error instanceof ValidationError) throw error;
      console.error('Error updating variation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete variation
   */
  async deleteVariation(id: number): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM product_variations WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Variation', { variationId: id });
    }
  }

  /**
   * Add option to variation
   */
  async addOption(
    variationId: number,
    option: {
      option_name: string;
      option_value: string;
      price_adjustment?: number;
      image_url?: string;
      is_default?: boolean;
    }
  ): Promise<VariationOption> {
    // Verify variation exists
    const variation = await this.getVariationById(variationId);
    if (!variation) {
      throw new NotFoundError('Variation', { variationId });
    }

    const sql = `
      INSERT INTO variation_options (
        variation_id, option_name, option_value, price_adjustment,
        image_url, is_default, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, (
        SELECT COALESCE(MAX(sort_order), -1) + 1
        FROM variation_options
        WHERE variation_id = $1
      ))
      RETURNING *
    `;

    const result = await this.pool.query(sql, [
      variationId,
      option.option_name,
      option.option_value,
      option.price_adjustment || 0,
      option.image_url || null,
      option.is_default || false
    ]);

    return result.rows[0];
  }

  /**
   * Update option
   */
  async updateOption(
    optionId: number,
    data: Partial<{
      option_name: string;
      option_value: string;
      price_adjustment: number;
      image_url: string;
      is_default: boolean;
      sort_order: number;
    }>
  ): Promise<VariationOption> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check option exists
      const checkResult = await client.query(
        'SELECT id FROM variation_options WHERE id = $1',
        [optionId]
      );

      if (checkResult.rows.length === 0) {
        throw new NotFoundError('Option', { optionId });
      }

      // Build dynamic update
      const updates: string[] = [];
      const values: any[] = [];
      let paramCounter = 1;

      if (data.option_name !== undefined) {
        updates.push(`option_name = $${paramCounter++}`);
        values.push(data.option_name);
      }
      if (data.option_value !== undefined) {
        updates.push(`option_value = $${paramCounter++}`);
        values.push(data.option_value);
      }
      if (data.price_adjustment !== undefined) {
        updates.push(`price_adjustment = $${paramCounter++}`);
        values.push(data.price_adjustment);
      }
      if (data.image_url !== undefined) {
        updates.push(`image_url = $${paramCounter++}`);
        values.push(data.image_url);
      }
      if (data.is_default !== undefined) {
        updates.push(`is_default = $${paramCounter++}`);
        values.push(data.is_default);
      }
      if (data.sort_order !== undefined) {
        updates.push(`sort_order = $${paramCounter++}`);
        values.push(data.sort_order);
      }

      if (updates.length === 0) {
        throw new ValidationError('No fields to update');
      }

      const sql = `
        UPDATE variation_options
        SET ${updates.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING *
      `;

      values.push(optionId);
      const result = await client.query(sql, values);
      await client.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundError || error instanceof ValidationError) throw error;
      console.error('Error updating option:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete option
   */
  async deleteOption(optionId: number): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM variation_options WHERE id = $1',
      [optionId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Option', { optionId });
    }
  }

  /**
   * Reorder variation options
   */
  async reorderOptions(variationId: number, optionIds: number[]): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (let i = 0; i < optionIds.length; i++) {
        await client.query(
          'UPDATE variation_options SET sort_order = $1 WHERE id = $2 AND variation_id = $3',
          [i, optionIds[i], variationId]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error reordering options:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

