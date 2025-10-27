/**
 * ShipStation Service
 * Handles order fetching and shipment update logic for ShipStation integration
 */

import { Pool } from 'pg';
import { 
  buildOrdersXML, 
  parseShipmentUpdateXML, 
  ShipStationOrder, 
  ShipStationOrderItem,
  ShipStationTrackingData 
} from '../utils/shipstationXML';

export class ShipStationService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Validate ShipStation Basic HTTP Auth credentials
   */
  validateAuth(username: string, password: string): boolean {
    const expectedUsername = process.env.SHIPSTATION_USERNAME;
    const expectedPassword = process.env.SHIPSTATION_PASSWORD;
    const enabled = process.env.SHIPSTATION_ENABLED === 'true';

    if (!enabled) {
      return false;
    }

    if (!expectedUsername || !expectedPassword) {
      console.warn('ShipStation credentials not configured');
      return false;
    }

    return username === expectedUsername && password === expectedPassword;
  }

  /**
   * Fetch paid orders within date range for ShipStation export
   */
  async getOrdersForExport(
    startDate: Date, 
    endDate: Date, 
    page: number = 1, 
    limit: number = 100
  ): Promise<{ orders: ShipStationOrder[], totalPages: number }> {
    try {
      const offset = (page - 1) * limit;

      // Get total count for pagination
      const countSql = `
        SELECT COUNT(*)::int as total
        FROM orders o
        WHERE o.payment_status = 'paid'
        AND o.created_at >= $1
        AND o.created_at <= $2
      `;
      
      const countResult = await this.pool.query(countSql, [startDate, endDate]);
      const totalOrders = countResult.rows[0].total;
      const totalPages = Math.ceil(totalOrders / limit);

      // Get orders with items
      const ordersSql = `
        SELECT 
          o.id,
          o.order_number,
          o.created_at,
          o.status,
          o.payment_status,
          o.shipping_status,
          o.subtotal,
          o.tax_amount,
          o.shipping_amount,
          o.discount_amount,
          o.total_amount,
          o.currency,
          o.customer_email,
          o.customer_phone,
          o.billing_address,
          o.shipping_address,
          o.payment_method,
          o.shipping_method,
          o.notes,
          COALESCE(
            json_agg(
              json_build_object(
                'id', oi.id,
                'product_name', oi.product_name,
                'product_sku', oi.product_sku,
                'quantity', oi.quantity,
                'unit_price', oi.unit_price,
                'total_price', oi.total_price,
                'configuration', oi.configuration
              )
            ) FILTER (WHERE oi.id IS NOT NULL),
            '[]'::json
          ) as items
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.payment_status = 'paid'
        AND o.created_at >= $1
        AND o.created_at <= $2
        GROUP BY o.id, o.order_number, o.created_at, o.status, o.payment_status, 
                 o.shipping_status, o.subtotal, o.tax_amount, o.shipping_amount, 
                 o.discount_amount, o.total_amount, o.currency, o.customer_email, 
                 o.customer_phone, o.billing_address, o.shipping_address, 
                 o.payment_method, o.shipping_method, o.notes
        ORDER BY o.created_at DESC
        LIMIT $3 OFFSET $4
      `;

      const ordersResult = await this.pool.query(ordersSql, [startDate, endDate, limit, offset]);
      
      const orders: ShipStationOrder[] = ordersResult.rows.map(row => ({
        id: row.id,
        order_number: row.order_number,
        created_at: row.created_at,
        status: row.status,
        payment_status: row.payment_status,
        shipping_status: row.shipping_status,
        subtotal: parseFloat(row.subtotal),
        tax_amount: parseFloat(row.tax_amount || 0),
        shipping_amount: parseFloat(row.shipping_amount || 0),
        discount_amount: parseFloat(row.discount_amount || 0),
        total_amount: parseFloat(row.total_amount),
        currency: row.currency,
        customer_email: row.customer_email,
        customer_phone: row.customer_phone,
        billing_address: row.billing_address,
        shipping_address: row.shipping_address,
        payment_method: row.payment_method,
        shipping_method: row.shipping_method,
        notes: row.notes,
        items: row.items || []
      }));

      return { orders, totalPages };
    } catch (error) {
      console.error('Error fetching orders for ShipStation:', error);
      throw new Error('Failed to fetch orders for export');
    }
  }

  /**
   * Generate XML response for ShipStation order export
   */
  async getOrdersXML(
    startDate: Date, 
    endDate: Date, 
    page: number = 1
  ): Promise<string> {
    const { orders, totalPages } = await this.getOrdersForExport(startDate, endDate, page);
    return buildOrdersXML(orders, totalPages);
  }

  /**
   * Update order with shipment tracking information
   */
  async updateOrderShipment(trackingData: ShipStationTrackingData): Promise<boolean> {
    try {
      const {
        order_number,
        tracking_number,
        carrier,
        shipped_date,
        service_code
      } = trackingData;

      // Update order with tracking information
      const updateSql = `
        UPDATE orders 
        SET 
          shipping_status = 'shipped',
          tracking_number = $1,
          carrier = $2,
          updated_at = CURRENT_TIMESTAMP,
          metadata = COALESCE(metadata, '{}'::jsonb) || 
            jsonb_build_object(
              'shipped_date', $3,
              'service_code', $4,
              'shipstation_updated', CURRENT_TIMESTAMP
            )
        WHERE order_number = $5
        AND payment_status = 'paid'
        RETURNING id, order_number
      `;

      const result = await this.pool.query(updateSql, [
        tracking_number,
        carrier,
        shipped_date,
        service_code || null,
        order_number
      ]);

      if (result.rows.length === 0) {
        console.warn(`Order not found or not eligible for shipment update: ${order_number}`);
        return false;
      }

      // Log the shipment update
      const orderId = result.rows[0].id;
      const logSql = `
        INSERT INTO order_status_history (order_id, status, comment, created_at)
        VALUES ($1, 'shipped', $2, CURRENT_TIMESTAMP)
      `;

      const comment = `Shipment updated via ShipStation. Tracking: ${tracking_number}, Carrier: ${carrier}`;
      await this.pool.query(logSql, [orderId, comment]);

      console.log(`Order ${order_number} updated with tracking ${tracking_number}`);
      return true;
    } catch (error) {
      console.error('Error updating order shipment:', error);
      throw new Error('Failed to update order shipment');
    }
  }

  /**
   * Process ShipStation shipment update XML
   */
  async processShipmentUpdate(xmlBody: string): Promise<boolean> {
    const trackingData = parseShipmentUpdateXML(xmlBody);
    
    if (!trackingData) {
      console.error('Invalid ShipStation XML format');
      return false;
    }

    return await this.updateOrderShipment(trackingData);
  }

  /**
   * Get order by order number for testing
   */
  async getOrderByNumber(orderNumber: string): Promise<ShipStationOrder | null> {
    try {
      const sql = `
        SELECT 
          o.id,
          o.order_number,
          o.created_at,
          o.status,
          o.payment_status,
          o.shipping_status,
          o.subtotal,
          o.tax_amount,
          o.shipping_amount,
          o.discount_amount,
          o.total_amount,
          o.currency,
          o.customer_email,
          o.customer_phone,
          o.billing_address,
          o.shipping_address,
          o.payment_method,
          o.shipping_method,
          o.notes,
          COALESCE(
            json_agg(
              json_build_object(
                'id', oi.id,
                'product_name', oi.product_name,
                'product_sku', oi.product_sku,
                'quantity', oi.quantity,
                'unit_price', oi.unit_price,
                'total_price', oi.total_price,
                'configuration', oi.configuration
              )
            ) FILTER (WHERE oi.id IS NOT NULL),
            '[]'::json
          ) as items
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.order_number = $1
        GROUP BY o.id, o.order_number, o.created_at, o.status, o.payment_status, 
                 o.shipping_status, o.subtotal, o.tax_amount, o.shipping_amount, 
                 o.discount_amount, o.total_amount, o.currency, o.customer_email, 
                 o.customer_phone, o.billing_address, o.shipping_address, 
                 o.payment_method, o.shipping_method, o.notes
      `;

      const result = await this.pool.query(sql, [orderNumber]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        order_number: row.order_number,
        created_at: row.created_at,
        status: row.status,
        payment_status: row.payment_status,
        shipping_status: row.shipping_status,
        subtotal: parseFloat(row.subtotal),
        tax_amount: parseFloat(row.tax_amount || 0),
        shipping_amount: parseFloat(row.shipping_amount || 0),
        discount_amount: parseFloat(row.discount_amount || 0),
        total_amount: parseFloat(row.total_amount),
        currency: row.currency,
        customer_email: row.customer_email,
        customer_phone: row.customer_phone,
        billing_address: row.billing_address,
        shipping_address: row.shipping_address,
        payment_method: row.payment_method,
        shipping_method: row.shipping_method,
        notes: row.notes,
        items: row.items || []
      };
    } catch (error) {
      console.error('Error fetching order by number:', error);
      throw new Error('Failed to fetch order');
    }
  }
}
