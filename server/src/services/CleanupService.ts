import { Pool } from 'pg';
import { OrderService } from './OrderService';
import { StockReservationService } from './StockReservationService';

export class CleanupService {
  private orderService: OrderService;
  private stockReservationService: StockReservationService;

  constructor(private pool: Pool) {
    this.orderService = new OrderService(pool);
    this.stockReservationService = new StockReservationService(pool);
  }

  /**
   * Clean up expired orders and reservations
   * This should be run as a scheduled job (every 5 minutes)
   * Orders expire after 15 minutes of no payment
   */
  async cleanupExpiredOrders(): Promise<{
    expiredOrders: number;
    expiredReservations: number;
  }> {
    console.log('Starting cleanup of expired orders and reservations...');

    try {
      // Clean up expired orders
      const expiredOrders = await this.orderService.cleanupExpiredOrders();
      
      // Clean up expired reservations
      const expiredReservations = await this.stockReservationService.cleanupExpiredReservations();

      console.log(`Cleanup completed: ${expiredOrders} expired orders, ${expiredReservations} expired reservations`);

      return {
        expiredOrders,
        expiredReservations
      };
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<{
    pendingOrders: number;
    pendingReservations: number;
    expiredOrders: number;
    expiredReservations: number;
  }> {
    const client = await this.pool.connect();
    
    try {
      // Count pending orders
      const pendingOrdersResult = await client.query(
        `SELECT COUNT(*)::int as count
         FROM orders 
         WHERE payment_status = 'pending' 
         AND status = 'pending'`
      );

      // Count pending reservations
      const pendingReservationsResult = await client.query(
        `SELECT COUNT(*)::int as count
         FROM stock_reservations 
         WHERE status = 'pending'`
      );

      // Count expired orders
      const expiredOrdersResult = await client.query(
        `SELECT COUNT(*)::int as count
         FROM orders 
         WHERE payment_status = 'pending' 
         AND payment_expires_at < NOW() 
         AND status = 'pending'`
      );

      // Count expired reservations
      const expiredReservationsResult = await client.query(
        `SELECT COUNT(*)::int as count
         FROM stock_reservations 
         WHERE status = 'pending' 
         AND expires_at < NOW()`
      );

      return {
        pendingOrders: pendingOrdersResult.rows[0].count,
        pendingReservations: pendingReservationsResult.rows[0].count,
        expiredOrders: expiredOrdersResult.rows[0].count,
        expiredReservations: expiredReservationsResult.rows[0].count
      };
    } finally {
      client.release();
    }
  }
}
