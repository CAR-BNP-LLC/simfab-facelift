/**
 * Bundle Service
 * Manages bundle product composition and availability checking
 */

import { Pool } from 'pg';
import { NotFoundError, ValidationError } from '../utils/errors';
import {
  ProductBundleItem,
  ProductConfiguration,
  StockCheckResult
} from '../types/product';
import { VariationStockService } from './VariationStockService';

export class BundleService {
  private variationStockService: VariationStockService;

  constructor(private pool: Pool) {
    this.variationStockService = new VariationStockService(pool);
  }

  /**
   * Get all bundle items for a bundle product
   */
  async getBundleItems(bundleProductId: number): Promise<ProductBundleItem[]> {
    const result = await this.pool.query(
      `SELECT bi.*, p.name as item_product_name, p.slug as item_product_slug
       FROM product_bundle_items bi
       JOIN products p ON p.id = bi.item_product_id
       WHERE bi.bundle_product_id = $1
       ORDER BY bi.item_type DESC, bi.sort_order ASC`,
      [bundleProductId]
    );

    return result.rows;
  }

  /**
   * Add item to bundle
   */
  async addBundleItem(
    bundleProductId: number,
    itemProductId: number,
    config: {
      quantity?: number;
      item_type?: 'required' | 'optional';
      is_configurable?: boolean;
      price_adjustment?: number;
      display_name?: string;
      description?: string;
    }
  ): Promise<ProductBundleItem> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Verify bundle product exists
      const bundleCheck = await client.query(
        'SELECT id, is_bundle FROM products WHERE id = $1',
        [bundleProductId]
      );

      if (bundleCheck.rows.length === 0) {
        throw new NotFoundError('Product', { productId: bundleProductId });
      }

      // Automatically mark product as bundle if it's not already
      if (!bundleCheck.rows[0].is_bundle) {
        await client.query(
          'UPDATE products SET is_bundle = true WHERE id = $1',
          [bundleProductId]
        );
      }

      // Verify item product exists
      const itemCheck = await client.query(
        'SELECT id FROM products WHERE id = $1',
        [itemProductId]
      );

      if (itemCheck.rows.length === 0) {
        throw new NotFoundError('Product', { productId: itemProductId });
      }

      // Check for duplicate
      const duplicate = await client.query(
        'SELECT id FROM product_bundle_items WHERE bundle_product_id = $1 AND item_product_id = $2',
        [bundleProductId, itemProductId]
      );

      if (duplicate.rows.length > 0) {
        throw new ValidationError('Item already in bundle');
      }

      // Get max sort order
      const sortResult = await client.query(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 as sort_order
         FROM product_bundle_items 
         WHERE bundle_product_id = $1 AND item_type = $2`,
        [bundleProductId, config.item_type || 'required']
      );

      const sortOrder = sortResult.rows[0].sort_order;

      // Insert bundle item
      const result = await client.query(
        `INSERT INTO product_bundle_items (
          bundle_product_id, item_product_id, quantity, item_type,
          is_configurable, price_adjustment, display_name, description, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          bundleProductId,
          itemProductId,
          config.quantity || 1,
          config.item_type || 'required',
          config.is_configurable || false,
          config.price_adjustment || 0,
          config.display_name || null,
          config.description || null,
          sortOrder
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error('Error adding bundle item:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update bundle item
   */
  async updateBundleItem(
    bundleItemId: number,
    updates: Partial<ProductBundleItem>
  ): Promise<ProductBundleItem> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const fields: string[] = [];
      const values: any[] = [];
      let paramCounter = 1;

      const allowedFields = [
        'quantity',
        'item_type',
        'is_configurable',
        'price_adjustment',
        'display_name',
        'description',
        'sort_order'
      ];

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
          fields.push(`${key} = $${paramCounter++}`);
          values.push(value);
        }
      }

      if (fields.length === 0) {
        throw new ValidationError('No valid fields to update');
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(bundleItemId);

      const result = await client.query(
        `UPDATE product_bundle_items
         SET ${fields.join(', ')}
         WHERE id = $${paramCounter}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Bundle Item', { bundleItemId });
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error('Error updating bundle item:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Remove item from bundle
   */
  async removeBundleItem(bundleItemId: number): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM product_bundle_items WHERE id = $1',
      [bundleItemId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Bundle Item', { bundleItemId });
    }
  }

  /**
   * Check bundle availability with configuration
   */
  async checkBundleAvailability(
    bundleProductId: number,
    configuration: {
      requiredItems?: Record<number, ProductConfiguration>;
      optionalItems?: number[];
    }
  ): Promise<StockCheckResult> {
    const bundleItems = await this.getBundleItems(bundleProductId);
    
    const requiredItems = bundleItems.filter(item => item.item_type === 'required');
    const optionalItems = bundleItems.filter(item => item.item_type === 'optional');
    const selectedOptionals = configuration.optionalItems || [];

    let minAvailable = Infinity;
    const itemStock: any[] = [];

    // Check required items
    for (const item of requiredItems) {
      const itemConfig = configuration.requiredItems?.[item.id] || {};
      const availability = await this.variationStockService.checkAvailability(
        item.item_product_id,
        itemConfig
      );

      const itemAvailable = availability.availableQuantity;
      minAvailable = Math.min(minAvailable, itemAvailable);

      itemStock.push({
        productId: item.item_product_id,
        productName: item.display_name || `Item ${item.id}`,
        available: itemAvailable,
        required: true
      });
    }

    // Check selected optional items
    for (const itemId of selectedOptionals) {
      const item = optionalItems.find(i => i.id === itemId);
      if (!item) continue;

      const itemConfig = configuration.requiredItems?.[item.id] || {};
      const availability = await this.variationStockService.checkAvailability(
        item.item_product_id,
        itemConfig
      );

      const itemAvailable = availability.availableQuantity;
      minAvailable = Math.min(minAvailable, itemAvailable);

      itemStock.push({
        productId: item.item_product_id,
        productName: item.display_name || `Item ${item.id}`,
        available: itemAvailable,
        required: false
      });
    }

    return {
      available: minAvailable > 0,
      availableQuantity: Math.max(0, minAvailable),
      variationStock: itemStock
    };
  }

  /**
   * Validate bundle configuration
   */
  async validateBundleConfiguration(
    bundleProductId: number,
    configuration: any
  ): Promise<{ valid: boolean; errors: string[] }> {
    const bundleItems = await this.getBundleItems(bundleProductId);
    const errors: string[] = [];

    // Check all required items have configuration
    const requiredItems = bundleItems.filter(item => item.item_type === 'required');
    
    for (const item of requiredItems) {
      if (item.is_configurable && !configuration.requiredItems?.[item.id]) {
        errors.push(`Configuration required for ${item.display_name || 'required item'}`);
      }
    }

    // Validate optional items exist
    if (configuration.optionalItems) {
      const optionalIds = bundleItems
        .filter(item => item.item_type === 'optional')
        .map(item => item.id);

      for (const itemId of configuration.optionalItems) {
        if (!optionalIds.includes(itemId)) {
          errors.push(`Invalid optional item: ${itemId}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Reorder bundle items
   */
  async reorderBundleItems(
    bundleProductId: number,
    itemIds: number[],
    itemType: 'required' | 'optional'
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (let i = 0; i < itemIds.length; i++) {
        await client.query(
          `UPDATE product_bundle_items 
           SET sort_order = $1 
           WHERE id = $2 AND bundle_product_id = $3 AND item_type = $4`,
          [i, itemIds[i], bundleProductId, itemType]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error reordering bundle items:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}
