/**
 * Shared Config Service
 * Handles creation and retrieval of shared product configurations
 */

import { Pool } from 'pg';
import { randomBytes } from 'crypto';
import { ProductConfiguration } from '../types/product';
import { NotFoundError, ValidationError } from '../utils/errors';
import { ProductService } from './ProductService';

export interface SharedConfig {
  id: number;
  short_code: string;
  product_id: number;
  configuration: ProductConfiguration;
  view_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSharedConfigData {
  productId: number;
  configuration: ProductConfiguration;
}

export class SharedConfigService {
  private productService: ProductService;

  constructor(private pool: Pool) {
    this.productService = new ProductService(pool);
  }

  /**
   * Generate a unique short code
   * Uses alphanumeric characters (uppercase, lowercase, numbers)
   * Length: 8-10 characters
   */
  private async generateShortCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const codeLength = 8;
    const maxRetries = 5;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Generate random code
      const randomBytesBuffer = randomBytes(codeLength);
      let code = '';
      for (let i = 0; i < codeLength; i++) {
        code += chars[randomBytesBuffer[i] % chars.length];
      }

      // Check if code already exists
      const existing = await this.pool.query(
        'SELECT id FROM shared_product_configs WHERE short_code = $1',
        [code]
      );

      if (existing.rows.length === 0) {
        return code;
      }
    }

    // If all retries failed, throw error
    throw new Error('Failed to generate unique short code after multiple attempts');
  }

  /**
   * Validate configuration against product
   */
  private async validateConfiguration(
    productId: number,
    configuration: ProductConfiguration
  ): Promise<void> {
    // Verify product exists
    try {
      await this.productService.getProductById(productId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new ValidationError('Product not found', { productId });
      }
      throw error;
    }

    // Basic validation - ensure configuration is an object
    if (!configuration || typeof configuration !== 'object') {
      throw new ValidationError('Invalid configuration format', { configuration });
    }

    // Additional validation can be added here (e.g., verify variation IDs exist)
    // For now, we'll rely on the product service to validate when the config is used
  }

  /**
   * Create a shared configuration
   */
  async createSharedConfig(data: CreateSharedConfigData): Promise<SharedConfig> {
    const { productId, configuration } = data;

    // Validate configuration
    await this.validateConfiguration(productId, configuration);

    // Generate unique short code
    const shortCode = await this.generateShortCode();

    // Insert into database
    const result = await this.pool.query(
      `INSERT INTO shared_product_configs (short_code, product_id, configuration)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [shortCode, productId, JSON.stringify(configuration)]
    );

    return this.mapRowToSharedConfig(result.rows[0]);
  }

  /**
   * Get shared configuration by short code
   * Increments view_count
   */
  async getSharedConfig(shortCode: string): Promise<SharedConfig> {
    // First, get the config
    const result = await this.pool.query(
      `SELECT * FROM shared_product_configs WHERE short_code = $1`,
      [shortCode]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Shared configuration', { shortCode });
    }

    // Increment view count
    await this.pool.query(
      `UPDATE shared_product_configs 
       SET view_count = view_count + 1 
       WHERE short_code = $1`,
      [shortCode]
    );

    return this.mapRowToSharedConfig(result.rows[0]);
  }

  /**
   * Map database row to SharedConfig object
   */
  private mapRowToSharedConfig(row: any): SharedConfig {
    return {
      id: row.id,
      short_code: row.short_code,
      product_id: row.product_id,
      configuration: typeof row.configuration === 'string' 
        ? JSON.parse(row.configuration) 
        : row.configuration,
      view_count: row.view_count,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

