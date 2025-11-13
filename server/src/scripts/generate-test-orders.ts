/**
 * Generate Test Orders Script (DEV ONLY)
 * Generates 1000 test orders with random users, products, and addresses
 * 
 * WARNING: This script is for development only. It will create orders directly in the database.
 * 
 * Usage: NODE_ENV=development ts-node src/scripts/generate-test-orders.ts [count]
 * 
 * @param count - Number of orders to generate (default: 1000)
 */

import { Pool } from 'pg';
import { pool } from '../config/database';
import { OrderStatus, PaymentStatus } from '../types/cart';

// Safety check - only run in development
if (process.env.NODE_ENV === 'production') {
  console.error('❌ ERROR: This script can only be run in development mode!');
  console.error('Set NODE_ENV=development to run this script.');
  process.exit(1);
}

// Common US cities and states for random address generation
const US_CITIES = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
  'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
  'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis',
  'Seattle', 'Denver', 'Washington', 'Boston', 'El Paso', 'Nashville',
  'Detroit', 'Oklahoma City', 'Portland', 'Las Vegas', 'Memphis', 'Louisville',
  'Baltimore', 'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno', 'Sacramento',
  'Kansas City', 'Mesa', 'Atlanta', 'Omaha', 'Colorado Springs', 'Raleigh'
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
  'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Sanchez',
  'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
  'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams'
];

interface Address {
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
}

interface Coupon {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed' | 'free_shipping';
  discount_value: number;
  minimum_order_amount: number | null;
  maximum_discount_amount: number | null;
  usage_limit: number | null;
  usage_count: number;
  valid_from: Date | null;
  valid_until: Date | null;
  is_active: boolean;
  region: 'us' | 'eu' | null;
}

export class TestOrderGenerator {
  private pool: Pool;
  private users: Array<{ id: number; email: string }> = [];
  private products: Array<{ id: number; name: string; sku: string; regular_price: number; sale_price: number | null }> = [];
  private coupons: Coupon[] = [];

  constructor() {
    this.pool = pool;
  }

  async generateOrders(count: number = 1000, closePool: boolean = true): Promise<void> {
    console.log(`🚀 Starting test order generation (${count} orders)...\n`);
    console.log('⚠️  WARNING: This is a DEV-ONLY script!\n');

    try {
      // Load users, products, and coupons
      await this.loadUsers();
      await this.loadProducts();
      await this.loadCoupons();

      if (this.users.length === 0) {
        console.error('❌ No users found in database. Please create at least one user first.');
        process.exit(1);
      }

      if (this.products.length === 0) {
        console.error('❌ No products found in database. Please import products first.');
        process.exit(1);
      }

      console.log(`✅ Loaded ${this.users.length} users, ${this.products.length} products, and ${this.coupons.length} coupons\n`);

      // Delete all existing orders
      console.log('🗑️  Deleting all existing orders...');
      await this.deleteAllOrders();
      console.log('✅ All existing orders deleted\n');

      // Generate orders
      const client = await this.pool.connect();
      let successCount = 0;
      let errorCount = 0;
      let couponUsageCount = 0;

      try {
        for (let i = 0; i < count; i++) {
          try {
            const usedCoupon = await this.generateOrder(client, i + 1);
            successCount++;
            if (usedCoupon) {
              couponUsageCount++;
            }
            
            // Progress indicator
            if ((i + 1) % 100 === 0) {
              console.log(`📦 Generated ${i + 1}/${count} orders...`);
            }
          } catch (error: any) {
            errorCount++;
            console.error(`❌ Error generating order ${i + 1}:`, error.message);
          }
        }
      } finally {
        client.release();
      }

      console.log('\n' + '='.repeat(60));
      console.log('📊 Generation Summary');
      console.log('='.repeat(60));
      console.log(`✅ Successfully generated: ${successCount} orders`);
      console.log(`🎫 Orders with coupons: ${couponUsageCount} (${((couponUsageCount / successCount) * 100).toFixed(1)}%)`);
      console.log(`❌ Failed: ${errorCount} orders`);
      console.log('='.repeat(60) + '\n');

    } catch (error: any) {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    } finally {
      if (closePool) {
        await this.pool.end();
      }
    }
  }

  private async loadUsers(): Promise<void> {
    const result = await this.pool.query(
      'SELECT id, email FROM users ORDER BY id'
    );
    this.users = result.rows;
  }

  private async loadProducts(): Promise<void> {
    const result = await this.pool.query(
      `SELECT id, name, sku, regular_price, sale_price 
       FROM products 
       WHERE in_stock = '1' AND stock > 0
       ORDER BY id`
    );
    this.products = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      regular_price: parseFloat(row.regular_price || '0'),
      sale_price: row.sale_price ? parseFloat(row.sale_price) : null
    }));
  }

  private async loadCoupons(): Promise<void> {
    const result = await this.pool.query(
      `SELECT id, code, discount_type, discount_value, minimum_order_amount, 
              maximum_discount_amount, usage_limit, usage_count, 
              valid_from, valid_until, is_active, region
       FROM coupons 
       WHERE is_active = true
       ORDER BY id`
    );
    this.coupons = result.rows.map(row => ({
      id: row.id,
      code: row.code,
      discount_type: row.discount_type,
      discount_value: parseFloat(row.discount_value || '0'),
      minimum_order_amount: row.minimum_order_amount ? parseFloat(row.minimum_order_amount) : null,
      maximum_discount_amount: row.maximum_discount_amount ? parseFloat(row.maximum_discount_amount) : null,
      usage_limit: row.usage_limit ? parseInt(row.usage_limit) : null,
      usage_count: parseInt(row.usage_count || '0'),
      valid_from: row.valid_from ? new Date(row.valid_from) : null,
      valid_until: row.valid_until ? new Date(row.valid_until) : null,
      is_active: row.is_active,
      region: row.region
    }));
  }

  private async deleteAllOrders(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Delete order items first (due to foreign key constraints)
      await client.query('DELETE FROM order_items');
      
      // Delete coupon usage records linked to orders
      await client.query('DELETE FROM coupon_usage WHERE order_id IS NOT NULL');
      
      // Delete order status history
      await client.query('DELETE FROM order_status_history');
      
      // Delete orders
      await client.query('DELETE FROM orders');
      
      // Reset coupon usage counts
      await client.query('UPDATE coupons SET usage_count = 0');
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private getRandomDateInCurrentMonth(): Date {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // Get first and last day of current month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999);
    
    // Random time between first and last day
    const randomTime = firstDay.getTime() + Math.random() * (lastDay.getTime() - firstDay.getTime());
    
    return new Date(randomTime);
  }

  private getValidCoupons(subtotal: number, region: 'us' | 'eu'): Coupon[] {
    const now = new Date();
    return this.coupons.filter(coupon => {
      // Check if active
      if (!coupon.is_active) return false;

      // Check region match
      if (coupon.region && coupon.region !== region) return false;

      // Check validity dates
      if (coupon.valid_from && now < coupon.valid_from) return false;
      if (coupon.valid_until && now > coupon.valid_until) return false;

      // Check minimum order amount
      if (coupon.minimum_order_amount && subtotal < coupon.minimum_order_amount) return false;

      // Check usage limit
      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) return false;

      return true;
    });
  }

  private calculateDiscount(coupon: Coupon, subtotal: number): number {
    let discount = 0;

    if (coupon.discount_type === 'percentage') {
      discount = (subtotal * coupon.discount_value) / 100;
    } else if (coupon.discount_type === 'fixed') {
      discount = coupon.discount_value;
    } else if (coupon.discount_type === 'free_shipping') {
      // Free shipping is handled separately, but we can still track it
      discount = 0; // Shipping discount is applied to shipping_amount, not discount_amount
    }

    // Apply maximum discount limit
    if (coupon.maximum_discount_amount && discount > coupon.maximum_discount_amount) {
      discount = coupon.maximum_discount_amount;
    }

    // Discount cannot exceed subtotal
    if (discount > subtotal) {
      discount = subtotal;
    }

    return Math.round(discount * 100) / 100;
  }

  private async generateOrder(client: any, orderNumber: number): Promise<boolean> {
    await client.query('BEGIN');

    try {
      // Pick random user
      const user = this.users[Math.floor(Math.random() * this.users.length)];

      // Pick 1-10 random products
      const itemCount = Math.floor(Math.random() * 10) + 1;
      const selectedProducts: typeof this.products = [];
      const productIds = new Set<number>();

      while (selectedProducts.length < itemCount && productIds.size < this.products.length) {
        const product = this.products[Math.floor(Math.random() * this.products.length)];
        if (!productIds.has(product.id)) {
          productIds.add(product.id);
          selectedProducts.push(product);
        }
      }

      if (selectedProducts.length === 0) {
        throw new Error('No products available');
      }

      // Generate random addresses
      const billingAddress = this.generateRandomAddress();
      const shippingAddress = this.generateRandomAddress();
      billingAddress.email = user.email;

      // Calculate order totals
      let subtotal = 0;
      const orderItems: Array<{
        product_id: number;
        product_name: string;
        product_sku: string;
        quantity: number;
        unit_price: number;
        total_price: number;
      }> = [];

      for (const product of selectedProducts) {
        const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 items per product
        const price = product.sale_price || product.regular_price;
        const unitPrice = price;
        const totalPrice = unitPrice * quantity;

        subtotal += totalPrice;

        orderItems.push({
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          quantity,
          unit_price: unitPrice,
          total_price: totalPrice
        });
      }

      // Determine region (US or EU based on country) - needed for coupon validation
      const region = billingAddress.country === 'US' ? 'us' : 'eu';

      // Calculate shipping and tax (random but reasonable)
      let shippingAmount = Math.round((Math.random() * 30 + 5) * 100) / 100; // $5-$35
      const taxAmount = Math.round(subtotal * (Math.random() * 0.1 + 0.05) * 100) / 100; // 5-15% tax
      
      // 10% chance to apply a random valid coupon
      let discountAmount = 0;
      let appliedCoupon: Coupon | null = null;
      
      if (Math.random() < 0.1) {
        const validCoupons = this.getValidCoupons(subtotal, region);
        if (validCoupons.length > 0) {
          appliedCoupon = validCoupons[Math.floor(Math.random() * validCoupons.length)];
          discountAmount = this.calculateDiscount(appliedCoupon, subtotal);
          
          // Handle free shipping
          if (appliedCoupon.discount_type === 'free_shipping') {
            discountAmount = shippingAmount; // Discount equals shipping cost
            shippingAmount = 0;
          }
        }
      }
      
      const totalAmount = subtotal + shippingAmount + taxAmount - discountAmount;
      
      // Generate random date in current month for order
      const orderDate = this.getRandomDateInCurrentMonth();

      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (
          user_id, status, payment_status, shipping_status,
          subtotal, tax_amount, shipping_amount, discount_amount, total_amount, currency, region,
          customer_email, customer_phone,
          billing_address, shipping_address,
          payment_method, shipping_method,
          package_size, is_international_shipping,
          created_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8, $9, $10, $11,
          $12, $13,
          $14, $15,
          $16, $17,
          $18, $19,
          $20
        )
        RETURNING id, order_number`,
        [
          user.id,                                    // $1 user_id
          OrderStatus.PROCESSING,                     // $2 status
          PaymentStatus.PAID,                         // $3 payment_status (paid so they show in analytics)
          'shipped',                                   // $4 shipping_status
          subtotal,                                    // $5 subtotal
          taxAmount,                                   // $6 tax_amount
          shippingAmount,                              // $7 shipping_amount
          discountAmount,                              // $8 discount_amount
          totalAmount,                                 // $9 total_amount
          region === 'eu' ? 'EUR' : 'USD',            // $10 currency
          region,                                      // $11 region
          user.email,                                 // $12 customer_email
          billingAddress.phone,                       // $13 customer_phone
          JSON.stringify(billingAddress),             // $14 billing_address
          JSON.stringify(shippingAddress),            // $15 shipping_address
          'paypal',                                   // $16 payment_method
          'standard',                                 // $17 shipping_method
          ['S', 'M', 'L'][Math.floor(Math.random() * 3)], // $18 package_size
          billingAddress.country !== 'US',            // $19 is_international_shipping
          orderDate                                    // $20 created_at (random date in current month)
        ]
      );

      const order = orderResult.rows[0];

      // Create order items
      for (const item of orderItems) {
        await client.query(
          `INSERT INTO order_items (
            order_id, product_id, product_name, product_sku,
            quantity, unit_price, total_price, configuration
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            order.id,
            item.product_id,
            item.product_name,
            item.product_sku,
            item.quantity,
            item.unit_price,
            item.total_price,
            JSON.stringify({})
          ]
        );
      }

      // Record coupon usage if a coupon was applied
      // Use the order's created_at date for used_at so analytics show usage spread across the month
      if (appliedCoupon && discountAmount > 0) {
        await client.query(
          `INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount_amount, used_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [appliedCoupon.id, user.id, order.id, discountAmount, orderDate]
        );

        // Update coupon usage count
        await client.query(
          `UPDATE coupons SET usage_count = usage_count + 1 WHERE id = $1`,
          [appliedCoupon.id]
        );
      }

      await client.query('COMMIT');
      return !!appliedCoupon; // Return true if coupon was used
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }

  private generateRandomAddress(): Address {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const city = US_CITIES[Math.floor(Math.random() * US_CITIES.length)];
    const state = US_STATES[Math.floor(Math.random() * US_STATES.length)];
    const postalCode = Math.floor(Math.random() * 90000) + 10000; // 5-digit zip

    // Random street address
    const streetNumber = Math.floor(Math.random() * 9999) + 1;
    const streetNames = [
      'Main St', 'Oak Ave', 'Park Blvd', 'Elm St', 'Maple Dr', 'Cedar Ln',
      'Pine St', 'Washington Ave', 'Lincoln Dr', 'Jefferson St', 'Madison Ave',
      'Broadway', 'First St', 'Second St', 'Third St', 'Fourth St', 'Fifth Ave'
    ];
    const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
    const addressLine1 = `${streetNumber} ${streetName}`;

    // Sometimes add address line 2
    const addressLine2 = Math.random() > 0.7 
      ? `Apt ${Math.floor(Math.random() * 500) + 1}`
      : undefined;

    // Random phone number
    const phone = `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;

    return {
      firstName,
      lastName,
      company: Math.random() > 0.8 ? `${lastName} Inc.` : undefined,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode: postalCode.toString(),
      country: 'US',
      phone
    };
  }
}

// Main execution (only if run directly, not when imported)
if (require.main === module) {
  const count = process.argv[2] ? parseInt(process.argv[2], 10) : 1000;

  if (isNaN(count) || count <= 0) {
    console.error('❌ Invalid count. Please provide a positive number.');
    process.exit(1);
  }

  const generator = new TestOrderGenerator();
  generator.generateOrders(count).catch(error => {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  });
}

