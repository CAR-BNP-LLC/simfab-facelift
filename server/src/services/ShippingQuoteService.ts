/**
 * Shipping Quote Service
 * Handles shipping quote creation and management for international orders
 */

import { Pool } from 'pg';
import { NotFoundError, ValidationError } from '../utils/errors';

export interface ShippingQuote {
  id: number;
  order_id: number | null;
  customer_email: string;
  customer_name: string;
  country: string;
  state: string | null;
  city: string | null;
  postal_code: string | null;
  package_size: 'S' | 'M' | 'L';
  estimated_weight: number | null;
  estimated_dimensions: any;
  fedex_list_rate: number | null;
  fedex_negotiated_rate: number | null;
  fedex_applied_rate: number | null;
  fedex_rate_discount_percent: number | null;
  fedex_service_type: string | null;
  fedex_rate_data: any;
  status: 'pending' | 'quoted' | 'confirmed' | 'cancelled';
  quoted_amount: number | null;
  quoted_by: number | null;
  quoted_at: Date | null;
  quote_confirmation_number: string | null;
  expires_at: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateShippingQuoteData {
  orderId: number;
  customerEmail: string;
  customerName: string;
  shippingAddress: {
    country: string;
    state?: string;
    city?: string;
    postalCode?: string;
  };
  packageSize: 'S' | 'M' | 'L';
  fedexListRate: number;
  fedexNegotiatedRate?: number;
  fedexAppliedRate: number;
  fedexRateDiscountPercent?: number;
  fedexServiceType?: string;
  fedexRateData?: any;
}

export class ShippingQuoteService {
  constructor(private pool: Pool) {}

  /**
   * Create shipping quote for international order
   */
  async createShippingQuote(data: CreateShippingQuoteData): Promise<ShippingQuote> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const sql = `
        INSERT INTO shipping_quotes (
          order_id, customer_email, customer_name,
          country, state, city, postal_code,
          package_size, fedex_list_rate, fedex_negotiated_rate,
          fedex_applied_rate, fedex_rate_discount_percent,
          fedex_service_type, fedex_rate_data, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        )
        RETURNING *
      `;

      const result = await client.query(sql, [
        data.orderId,
        data.customerEmail,
        data.customerName,
        data.shippingAddress.country,
        data.shippingAddress.state || null,
        data.shippingAddress.city || null,
        data.shippingAddress.postalCode || null,
        data.packageSize,
        data.fedexListRate,
        data.fedexNegotiatedRate || null,
        data.fedexAppliedRate,
        data.fedexRateDiscountPercent || null,
        data.fedexServiceType || null,
        JSON.stringify(data.fedexRateData || {}),
        'pending'
      ]);

      // Update order with shipping_quote_id
      await client.query(
        'UPDATE orders SET shipping_quote_id = $1 WHERE id = $2',
        [result.rows[0].id, data.orderId]
      );

      await client.query('COMMIT');

      return this.mapRowToShippingQuote(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update shipping quote (admin confirms rate)
   */
  async updateShippingQuote(
    quoteId: number,
    quotedAmount: number,
    quotedBy: number,
    quoteConfirmationNumber?: string,
    notes?: string
  ): Promise<ShippingQuote> {
    const client = await this.pool.connect();

    try {
      const sql = `
        UPDATE shipping_quotes
        SET 
          quoted_amount = $1,
          quoted_by = $2,
          quoted_at = CURRENT_TIMESTAMP,
          quote_confirmation_number = $3,
          notes = COALESCE($4, notes),
          status = CASE 
            WHEN $3 IS NOT NULL THEN 'confirmed'
            ELSE 'quoted'
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `;

      const result = await client.query(sql, [
        quotedAmount,
        quotedBy,
        quoteConfirmationNumber || null,
        notes || null,
        quoteId
      ]);

      if (result.rows.length === 0) {
        throw new NotFoundError(`Shipping quote ${quoteId} not found`);
      }

      return this.mapRowToShippingQuote(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Get shipping quote by ID
   */
  async getShippingQuoteById(quoteId: number): Promise<ShippingQuote | null> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        'SELECT * FROM shipping_quotes WHERE id = $1',
        [quoteId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToShippingQuote(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Get shipping quote by order ID
   */
  async getShippingQuoteByOrderId(orderId: number): Promise<ShippingQuote | null> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        'SELECT * FROM shipping_quotes WHERE order_id = $1',
        [orderId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToShippingQuote(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * List shipping quotes with filters
   */
  async getShippingQuotes(
    page: number = 1,
    limit: number = 20,
    status?: string
  ): Promise<{
    quotes: ShippingQuote[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const client = await this.pool.connect();

    try {
      const offset = (page - 1) * limit;
      let whereClause = '';
      const params: any[] = [];

      if (status) {
        whereClause = 'WHERE status = $1';
        params.push(status);
      }

      // Get total count
      const countResult = await client.query(
        `SELECT COUNT(*) as total FROM shipping_quotes ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].total);

      // Get quotes
      const queryParams = [...params, limit, offset];
      const query = `
        SELECT * FROM shipping_quotes 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;

      const result = await client.query(query, queryParams);

      return {
        quotes: result.rows.map(row => this.mapRowToShippingQuote(row)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } finally {
      client.release();
    }
  }

  /**
   * Map database row to ShippingQuote interface
   */
  private mapRowToShippingQuote(row: any): ShippingQuote {
    return {
      id: row.id,
      order_id: row.order_id,
      customer_email: row.customer_email,
      customer_name: row.customer_name,
      country: row.country,
      state: row.state,
      city: row.city,
      postal_code: row.postal_code,
      package_size: row.package_size,
      estimated_weight: row.estimated_weight,
      estimated_dimensions: row.estimated_dimensions,
      fedex_list_rate: row.fedex_list_rate ? parseFloat(row.fedex_list_rate) : null,
      fedex_negotiated_rate: row.fedex_negotiated_rate ? parseFloat(row.fedex_negotiated_rate) : null,
      fedex_applied_rate: row.fedex_applied_rate ? parseFloat(row.fedex_applied_rate) : null,
      fedex_rate_discount_percent: row.fedex_rate_discount_percent ? parseFloat(row.fedex_rate_discount_percent) : null,
      fedex_service_type: row.fedex_service_type,
      fedex_rate_data: typeof row.fedex_rate_data === 'string' 
        ? JSON.parse(row.fedex_rate_data) 
        : row.fedex_rate_data,
      status: row.status,
      quoted_amount: row.quoted_amount ? parseFloat(row.quoted_amount) : null,
      quoted_by: row.quoted_by,
      quoted_at: row.quoted_at,
      quote_confirmation_number: row.quote_confirmation_number,
      expires_at: row.expires_at,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

