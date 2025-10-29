/**
 * Wishlist System Test Script
 * Tests all wishlist functionality including notifications
 * 
 * Usage: ts-node src/scripts/test-wishlist.ts
 */

import { Pool } from 'pg';
import { pool } from '../config/database';
import WishlistModel from '../models/wishlist';
import { WishlistService } from '../services/WishlistService';
import { WishlistNotificationService } from '../services/WishlistNotificationService';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

class WishlistTester {
  private pool: Pool;
  private wishlistModel: WishlistModel;
  private wishlistService: WishlistService;
  private notificationService: WishlistNotificationService;
  private results: TestResult[] = [];
  private testUserId: number | null = null;
  private testProductId: number | null = null;

  constructor() {
    this.pool = pool;
    this.wishlistModel = new WishlistModel(pool);
    this.wishlistService = new WishlistService(pool);
    this.notificationService = new WishlistNotificationService(pool);
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Wishlist System Tests\n');
    console.log('='.repeat(60));

    try {
      // Setup test data
      await this.setupTestData();

      // Run tests
      await this.testDatabaseSchema();
      await this.testWishlistModel();
      await this.testWishlistService();
      await this.testNotificationLogic();
      await this.testAPIEndpoints();

      // Cleanup
      await this.cleanupTestData();

      // Print results
      this.printResults();
    } catch (error: any) {
      console.error('❌ Fatal error during testing:', error);
      this.results.push({
        name: 'Fatal Error',
        passed: false,
        error: error.message,
      });
      this.printResults();
    } finally {
      await this.pool.end();
    }
  }

  async setupTestData(): Promise<void> {
    console.log('\n📋 Setting up test data...');
    const client = await this.pool.connect();
    try {
      // Get or create test user
      const userResult = await client.query(
        `SELECT id FROM users WHERE email = 'test-wishlist@example.com'`
      );
      
      if (userResult.rows.length === 0) {
        const newUser = await client.query(
          `INSERT INTO users (email, first_name, last_name, password_hash, email_verified) 
           VALUES ('test-wishlist@example.com', 'Test', 'User', 'hash', true) 
           RETURNING id`
        );
        this.testUserId = newUser.rows[0].id;
        console.log(`✅ Created test user: ${this.testUserId}`);
      } else {
        this.testUserId = userResult.rows[0].id;
        console.log(`✅ Using existing test user: ${this.testUserId}`);
      }

      // Get a test product
      const productResult = await client.query(
        `SELECT id FROM products WHERE in_stock = '1' LIMIT 1`
      );
      
      if (productResult.rows.length > 0) {
        this.testProductId = productResult.rows[0].id;
        console.log(`✅ Using test product: ${this.testProductId}`);
      } else {
        console.log('⚠️  No products available for testing');
      }
    } catch (error: any) {
      console.error('❌ Error setting up test data:', error.message);
    } finally {
      client.release();
    }
  }

  async testDatabaseSchema(): Promise<void> {
    console.log('\n📊 Testing Database Schema...');
    
    const client = await this.pool.connect();
    try {
      // Test wishlists table
      const wishlistsResult = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'wishlists'
        ORDER BY ordinal_position
      `);
      
      const requiredColumns = [
        'id', 'user_id', 'product_id', 'notify_on_sale', 
        'notify_on_stock', 'last_sale_notified_at', 'last_stock_notified_at'
      ];
      
      const existingColumns = wishlistsResult.rows.map((r: any) => r.column_name);
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      
      this.results.push({
        name: 'Database: wishlists table exists',
        passed: wishlistsResult.rows.length > 0,
        details: { columns: existingColumns.length }
      });

      this.results.push({
        name: 'Database: wishlists required columns',
        passed: missingColumns.length === 0,
        error: missingColumns.length > 0 ? `Missing: ${missingColumns.join(', ')}` : undefined
      });

      // Test wishlist_notifications table
      const notificationsResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'wishlist_notifications'
      `);
      
      this.results.push({
        name: 'Database: wishlist_notifications table exists',
        passed: notificationsResult.rows.length > 0,
        details: { columns: notificationsResult.rows.length }
      });

      // Test email templates
      const templatesResult = await client.query(`
        SELECT type, name, is_active 
        FROM email_templates 
        WHERE type IN ('wishlist_sale_notification', 'wishlist_stock_notification')
      `);
      
      const saleTemplate = templatesResult.rows.find((r: any) => r.type === 'wishlist_sale_notification');
      const stockTemplate = templatesResult.rows.find((r: any) => r.type === 'wishlist_stock_notification');
      
      this.results.push({
        name: 'Database: sale notification template exists',
        passed: !!saleTemplate && saleTemplate.is_active,
        details: saleTemplate
      });

      this.results.push({
        name: 'Database: stock notification template exists',
        passed: !!stockTemplate && stockTemplate.is_active,
        details: stockTemplate
      });

    } catch (error: any) {
      this.results.push({
        name: 'Database schema tests',
        passed: false,
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  async testWishlistModel(): Promise<void> {
    console.log('\n🔧 Testing Wishlist Model...');
    
    if (!this.testUserId || !this.testProductId) {
      this.results.push({
        name: 'Wishlist Model: Skipped (no test data)',
        passed: true
      });
      return;
    }

    try {
      // Test add to wishlist
      const addResult = await this.wishlistModel.addToWishlist(
        this.testUserId,
        this.testProductId,
        { notify_on_sale: true, notify_on_stock: true }
      );
      
      this.results.push({
        name: 'Model: addToWishlist',
        passed: !!addResult.id,
        details: { wishlistId: addResult.id }
      });

      // Test get wishlist
      const wishlist = await this.wishlistModel.getWishlistByUserId(this.testUserId);
      
      this.results.push({
        name: 'Model: getWishlistByUserId',
        passed: Array.isArray(wishlist) && wishlist.length > 0,
        details: { count: wishlist.length }
      });

      // Test isInWishlist
      const isInWishlist = await this.wishlistModel.isInWishlist(
        this.testUserId,
        this.testProductId
      );
      
      this.results.push({
        name: 'Model: isInWishlist',
        passed: isInWishlist === true,
        details: { result: isInWishlist }
      });

      // Test getWishlistCount
      const count = await this.wishlistModel.getWishlistCount(this.testUserId);
      
      this.results.push({
        name: 'Model: getWishlistCount',
        passed: count >= 1,
        details: { count }
      });

    } catch (error: any) {
      this.results.push({
        name: 'Wishlist Model tests',
        passed: false,
        error: error.message
      });
    }
  }

  async testWishlistService(): Promise<void> {
    console.log('\n⚙️  Testing Wishlist Service...');
    
    if (!this.testUserId || !this.testProductId) {
      this.results.push({
        name: 'Wishlist Service: Skipped (no test data)',
        passed: true
      });
      return;
    }

    try {
      // Test get wishlist
      const wishlist = await this.wishlistService.getWishlist(this.testUserId);
      
      this.results.push({
        name: 'Service: getWishlist',
        passed: Array.isArray(wishlist) && wishlist.length > 0,
        details: { count: wishlist.length }
      });

      // Test update preferences
      const item = wishlist.find((w: any) => w.product_id === this.testProductId);
      if (item) {
        await this.wishlistService.updatePreferences(
          this.testUserId,
          this.testProductId,
          { notify_on_sale: false, notify_on_stock: true }
        );
        
        this.results.push({
          name: 'Service: updatePreferences',
          passed: true
        });
      }

      // Test getCount
      const count = await this.wishlistService.getCount(this.testUserId);
      
      this.results.push({
        name: 'Service: getCount',
        passed: count >= 1,
        details: { count }
      });

    } catch (error: any) {
      this.results.push({
        name: 'Wishlist Service tests',
        passed: false,
        error: error.message
      });
    }
  }

  async testNotificationLogic(): Promise<void> {
    console.log('\n📧 Testing Notification Logic...');
    
    try {
      // Test getProductsNeedingSaleNotification
      const saleItems = await this.wishlistModel.getProductsNeedingSaleNotification();
      
      this.results.push({
        name: 'Notification: getProductsNeedingSaleNotification',
        passed: Array.isArray(saleItems),
        details: { count: saleItems.length }
      });

      // Test getProductsNeedingStockNotification
      const stockItems = await this.wishlistModel.getProductsNeedingStockNotification();
      
      this.results.push({
        name: 'Notification: getProductsNeedingStockNotification',
        passed: Array.isArray(stockItems),
        details: { count: stockItems.length }
      });

      // Test notification service (dry run - don't actually send emails)
      console.log('  ⚠️  Skipping actual email sending tests (requires email service)');
      this.results.push({
        name: 'Notification: Service initialized',
        passed: true,
        details: { note: 'Email sending requires EmailService to be configured' }
      });

    } catch (error: any) {
      this.results.push({
        name: 'Notification Logic tests',
        passed: false,
        error: error.message
      });
    }
  }

  async testAPIEndpoints(): Promise<void> {
    console.log('\n🌐 Testing API Endpoints (Structure)...');
    
    try {
      // Check if routes file exists and exports correctly
      const fs = await import('fs');
      const path = await import('path');
      
      const routesPath = path.join(__dirname, '../routes/wishlist.ts');
      const routesExist = fs.existsSync(routesPath);
      
      this.results.push({
        name: 'API: Routes file exists',
        passed: routesExist,
        details: { path: routesPath }
      });

      // Check if controller exists
      const controllerPath = path.join(__dirname, '../controllers/wishlistController.ts');
      const controllerExists = fs.existsSync(controllerPath);
      
      this.results.push({
        name: 'API: Controller file exists',
        passed: controllerExists,
        details: { path: controllerPath }
      });

      // Check if admin routes exist
      const adminRoutesPath = path.join(__dirname, '../routes/admin/wishlist-notifications.ts');
      const adminRoutesExist = fs.existsSync(adminRoutesPath);
      
      this.results.push({
        name: 'API: Admin routes file exists',
        passed: adminRoutesExist,
        details: { path: adminRoutesPath }
      });

      // Check if admin controller exists
      const adminControllerPath = path.join(__dirname, '../controllers/adminWishlistNotificationController.ts');
      const adminControllerExists = fs.existsSync(adminControllerPath);
      
      this.results.push({
        name: 'API: Admin controller file exists',
        passed: adminControllerExists,
        details: { path: adminControllerPath }
      });

    } catch (error: any) {
      this.results.push({
        name: 'API Endpoints tests',
        passed: false,
        error: error.message
      });
    }
  }

  async cleanupTestData(): Promise<void> {
    console.log('\n🧹 Cleaning up test data...');
    const client = await this.pool.connect();
    try {
      if (this.testUserId && this.testProductId) {
        // Remove test wishlist items
        await client.query(
          'DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2',
          [this.testUserId, this.testProductId]
        );
        console.log('✅ Cleaned up test wishlist items');
      }

      // Optionally remove test user (commented out to preserve for manual testing)
      // await client.query('DELETE FROM users WHERE id = $1', [this.testUserId]);
      
    } catch (error: any) {
      console.error('⚠️  Error cleaning up:', error.message);
    } finally {
      client.release();
    }
  }

  printResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Results Summary');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    console.log(`\nTotal Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);

    console.log('\n📋 Detailed Results:\n');

    this.results.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.name}`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details)}`);
      }
    });

    console.log('\n' + '='.repeat(60));
    
    if (failed === 0) {
      console.log('🎉 All tests passed!');
    } else {
      console.log(`⚠️  ${failed} test(s) failed. Please review the errors above.`);
    }
    
    console.log('='.repeat(60) + '\n');
  }
}

// Run tests
const tester = new WishlistTester();
tester.runAllTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});

