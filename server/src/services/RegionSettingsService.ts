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
   * Mask sensitive values (show first few chars + xxxxx)
   */
  private maskSensitiveValue(value: string | null, maskLength: number = 4): string | null {
    if (!value || value.length === 0) return value;
    if (value.length <= maskLength) return 'xxxxx';
    return value.substring(0, maskLength) + 'xxxxx';
  }

  /**
   * Check if a setting key is sensitive (should be masked)
   */
  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'paypal_client_secret', 
      'client_secret', 
      'client_id',
      'secret', 
      'password', 
      'api_key', 
      'api_secret'
    ];
    return sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()));
  }

  /**
   * Get all settings for a region
   */
  async getSettings(region: 'us' | 'eu', publicOnly: boolean = false, maskSecrets: boolean = true): Promise<Record<string, any>> {
    const cacheKey = `${region}_${publicOnly ? 'public' : 'all'}_${maskSecrets ? 'masked' : 'unmasked'}`;
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
      let value = this.parseSettingValue(row.setting_value, row.setting_type);
      
      // Mask sensitive values if requested
      if (maskSecrets && this.isSensitiveKey(row.setting_key) && typeof value === 'string') {
        value = this.maskSensitiveValue(value);
      }
      
      settings[row.setting_key] = value;
    }

    // Cache the result
    this.cache.set(cacheKey, { data: settings, timestamp: Date.now() });

    return settings;
  }

  /**
   * Get a single setting by key
   */
  async getSetting(region: 'us' | 'eu', key: string, maskSecret: boolean = false): Promise<any> {
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
    let value = this.parseSettingValue(row.setting_value, row.setting_type);
    
    // Mask sensitive values if requested
    if (maskSecret && this.isSensitiveKey(key) && typeof value === 'string') {
      value = this.maskSensitiveValue(value);
    }
    
    return value;
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
   * Get SMTP settings for a region
   * @param region - Region code ('us' or 'eu')
   * @param maskSecrets - Whether to mask sensitive values like passwords (default: true)
   * @returns SMTP configuration object
   */
  async getSmtpSettings(region: 'us' | 'eu', maskSecrets: boolean = true): Promise<{
    smtp_host: string | null;
    smtp_port: number;
    smtp_user: string | null;
    smtp_password: string | null;
    smtp_from_email: string | null;
    smtp_from_name: string | null;
    smtp_enabled: boolean;
    smtp_test_mode: boolean;
    smtp_test_email: string | null;
  }> {
    const settings = await this.getSettings(region, false, maskSecrets);
    
    return {
      smtp_host: settings.smtp_host || null,
      smtp_port: settings.smtp_port || 587,
      smtp_user: settings.smtp_user || null,
      smtp_password: settings.smtp_password || null,
      smtp_from_email: settings.smtp_from_email || null,
      smtp_from_name: settings.smtp_from_name || 'SimFab',
      smtp_enabled: settings.smtp_enabled !== false, // Default to true if not set
      smtp_test_mode: settings.smtp_test_mode === true,
      smtp_test_email: settings.smtp_test_email || null
    };
  }

  /**
   * Get region restrictions settings
   * @param region - Region code ('us' or 'eu')
   * @returns Region restrictions configuration
   */
  async getRegionRestrictions(region: 'us' | 'eu'): Promise<{
    region_restrictions_enabled: boolean;
    default_region: string;
  }> {
    const settings = await this.getPublicSettings(region);
    
    return {
      region_restrictions_enabled: settings.region_restrictions_enabled === true,
      default_region: settings.default_region || (region === 'eu' ? 'eu' : 'us')
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
    console.log('🔧 [RegionSettingsService] updateSettings called:', {
      region,
      adminId,
      settingsCount: Object.keys(settings).length,
      settingKeys: Object.keys(settings)
    });

    // Validate region
    if (region !== 'us' && region !== 'eu') {
      console.error('❌ [RegionSettingsService] Invalid region:', region);
      throw new ValidationError('Invalid region. Must be "us" or "eu"');
    }

    const client = await this.pool.connect();
    console.log('🔧 [RegionSettingsService] Database client acquired');
    
    try {
      await client.query('BEGIN');
      console.log('🔧 [RegionSettingsService] Transaction started');

      let createdCount = 0;
      let updatedCount = 0;

      for (const [key, value] of Object.entries(settings)) {
        console.log(`🔧 [RegionSettingsService] Processing setting: ${key}`, {
          valueType: typeof value,
          value: key.includes('password') || key.includes('secret') ? '[REDACTED]' : value,
          isNull: value === null,
          isUndefined: value === undefined
        });

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

          const stringValue = this.stringifySettingValue(value, settingType);
          console.log(`🔧 [RegionSettingsService] Creating new setting: ${key}`, {
            settingType,
            stringValue: key.includes('password') || key.includes('secret') ? '[REDACTED]' : stringValue
          });

          await client.query(
            `INSERT INTO region_settings 
             (region, setting_key, setting_value, setting_type, is_public, updated_by, updated_at)
             VALUES ($1, $2, $3, $4, false, $5, CURRENT_TIMESTAMP)`,
            [region, key, stringValue, settingType, adminId]
          );
          createdCount++;
          console.log(`✅ [RegionSettingsService] Created setting: ${key}`);
          continue;
        }

        const settingType = existing.rows[0].setting_type;
        const stringValue = this.stringifySettingValue(value, settingType);
        console.log(`🔧 [RegionSettingsService] Updating existing setting: ${key}`, {
          settingType,
          stringValue: key.includes('password') || key.includes('secret') ? '[REDACTED]' : stringValue
        });

        const updateResult = await client.query(
          `UPDATE region_settings 
           SET setting_value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
           WHERE region = $3 AND setting_key = $4`,
          [stringValue, adminId, region, key]
        );
        
        console.log(`✅ [RegionSettingsService] Updated setting: ${key}`, {
          rowsAffected: updateResult.rowCount
        });
        updatedCount++;
      }

      console.log(`🔧 [RegionSettingsService] All settings processed: ${createdCount} created, ${updatedCount} updated`);
      await client.query('COMMIT');
      console.log('✅ [RegionSettingsService] Transaction committed');
      
      // Clear cache
      this.clearCache(region);
      console.log('✅ [RegionSettingsService] Cache cleared for region:', region);
    } catch (error: any) {
      console.error('❌ [RegionSettingsService] Error in updateSettings:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
        table: error.table,
        column: error.column,
        region,
        adminId,
        settingsKeys: Object.keys(settings)
      });
      await client.query('ROLLBACK');
      console.error('❌ [RegionSettingsService] Transaction rolled back');
      throw error;
    } finally {
      client.release();
      console.log('🔧 [RegionSettingsService] Database client released');
    }
  }

  /**
   * Clear cache for a region
   * Clears all cache variations (masked/unmasked, public/all)
   */
  private clearCache(region: 'us' | 'eu'): void {
    // Clear all possible cache key variations for this region
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${region}_`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
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
    if (value === null || value === undefined) {
      console.log('⚠️ [RegionSettingsService] stringifySettingValue: null/undefined value, returning empty string');
      return '';
    }

    let result: string;
    switch (type) {
      case 'number':
        result = String(value);
        break;
      case 'boolean':
        result = value ? 'true' : 'false';
        break;
      case 'json':
        result = typeof value === 'string' ? value : JSON.stringify(value);
        break;
      default:
        result = String(value);
    }
    
    console.log(`🔧 [RegionSettingsService] stringifySettingValue:`, {
      type,
      inputType: typeof value,
      resultLength: result.length,
      resultPreview: result.substring(0, 50)
    });
    
    return result;
  }
}


