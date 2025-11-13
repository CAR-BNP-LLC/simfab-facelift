/**
 * Region Settings Service
 * Handles region-specific settings for US and EU
 */

import { Pool } from 'pg';
import { NotFoundError, ValidationError } from '../utils/errors';

export interface RegionSetting {
  id: number;
  region: 'us' | 'eu';
  setting_key: string;
  setting_value: string | null;
  setting_type: 'string' | 'number' | 'boolean' | 'json';
  description: string | null;
  is_public: boolean;
  updated_by: number | null;
  updated_at: Date;
}

export class RegionSettingsService {
  private cache: Map<string, { data: Record<string, any>; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private pool: Pool) {}

  /**
   * Get all settings for a region
   */
  async getSettings(region: 'us' | 'eu', publicOnly: boolean = false): Promise<Record<string, any>> {
    const cacheKey = `${region}_${publicOnly ? 'public' : 'all'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    let query = `
      SELECT setting_key, setting_value, setting_type
      FROM region_settings
      WHERE region = $1
    `;
    const params: any[] = [region];

    if (publicOnly) {
      query += ' AND is_public = true';
    }

    const result = await this.pool.query(query, params);
    
    const settings: Record<string, any> = {};
    
    for (const row of result.rows) {
      const value = this.parseSettingValue(row.setting_value, row.setting_type);
      settings[row.setting_key] = value;
    }

    // Cache the result
    this.cache.set(cacheKey, { data: settings, timestamp: Date.now() });

    return settings;
  }

  /**
   * Get a single setting by key
   */
  async getSetting(region: 'us' | 'eu', key: string): Promise<any> {
    const result = await this.pool.query(
      `SELECT setting_value, setting_type 
       FROM region_settings 
       WHERE region = $1 AND setting_key = $2`,
      [region, key]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return this.parseSettingValue(row.setting_value, row.setting_type);
  }

  /**
   * Get public settings only (for frontend)
   */
  async getPublicSettings(region: 'us' | 'eu'): Promise<Record<string, any>> {
    return this.getSettings(region, true);
  }

  /**
   * Get contact information (email, phone, phone_display)
   */
  async getContactInfo(region: 'us' | 'eu'): Promise<{
    email: string;
    phone: string;
    phone_display: string;
  }> {
    const settings = await this.getSettings(region, true);
    
    return {
      email: settings.admin_email || '',
      phone: settings.phone_number || '',
      phone_display: settings.phone_display || settings.phone_number || ''
    };
  }

  /**
   * Update a single setting
   */
  async updateSetting(
    region: 'us' | 'eu',
    key: string,
    value: any,
    adminId: number
  ): Promise<void> {
    // Validate region
    if (region !== 'us' && region !== 'eu') {
      throw new ValidationError('Invalid region. Must be "us" or "eu"');
    }

    // Get existing setting to determine type
    const existing = await this.pool.query(
      `SELECT setting_type FROM region_settings 
       WHERE region = $1 AND setting_key = $2`,
      [region, key]
    );

    if (existing.rows.length === 0) {
      throw new NotFoundError(`Setting "${key}" not found for region "${region}"`);
    }

    const settingType = existing.rows[0].setting_type;
    const stringValue = this.stringifySettingValue(value, settingType);

    await this.pool.query(
      `UPDATE region_settings 
       SET setting_value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE region = $3 AND setting_key = $4`,
      [stringValue, adminId, region, key]
    );

    // Clear cache
    this.clearCache(region);
  }

  /**
   * Update multiple settings at once
   */
  async updateSettings(
    region: 'us' | 'eu',
    settings: Record<string, any>,
    adminId: number
  ): Promise<void> {
    // Validate region
    if (region !== 'us' && region !== 'eu') {
      throw new ValidationError('Invalid region. Must be "us" or "eu"');
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      for (const [key, value] of Object.entries(settings)) {
        // Get existing setting type
        const existing = await client.query(
          `SELECT setting_type FROM region_settings 
           WHERE region = $1 AND setting_key = $2`,
          [region, key]
        );

        if (existing.rows.length === 0) {
          // Setting doesn't exist, create it with appropriate type
          // Determine type from value
          let settingType: 'string' | 'number' | 'boolean' | 'json' = 'string';
          if (typeof value === 'number') {
            settingType = 'number';
          } else if (typeof value === 'boolean') {
            settingType = 'boolean';
          } else if (typeof value === 'object' && value !== null) {
            settingType = 'json';
          }

          await client.query(
            `INSERT INTO region_settings 
             (region, setting_key, setting_value, setting_type, is_public, updated_by, updated_at)
             VALUES ($1, $2, $3, $4, false, $5, CURRENT_TIMESTAMP)`,
            [region, key, this.stringifySettingValue(value, settingType), settingType, adminId]
          );
          continue;
        }

        const settingType = existing.rows[0].setting_type;
        const stringValue = this.stringifySettingValue(value, settingType);

        await client.query(
          `UPDATE region_settings 
           SET setting_value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
           WHERE region = $3 AND setting_key = $4`,
          [stringValue, adminId, region, key]
        );
      }

      await client.query('COMMIT');
      
      // Clear cache
      this.clearCache(region);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Clear cache for a region
   */
  private clearCache(region: 'us' | 'eu'): void {
    this.cache.delete(`${region}_public`);
    this.cache.delete(`${region}_all`);
  }

  /**
   * Parse setting value based on type
   */
  private parseSettingValue(value: string | null, type: string): any {
    if (value === null) return null;

    switch (type) {
      case 'number':
        return parseFloat(value);
      case 'boolean':
        return value === 'true' || value === '1';
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  /**
   * Stringify setting value for storage
   */
  private stringifySettingValue(value: any, type: string): string {
    if (value === null || value === undefined) return '';

    switch (type) {
      case 'number':
        return String(value);
      case 'boolean':
        return value ? 'true' : 'false';
      case 'json':
        return typeof value === 'string' ? value : JSON.stringify(value);
      default:
        return String(value);
    }
  }
}

