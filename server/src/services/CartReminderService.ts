/**
 * Cart Reminder Service
 * Handles sending reminder emails for abandoned carts
 */

import { Pool } from 'pg';
import { EmailService } from './EmailService';

interface CartWithUser {
  id: number;
  user_id: number | null;
  session_id: string | null;
  updated_at: Date;
  region: 'us' | 'eu';
  user_email?: string;
  user_name?: string;
  cart_total?: number;
  item_count?: number;
}

export class CartReminderService {
  constructor(
    private pool: Pool,
    private emailService: EmailService
  ) {}

  /**
   * Check for abandoned carts and send 1-day reminders
   */
  async checkAndSend1DayReminders(): Promise<{ sent: number; errors: number }> {
    const result = { sent: 0, errors: 0 };

    try {
      // Find carts that:
      // 1. Were updated more than 1 day ago (24 hours)
      // 2. Haven't had a 1-day reminder sent yet
      // 3. Are not converted (not completed orders)
      // 4. Have items in them
      // 5. Have user email (either from user_id or we need to skip guest carts without email)
      const carts = await this.pool.query<CartWithUser>(`
        SELECT DISTINCT
          c.id,
          c.user_id,
          c.session_id,
          c.updated_at,
          c.region,
          u.email as user_email,
          COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Customer') as user_name,
          COALESCE(SUM(ci.total_price), 0) as cart_total,
          COUNT(ci.id) as item_count
        FROM carts c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN cart_items ci ON c.id = ci.cart_id
        WHERE c.updated_at <= NOW() - INTERVAL '1 day'
          AND c.updated_at > NOW() - INTERVAL '2 days'
          AND c.reminder_1day_sent_at IS NULL
          AND c.status != 'converted'
          AND c.expires_at > NOW()
          AND c.user_id IS NOT NULL
          AND u.email IS NOT NULL
        GROUP BY c.id, c.user_id, c.session_id, c.updated_at, c.region, u.email, u.first_name, u.last_name
        HAVING COUNT(ci.id) > 0
        ORDER BY c.updated_at DESC
      `);

      console.log(`📧 Found ${carts.rows.length} carts eligible for 1-day reminder`);

      for (const cart of carts.rows) {
        try {
          // Get cart items for the email
          const itemsResult = await this.pool.query(`
            SELECT 
              p.name,
              ci.quantity,
              ci.unit_price,
              ci.total_price
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.cart_id = $1
          `, [cart.id]);

          const itemCount = itemsResult.rows.length;
          const cartTotal = itemsResult.rows.reduce((sum, item) => 
            sum + parseFloat(item.total_price), 0
          );

          // Build cart URL (region-specific)
          const baseUrl = process.env.FRONTEND_URL || 'https://simfab.com';
          const cartUrl = `${baseUrl}/cart?region=${cart.region}`;

          // Send reminder email
          // Get region from cart (default to 'us' if not set)
          const cartRegion = (cart.region || 'us') as 'us' | 'eu';
          
          await this.emailService.triggerEvent(
            'cart.reminder_1day',
            {
              customer_name: cart.user_name || 'Customer',
              cart_total: `$${cartTotal.toFixed(2)}`,
              item_count: itemCount.toString(),
              cart_url: cartUrl,
              cart_id: cart.id.toString()
            },
            {
              customerEmail: cart.user_email!,
              customerName: cart.user_name || 'Customer'
            },
            cartRegion
          );

          // Mark reminder as sent
          await this.pool.query(
            `UPDATE carts 
             SET reminder_1day_sent_at = NOW() 
             WHERE id = $1`,
            [cart.id]
          );

          result.sent++;
          console.log(`✅ Sent 1-day reminder to ${cart.user_email} for cart ${cart.id}`);
        } catch (error: any) {
          console.error(`❌ Error sending 1-day reminder for cart ${cart.id}:`, error);
          result.errors++;
        }
      }
    } catch (error: any) {
      console.error('❌ Error checking 1-day cart reminders:', error);
      throw error;
    }

    return result;
  }

  /**
   * Check for abandoned carts and send 7-day reminders
   */
  async checkAndSend7DayReminders(): Promise<{ sent: number; errors: number }> {
    const result = { sent: 0, errors: 0 };

    try {
      // Find carts that:
      // 1. Were updated more than 7 days ago
      // 2. Haven't had a 7-day reminder sent yet
      // 3. Are not converted
      // 4. Have items in them
      // 5. Have user email
      const carts = await this.pool.query<CartWithUser>(`
        SELECT DISTINCT
          c.id,
          c.user_id,
          c.session_id,
          c.updated_at,
          c.region,
          u.email as user_email,
          COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Customer') as user_name,
          COALESCE(SUM(ci.total_price), 0) as cart_total,
          COUNT(ci.id) as item_count
        FROM carts c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN cart_items ci ON c.id = ci.cart_id
        WHERE c.updated_at <= NOW() - INTERVAL '7 days'
          AND c.updated_at > NOW() - INTERVAL '8 days'
          AND c.reminder_7days_sent_at IS NULL
          AND c.status != 'converted'
          AND c.expires_at > NOW()
          AND c.user_id IS NOT NULL
          AND u.email IS NOT NULL
        GROUP BY c.id, c.user_id, c.session_id, c.updated_at, c.region, u.email, u.first_name, u.last_name
        HAVING COUNT(ci.id) > 0
        ORDER BY c.updated_at DESC
      `);

      console.log(`📧 Found ${carts.rows.length} carts eligible for 7-day reminder`);

      for (const cart of carts.rows) {
        try {
          // Get cart items for the email
          const itemsResult = await this.pool.query(`
            SELECT 
              p.name,
              ci.quantity,
              ci.unit_price,
              ci.total_price
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.cart_id = $1
          `, [cart.id]);

          const itemCount = itemsResult.rows.length;
          const cartTotal = itemsResult.rows.reduce((sum, item) => 
            sum + parseFloat(item.total_price), 0
          );

          // Build cart URL (region-specific)
          const baseUrl = process.env.FRONTEND_URL || 'https://simfab.com';
          const cartUrl = `${baseUrl}/cart?region=${cart.region}`;

          // Send reminder email using the same template (we can reuse it)
          // Get region from cart (default to 'us' if not set)
          const cartRegion = (cart.region || 'us') as 'us' | 'eu';
          
          await this.emailService.triggerEvent(
            'cart.reminder_7days',
            {
              customer_name: cart.user_name || 'Customer',
              cart_total: `$${cartTotal.toFixed(2)}`,
              item_count: itemCount.toString(),
              cart_url: cartUrl,
              cart_id: cart.id.toString()
            },
            {
              customerEmail: cart.user_email!,
              customerName: cart.user_name || 'Customer'
            },
            cartRegion
          );

          // Mark reminder as sent
          await this.pool.query(
            `UPDATE carts 
             SET reminder_7days_sent_at = NOW() 
             WHERE id = $1`,
            [cart.id]
          );

          result.sent++;
          console.log(`✅ Sent 7-day reminder to ${cart.user_email} for cart ${cart.id}`);
        } catch (error: any) {
          console.error(`❌ Error sending 7-day reminder for cart ${cart.id}:`, error);
          result.errors++;
        }
      }
    } catch (error: any) {
      console.error('❌ Error checking 7-day cart reminders:', error);
      throw error;
    }

    return result;
  }

  /**
   * Check for abandoned carts and send reminders (both 1-day and 7-day)
   */
  async checkAndSendReminders(): Promise<{ 
    day1: { sent: number; errors: number };
    day7: { sent: number; errors: number };
  }> {
    const day1 = await this.checkAndSend1DayReminders();
    const day7 = await this.checkAndSend7DayReminders();

    return { day1, day7 };
  }
}

