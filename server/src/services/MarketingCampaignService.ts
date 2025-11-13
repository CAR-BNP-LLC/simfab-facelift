/**
 * Marketing Campaign Service
 * Handles marketing email campaigns and recipient management
 */

import { Pool } from 'pg';
import { generateUnsubscribeToken } from '../utils/unsubscribeToken';

export interface MarketingCampaign {
  id?: number;
  name: string;
  subject: string;
  content: string;
  status: 'draft' | 'sending' | 'sent' | 'cancelled';
  sent_count?: number;
  created_by?: number;
  created_at?: Date;
  sent_at?: Date;
  updated_at?: Date;
}

export interface CampaignRecipient {
  id?: number;
  campaign_id: number;
  user_id?: number;
  email: string;
  unsubscribe_token: string;
  sent_at?: Date;
  opened_at?: Date;
  clicked_at?: Date;
  unsubscribed_at?: Date;
}

export interface EligibleUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export class MarketingCampaignService {
  public pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get all eligible users for marketing emails
   * Returns users who have opted into marketing emails (newsletter subscription with status='active')
   */
  async getEligibleUsers(): Promise<EligibleUser[]> {
    const result = await this.pool.query(`
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name
      FROM users u
      INNER JOIN newsletter_subscriptions ns ON u.email = ns.email
      WHERE ns.status = 'active'
      ORDER BY u.email ASC
    `);

    return result.rows;
  }

  /**
   * Get count of eligible users
   */
  async getEligibleUserCount(): Promise<number> {
    // Debug: Check what's in the database
    const debugResult = await this.pool.query(`
      SELECT 
        COUNT(*)::int as total_users,
        (SELECT COUNT(*)::int FROM newsletter_subscriptions) as total_subscriptions,
        (SELECT COUNT(*)::int FROM newsletter_subscriptions WHERE status = 'active') as active_subscriptions
    `);
    
    console.log('📊 Marketing Campaign Debug:', debugResult.rows[0]);
    
    const result = await this.pool.query(`
      SELECT COUNT(*)::int as count
      FROM users u
      INNER JOIN newsletter_subscriptions ns ON u.email = ns.email
      WHERE ns.status = 'active'
    `);

    const count = result.rows[0].count;
    console.log(`📧 Eligible recipients count: ${count}`);
    
    return count;
  }

  /**
   * Create a new marketing campaign
   */
  async createCampaign(data: {
    name: string;
    subject: string;
    content: string;
    created_by: number;
  }): Promise<MarketingCampaign> {
    const result = await this.pool.query(`
      INSERT INTO marketing_campaigns (name, subject, content, status, created_by)
      VALUES ($1, $2, $3, 'draft', $4)
      RETURNING *
    `, [data.name, data.subject, data.content, data.created_by]);

    return result.rows[0];
  }

  /**
   * Update a marketing campaign
   */
  async updateCampaign(
    id: number,
    data: {
      name?: string;
      subject?: string;
      content?: string;
      status?: 'draft' | 'sending' | 'sent' | 'cancelled';
    }
  ): Promise<MarketingCampaign> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCounter++}`);
      values.push(data.name);
    }
    if (data.subject !== undefined) {
      updates.push(`subject = $${paramCounter++}`);
      values.push(data.subject);
    }
    if (data.content !== undefined) {
      updates.push(`content = $${paramCounter++}`);
      values.push(data.content);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramCounter++}`);
      values.push(data.status);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const result = await this.pool.query(`
      UPDATE marketing_campaigns
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCounter}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      throw new Error('Campaign not found');
    }

    return result.rows[0];
  }

  /**
   * Get all campaigns
   */
  async getCampaigns(filters?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ campaigns: MarketingCampaign[]; total: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params: any[] = [];
    let paramCounter = 1;

    if (filters?.status) {
      whereClause = `WHERE status = $${paramCounter++}`;
      params.push(filters.status);
    }

    // Get total count
    const countResult = await this.pool.query(`
      SELECT COUNT(*)::int as total
      FROM marketing_campaigns
      ${whereClause}
    `, params);

    const total = countResult.rows[0].total;

    // Get campaigns
    const result = await this.pool.query(`
      SELECT *
      FROM marketing_campaigns
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCounter++} OFFSET $${paramCounter++}
    `, [...params, limit, offset]);

    return {
      campaigns: result.rows,
      total
    };
  }

  /**
   * Get a single campaign by ID
   */
  async getCampaign(id: number): Promise<MarketingCampaign | null> {
    const result = await this.pool.query(`
      SELECT *
      FROM marketing_campaigns
      WHERE id = $1
    `, [id]);

    return result.rows[0] || null;
  }

  /**
   * Create recipient records for a campaign
   */
  async createRecipients(
    campaignId: number,
    users: EligibleUser[]
  ): Promise<CampaignRecipient[]> {
    const recipients: CampaignRecipient[] = [];

    for (const user of users) {
      const unsubscribeToken = generateUnsubscribeToken(user.email, campaignId, user.id);

      const result = await this.pool.query(`
        INSERT INTO marketing_campaign_recipients (campaign_id, user_id, email, unsubscribe_token)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [campaignId, user.id, user.email, unsubscribeToken]);

      recipients.push(result.rows[0]);
    }

    return recipients;
  }

  /**
   * Mark campaign as sending
   */
  async markCampaignAsSending(id: number): Promise<void> {
    await this.pool.query(`
      UPDATE marketing_campaigns
      SET status = 'sending', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);
  }

  /**
   * Mark campaign as sent
   */
  async markCampaignAsSent(id: number, sentCount: number): Promise<void> {
    await this.pool.query(`
      UPDATE marketing_campaigns
      SET status = 'sent', sent_count = $1, sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [sentCount, id]);
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(id: number): Promise<{
    total_sent: number;
    total_opened: number;
    total_clicked: number;
    total_unsubscribed: number;
    open_rate: number;
    click_rate: number;
    unsubscribe_rate: number;
  }> {
    const result = await this.pool.query(`
      SELECT 
        COUNT(*)::int as total_sent,
        COUNT(opened_at)::int as total_opened,
        COUNT(clicked_at)::int as total_clicked,
        COUNT(unsubscribed_at)::int as total_unsubscribed
      FROM marketing_campaign_recipients
      WHERE campaign_id = $1
    `, [id]);

    const stats = result.rows[0];
    const totalSent = stats.total_sent || 0;
    const totalOpened = stats.total_opened || 0;
    const totalClicked = stats.total_clicked || 0;
    const totalUnsubscribed = stats.total_unsubscribed || 0;

    return {
      total_sent: totalSent,
      total_opened: totalOpened,
      total_clicked: totalClicked,
      total_unsubscribed: totalUnsubscribed,
      open_rate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
      click_rate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
      unsubscribe_rate: totalSent > 0 ? (totalUnsubscribed / totalSent) * 100 : 0
    };
  }

  /**
   * Get recipient by unsubscribe token
   */
  async getRecipientByToken(token: string): Promise<CampaignRecipient | null> {
    const result = await this.pool.query(`
      SELECT *
      FROM marketing_campaign_recipients
      WHERE unsubscribe_token = $1
    `, [token]);

    return result.rows[0] || null;
  }

  /**
   * Mark recipient as unsubscribed
   */
  async markRecipientAsUnsubscribed(token: string): Promise<void> {
    await this.pool.query(`
      UPDATE marketing_campaign_recipients
      SET unsubscribed_at = CURRENT_TIMESTAMP
      WHERE unsubscribe_token = $1 AND unsubscribed_at IS NULL
    `, [token]);
  }
}

