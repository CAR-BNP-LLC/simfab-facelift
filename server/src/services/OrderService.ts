/**
 * Order Service
 * Handles order creation and management
 */

import { Pool } from 'pg';
import {
  Order,
  OrderWithItems,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  CreateOrderData,
  Address
} from '../types/cart';
import { CartService } from './CartService';
import { NotFoundError, ValidationError } from '../utils/errors';

export class OrderService {
  private cartService: CartService;

  constructor(private pool: Pool) {
    this.cartService = new CartService(pool);
  }

  /**
   * Create order from cart
   */
  async createOrder(
    sessionId: string | undefined,
    userId: number | undefined,
    orderData: CreateOrderData
  ): Promise<OrderWithItems> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get cart with items
      const cart = await this.cartService.getCartWithItems(sessionId, userId);

      if (!cart || cart.items.length === 0) {
        throw new ValidationError('Cannot create order with empty cart');
      }

      // Validate cart
      const validation = await this.cartService.validateCartForCheckout(cart.id);
      if (!validation.valid) {
        throw new ValidationError('Cart validation failed', { errors: validation.errors });
      }

      // Generate order number
      const orderNumber = await this.generateOrderNumber();

      // Calculate totals
      const subtotal = cart.totals.subtotal;
      const discount = cart.totals.discount;
      const shipping = cart.totals.shipping;
      const tax = cart.totals.tax;
      const total = cart.totals.total;

      // Create order
      const orderSql = `
        INSERT INTO orders (
          order_number, user_id, status, payment_status, shipping_status,
          subtotal, tax_amount, shipping_amount, discount_amount, total_amount, currency,
          customer_email, customer_phone,
          billing_address, shipping_address,
          payment_method, shipping_method, notes
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11,
          $12, $13,
          $14, $15,
          $16, $17, $18
        )
        RETURNING *
      `;

      const orderResult = await client.query(orderSql, [
        orderNumber,
        userId || null,
        OrderStatus.PENDING,
        PaymentStatus.PENDING,
        'pending',
        subtotal,
        tax,
        shipping,
        discount,
        total,
        'USD',
        orderData.billingAddress.email || orderData.shippingAddress.email || '',
        orderData.billingAddress.phone || orderData.shippingAddress.phone || null,
        JSON.stringify(orderData.billingAddress),
        JSON.stringify(orderData.shippingAddress),
        orderData.paymentMethodId || null,
        orderData.shippingMethodId || null,
        orderData.orderNotes || null
      ]);

      const order = orderResult.rows[0];

      // Create order items from cart items
      const orderItems: OrderItem[] = [];

      for (const cartItem of cart.items) {
        const orderItemSql = `
          INSERT INTO order_items (
            order_id, product_id, product_name, product_sku,
            quantity, unit_price, total_price, selected_options
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `;

        const orderItemResult = await client.query(orderItemSql, [
          order.id,
          cartItem.product_id,
          cartItem.product_name,
          cartItem.product_sku,
          cartItem.quantity,
          cartItem.unit_price,
          cartItem.total_price,
          cartItem.configuration
        ]);

        orderItems.push(orderItemResult.rows[0]);

        // Decrement product stock
        await client.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [cartItem.quantity, cartItem.product_id]
        );
      }

      // Clear cart after order
      await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cart.id]);

      await client.query('COMMIT');

      return {
        ...order,
        items: orderItems
      };
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      console.error('Error creating order:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get order by order number
   */
  async getOrderByNumber(orderNumber: string, userId?: number): Promise<OrderWithItems | null> {
    try {
      let sql = 'SELECT * FROM orders WHERE order_number = $1';
      const params: any[] = [orderNumber];

      // If userId provided, ensure user owns the order
      if (userId) {
        sql += ' AND user_id = $2';
        params.push(userId);
      }

      const orderResult = await this.pool.query(sql, params);

      if (orderResult.rows.length === 0) {
        return null;
      }

      const order = orderResult.rows[0];

      // Get order items
      const itemsSql = 'SELECT * FROM order_items WHERE order_id = $1 ORDER BY id';
      const itemsResult = await this.pool.query(itemsSql, [order.id]);

      return {
        ...order,
        items: itemsResult.rows
      };
    } catch (error) {
      console.error('Error getting order by number:', error);
      throw error;
    }
  }

  /**
   * Get user's orders
   */
  async getUserOrders(userId: number, page: number = 1, limit: number = 10): Promise<{
    orders: Order[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const offset = (page - 1) * limit;

      const ordersSql = `
        SELECT * FROM orders
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const countSql = `
        SELECT COUNT(*)::int as total FROM orders WHERE user_id = $1
      `;

      const [ordersResult, countResult] = await Promise.all([
        this.pool.query(ordersSql, [userId, limit, offset]),
        this.pool.query(countSql, [userId])
      ]);

      const total = countResult.rows[0].total;
      const totalPages = Math.ceil(total / limit);

      return {
        orders: ordersResult.rows,
        total,
        page,
        totalPages
      };
    } catch (error) {
      console.error('Error getting user orders:', error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
    const sql = `
      UPDATE orders
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await this.pool.query(sql, [status, orderId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Order', { orderId });
    }

    return result.rows[0];
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderNumber: string, userId?: number): Promise<Order> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get order
      let sql = 'SELECT * FROM orders WHERE order_number = $1';
      const params: any[] = [orderNumber];

      if (userId) {
        sql += ' AND user_id = $2';
        params.push(userId);
      }

      const orderResult = await client.query(sql, params);

      if (orderResult.rows.length === 0) {
        throw new NotFoundError('Order', { orderNumber });
      }

      const order = orderResult.rows[0];

      // Can only cancel pending or processing orders
      if (!['pending', 'processing'].includes(order.status)) {
        throw new ValidationError('Order cannot be cancelled at this stage', {
          currentStatus: order.status
        });
      }

      // Get order items
      const itemsSql = 'SELECT * FROM order_items WHERE order_id = $1';
      const itemsResult = await client.query(itemsSql, [order.id]);

      // Restore stock for each item
      for (const item of itemsResult.rows) {
        await client.query(
          'UPDATE products SET stock = stock + $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      // Update order status
      const updateSql = `
        UPDATE orders
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;

      const result = await client.query(updateSql, [OrderStatus.CANCELLED, order.id]);

      await client.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error('Error cancelling order:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate unique order number
   */
  private async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // Get count of orders today
    const countSql = `
      SELECT COUNT(*)::int as count
      FROM orders
      WHERE DATE(created_at) = CURRENT_DATE
    `;

    const result = await this.pool.query(countSql);
    const orderCount = result.rows[0].count + 1;
    const orderNum = String(orderCount).padStart(4, '0');

    return `SF-${year}${month}${day}-${orderNum}`;
  }
}

