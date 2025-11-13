/**
 * Setup Test Data Script (DEV ONLY)
 * Master script that cleans up and generates all test data
 * 
 * WARNING: This script is for development only. It will:
 * - Delete all fake users (@devmail.fake)
 * - Delete all coupons
 * - Delete all orders
 * - Generate 200 test users
 * - Generate 15 test coupons
 * - Generate 1000 test orders
 * 
 * Usage: NODE_ENV=development ts-node src/scripts/setup-test-data.ts
 */

import { Pool } from 'pg';
import { pool } from '../config/database';
import { TestUserGenerator } from './generate-test-users';
import { TestCouponGenerator } from './generate-test-coupons';
import { TestOrderGenerator } from './generate-test-orders';

// Safety check - only run in development
if (process.env.NODE_ENV === 'production') {
  console.error('❌ ERROR: This script can only be run in development mode!');
  console.error('Set NODE_ENV=development to run this script.');
  process.exit(1);
}

class TestDataSetup {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  async run(): Promise<void> {
    console.log('🚀 Starting test data setup...\n');
    console.log('⚠️  WARNING: This will delete fake users, coupons, and orders!\n');

    try {
      // Step 1: Delete all fake users (@devmail.fake)
      console.log('🗑️  Step 1: Deleting all fake users (@devmail.fake)...');
      await this.deleteFakeUsers();
      console.log('✅ Fake users deleted\n');

      // Step 2: Delete all coupons
      console.log('🗑️  Step 2: Deleting all coupons...');
      await this.deleteAllCoupons();
      console.log('✅ All coupons deleted\n');

      // Step 3: Delete all orders
      console.log('🗑️  Step 3: Deleting all orders...');
      await this.deleteAllOrders();
      console.log('✅ All orders deleted\n');

      // Step 4: Generate test users (don't close pool - we need it for other scripts)
      console.log('👤 Step 4: Generating 200 test users...');
      const userGenerator = new TestUserGenerator();
      await userGenerator.generateUsers(200, false);
      console.log('✅ Test users generated\n');

      // Step 5: Generate test coupons (don't close pool)
      console.log('🎫 Step 5: Generating 15 test coupons...');
      const couponGenerator = new TestCouponGenerator();
      await couponGenerator.generateCoupons(15, false);
      console.log('✅ Test coupons generated\n');

      // Step 6: Generate test orders (don't close pool - setup script will close it)
      console.log('📦 Step 6: Generating 1000 test orders...');
      const orderGenerator = new TestOrderGenerator();
      await orderGenerator.generateOrders(1000, false);
      console.log('✅ Test orders generated\n');

      console.log('='.repeat(60));
      console.log('🎉 Test data setup complete!');
      console.log('='.repeat(60));
      console.log('✅ 200 test users created');
      console.log('✅ 15 test coupons created');
      console.log('✅ 1000 test orders created');
      console.log('✅ All fake data cleaned up');
      console.log('='.repeat(60) + '\n');

    } catch (error: any) {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }

  private async deleteFakeUsers(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Delete user addresses for fake users
      await client.query(`
        DELETE FROM user_addresses 
        WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@devmail.fake')
      `);

      // Delete password resets for fake users
      await client.query(`
        DELETE FROM password_resets 
        WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@devmail.fake')
      `);

      // Delete wishlists for fake users
      await client.query(`
        DELETE FROM wishlists 
        WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@devmail.fake')
      `);

      // Delete coupon usage for fake users' orders (will be handled by order deletion)
      // But we'll delete it here too for safety
      await client.query(`
        DELETE FROM coupon_usage 
        WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@devmail.fake')
      `);

      // Delete orders for fake users
      await client.query(`
        DELETE FROM orders 
        WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@devmail.fake')
      `);

      // Finally delete fake users
      const result = await client.query(`
        DELETE FROM users 
        WHERE email LIKE '%@devmail.fake'
        RETURNING id
      `);

      await client.query('COMMIT');
      console.log(`   Deleted ${result.rows.length} fake users`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async deleteAllCoupons(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Delete coupon usage first (foreign key constraint)
      await client.query('DELETE FROM coupon_usage');
      
      // Delete cart coupons
      await client.query('DELETE FROM cart_coupons');

      // Delete coupons
      const result = await client.query('DELETE FROM coupons RETURNING id');
      
      await client.query('COMMIT');
      console.log(`   Deleted ${result.rows.length} coupons`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async deleteAllOrders(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Delete order items first (foreign key constraint)
      await client.query('DELETE FROM order_items');

      // Delete coupon usage records linked to orders
      await client.query('DELETE FROM coupon_usage WHERE order_id IS NOT NULL');

      // Delete order status history
      await client.query('DELETE FROM order_status_history');

      // Delete orders
      const result = await client.query('DELETE FROM orders RETURNING id');

      // Reset coupon usage counts
      await client.query('UPDATE coupons SET usage_count = 0');

      await client.query('COMMIT');
      console.log(`   Deleted ${result.rows.length} orders`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

}

// Main execution
const setup = new TestDataSetup();
setup.run().catch(error => {
  console.error('❌ Script execution failed:', error);
  process.exit(1);
});

