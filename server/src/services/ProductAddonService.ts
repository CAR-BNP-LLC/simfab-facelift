/**
 * Product Addon Service
 * Manages optional product add-ons and their options
 */

import { Pool } from 'pg';
import { CreateAddonDto, ProductAddon, AddonOption } from '../types/product';
import { NotFoundError, ValidationError } from '../utils/errors';

export class ProductAddonService {
  constructor(private pool: Pool) {}

  /**
   * Get all add-ons for a product
   */
  async getAddonsByProduct(productId: number): Promise<(ProductAddon & { options: AddonOption[] })[]> {
    const sql = `
      SELECT 
        a.*,
        COALESCE(
          (SELECT json_agg(ao ORDER BY ao.sort_order)
           FROM addon_options ao
           WHERE ao.addon_id = a.id),
          '[]'::json
        ) as options
      FROM product_addons a
      WHERE a.product_id = $1
      ORDER BY a.sort_order
    `;

    const result = await this.pool.query(sql, [productId]);
    return result.rows;
  }

  /**
   * Get addon by ID with options
   */
  async getAddonById(id: number): Promise<(ProductAddon & { options: AddonOption[] }) | null> {
    const sql = `
      SELECT 
        a.*,
        COALESCE(
          (SELECT json_agg(ao ORDER BY ao.sort_order)
           FROM addon_options ao
           WHERE ao.addon_id = a.id),
          '[]'::json
        ) as options
      FROM product_addons a
      WHERE a.id = $1
    `;

    const result = await this.pool.query(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * Create addon with options
   */
  async createAddon(data: CreateAddonDto): Promise<ProductAddon & { options: AddonOption[] }> {
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

      // Create addon
      const addonSql = `
        INSERT INTO product_addons (
          product_id, name, description, base_price,
          price_range_min, price_range_max, is_required,
          has_options, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const addonResult = await client.query(addonSql, [
        data.product_id,
        data.name,
        data.description || null,
        data.base_price || null,
        data.price_range_min || null,
        data.price_range_max || null,
        data.is_required || false,
        data.has_options || false,
        data.sort_order || 0
      ]);

      const addon = addonResult.rows[0];

      // Create options if provided
      if (data.options && data.options.length > 0) {
        const optionsSql = `
          INSERT INTO addon_options (
            addon_id, name, description, price, image_url, is_available, sort_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;

        for (let i = 0; i < data.options.length; i++) {
          const option = data.options[i];
          await client.query(optionsSql, [
            addon.id,
            option.name,
            option.description || null,
            option.price,
            option.image_url || null,
            option.is_available ?? true,
            i
          ]);
        }
      }

      await client.query('COMMIT');

      return this.getAddonById(addon.id) as Promise<ProductAddon & { options: AddonOption[] }>;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundError) throw error;
      console.error('Error creating addon:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update addon
   */
  async updateAddon(
    id: number,
    data: Partial<Omit<CreateAddonDto, 'product_id' | 'options'>>
  ): Promise<ProductAddon & { options: AddonOption[] }> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check addon exists
      const checkResult = await client.query(
        'SELECT id FROM product_addons WHERE id = $1',
        [id]
      );

      if (checkResult.rows.length === 0) {
        throw new NotFoundError('Addon', { addonId: id });
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
      if (data.base_price !== undefined) {
        updates.push(`base_price = $${paramCounter++}`);
        values.push(data.base_price);
      }
      if (data.price_range_min !== undefined) {
        updates.push(`price_range_min = $${paramCounter++}`);
        values.push(data.price_range_min);
      }
      if (data.price_range_max !== undefined) {
        updates.push(`price_range_max = $${paramCounter++}`);
        values.push(data.price_range_max);
      }
      if (data.is_required !== undefined) {
        updates.push(`is_required = $${paramCounter++}`);
        values.push(data.is_required);
      }
      if (data.has_options !== undefined) {
        updates.push(`has_options = $${paramCounter++}`);
        values.push(data.has_options);
      }
      if (data.sort_order !== undefined) {
        updates.push(`sort_order = $${paramCounter++}`);
        values.push(data.sort_order);
      }

      if (updates.length === 0) {
        throw new ValidationError('No fields to update');
      }

      const sql = `
        UPDATE product_addons
        SET ${updates.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING *
      `;

      values.push(id);
      await client.query(sql, values);
      await client.query('COMMIT');

      return this.getAddonById(id) as Promise<ProductAddon & { options: AddonOption[] }>;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundError || error instanceof ValidationError) throw error;
      console.error('Error updating addon:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete addon
   */
  async deleteAddon(id: number): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM product_addons WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Addon', { addonId: id });
    }
  }

  /**
   * Add option to addon
   */
  async addOption(
    addonId: number,
    option: {
      name: string;
      description?: string;
      price: number;
      image_url?: string;
      is_available?: boolean;
    }
  ): Promise<AddonOption> {
    // Verify addon exists
    const addon = await this.getAddonById(addonId);
    if (!addon) {
      throw new NotFoundError('Addon', { addonId });
    }

    const sql = `
      INSERT INTO addon_options (
        addon_id, name, description, price, image_url, is_available, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, (
        SELECT COALESCE(MAX(sort_order), -1) + 1
        FROM addon_options
        WHERE addon_id = $1
      ))
      RETURNING *
    `;

    const result = await this.pool.query(sql, [
      addonId,
      option.name,
      option.description || null,
      option.price,
      option.image_url || null,
      option.is_available ?? true
    ]);

    return result.rows[0];
  }

  /**
   * Update addon option
   */
  async updateOption(
    optionId: number,
    data: Partial<{
      name: string;
      description: string;
      price: number;
      image_url: string;
      is_available: boolean;
      sort_order: number;
    }>
  ): Promise<AddonOption> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check option exists
      const checkResult = await client.query(
        'SELECT id FROM addon_options WHERE id = $1',
        [optionId]
      );

      if (checkResult.rows.length === 0) {
        throw new NotFoundError('Option', { optionId });
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
      if (data.price !== undefined) {
        updates.push(`price = $${paramCounter++}`);
        values.push(data.price);
      }
      if (data.image_url !== undefined) {
        updates.push(`image_url = $${paramCounter++}`);
        values.push(data.image_url);
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
        UPDATE addon_options
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
   * Delete addon option
   */
  async deleteOption(optionId: number): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM addon_options WHERE id = $1',
      [optionId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Option', { optionId });
    }
  }

  /**
   * Reorder addon options
   */
  async reorderOptions(addonId: number, optionIds: number[]): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (let i = 0; i < optionIds.length; i++) {
        await client.query(
          'UPDATE addon_options SET sort_order = $1 WHERE id = $2 AND addon_id = $3',
          [i, optionIds[i], addonId]
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

