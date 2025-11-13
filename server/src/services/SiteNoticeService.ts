/**
 * Site Notice Service
 * Manages site-wide notices displayed on the home page
 */

import { Pool } from 'pg';
import { ValidationError, NotFoundError } from '../utils/errors';

export interface SiteNotice {
  id: number;
  message: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class SiteNoticeService {
  constructor(private pool: Pool) {}

  /**
   * Get the currently active notice
   * If multiple notices are active, returns the most recent one and deactivates others
   */
  async getActiveNotice(): Promise<SiteNotice | null> {
    const result = await this.pool.query(
      `SELECT * FROM site_notices WHERE is_active = true ORDER BY created_at DESC`
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    // If multiple notices are active, keep only the most recent one active
    if (result.rows.length > 1) {
      const mostRecentId = result.rows[0].id;
      await this.pool.query(
        `UPDATE site_notices SET is_active = false, updated_at = CURRENT_TIMESTAMP 
         WHERE is_active = true AND id != $1`,
        [mostRecentId]
      );
    }
    
    return this.mapRowToNotice(result.rows[0]);
  }

  /**
   * Get all notices (for admin)
   */
  async getAllNotices(): Promise<SiteNotice[]> {
    const result = await this.pool.query(
      `SELECT * FROM site_notices ORDER BY created_at DESC`
    );
    
    return result.rows.map(row => this.mapRowToNotice(row));
  }

  /**
   * Get notice by ID
   */
  async getNoticeById(id: number): Promise<SiteNotice | null> {
    const result = await this.pool.query(
      `SELECT * FROM site_notices WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToNotice(result.rows[0]);
  }

  /**
   * Create a new notice
   * If is_active is true, deactivates all other notices
   */
  async createNotice(message: string, isActive: boolean = true): Promise<SiteNotice> {
    if (!message || message.trim().length === 0) {
      throw new ValidationError('Message is required');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // If activating this notice, deactivate all others first
      if (isActive) {
        await client.query(
          `UPDATE site_notices SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE is_active = true`
        );
      }

      const result = await client.query(
        `INSERT INTO site_notices (message, is_active, created_at, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [message.trim(), isActive]
      );

      await client.query('COMMIT');
      return this.mapRowToNotice(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update a notice
   * If is_active is set to true, deactivates all other notices
   */
  async updateNotice(id: number, message: string, isActive: boolean): Promise<SiteNotice> {
    if (!message || message.trim().length === 0) {
      throw new ValidationError('Message is required');
    }

    // Check if notice exists
    const existing = await this.getNoticeById(id);
    if (!existing) {
      throw new NotFoundError('Site Notice', { id });
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // If activating this notice, deactivate all others first
      if (isActive) {
        await client.query(
          `UPDATE site_notices SET is_active = false, updated_at = CURRENT_TIMESTAMP 
           WHERE is_active = true AND id != $1`,
          [id]
        );
      }

      const result = await client.query(
        `UPDATE site_notices 
         SET message = $1, is_active = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [message.trim(), isActive, id]
      );

      await client.query('COMMIT');
      return this.mapRowToNotice(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a notice
   */
  async deleteNotice(id: number): Promise<void> {
    const result = await this.pool.query(
      `DELETE FROM site_notices WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Site Notice', { id });
    }
  }

  /**
   * Map database row to SiteNotice interface
   */
  private mapRowToNotice(row: any): SiteNotice {
    return {
      id: row.id,
      message: row.message,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

