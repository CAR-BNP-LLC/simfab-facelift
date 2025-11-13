/**
 * Generate Test Coupons Script (DEV ONLY)
 * Generates 15 random test coupons
 * 
 * WARNING: This script is for development only.
 * 
 * Usage: NODE_ENV=development ts-node src/scripts/generate-test-coupons.ts [count]
 * 
 * @param count - Number of coupons to generate (default: 15)
 */

import { Pool } from 'pg';
import { pool } from '../config/database';

// Safety check - only run in development
if (process.env.NODE_ENV === 'production') {
  console.error('❌ ERROR: This script can only be run in development mode!');
  console.error('Set NODE_ENV=development to run this script.');
  process.exit(1);
}

const COUPON_PREFIXES = [
  'SAVE', 'DEAL', 'OFF', 'DISCOUNT', 'PROMO', 'SPECIAL', 'WELCOME', 'SUMMER',
  'WINTER', 'SPRING', 'FALL', 'HOLIDAY', 'NEW', 'VIP', 'FLASH', 'MEGA',
  'BONUS', 'EXTRA', 'SUPER', 'ULTRA', 'MAX', 'BIG', 'MEGA', 'EPIC'
];

const COUPON_SUFFIXES = [
  '2024', '2025', 'NOW', 'TODAY', 'SALE', 'DEAL', 'CODE', 'PROMO',
  'SPECIAL', 'OFFER', 'SAVINGS', 'DISCOUNT', 'BONUS', 'EXTRA', 'VIP'
];

export class TestCouponGenerator {
  private pool: Pool;
  private usedCodes = new Set<string>();

  constructor() {
    this.pool = pool;
  }

  async generateCoupons(count: number = 15, closePool: boolean = true): Promise<void> {
    console.log(`🚀 Starting test coupon generation (${count} coupons)...\n`);
    console.log('⚠️  WARNING: This is a DEV-ONLY script!\n');

    try {
      // Load existing coupon codes to avoid conflicts
      const existingResult = await this.pool.query('SELECT code FROM coupons');
      existingResult.rows.forEach((row: any) => {
        this.usedCodes.add(row.code.toUpperCase());
      });

      const client = await this.pool.connect();
      let successCount = 0;
      let errorCount = 0;

      try {
        for (let i = 0; i < count; i++) {
          try {
            const coupon = this.generateRandomCoupon();
            this.usedCodes.add(coupon.code.toUpperCase());

            await client.query(
              `INSERT INTO coupons (
                code, discount_type, discount_value, description,
                minimum_order_amount, maximum_discount_amount, usage_limit,
                per_user_limit, valid_from, valid_until, is_active, region
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
              [
                coupon.code,
                coupon.type,
                coupon.value,
                coupon.description,
                coupon.minimum_order_amount,
                coupon.maximum_discount_amount,
                coupon.usage_limit,
                coupon.per_user_limit,
                coupon.valid_from,
                coupon.valid_until,
                true, // is_active
                coupon.region
              ]
            );

            successCount++;
            console.log(`✅ Created coupon: ${coupon.code} (${coupon.type})`);
          } catch (error: any) {
            errorCount++;
            if (error.code !== '23505') { // Ignore duplicate code errors
              console.error(`❌ Error generating coupon ${i + 1}:`, error.message);
            }
          }
        }
      } finally {
        client.release();
      }

      console.log('\n' + '='.repeat(60));
      console.log('📊 Generation Summary');
      console.log('='.repeat(60));
      console.log(`✅ Successfully generated: ${successCount} coupons`);
      console.log(`❌ Failed: ${errorCount} coupons`);
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

  private generateRandomCoupon(): {
    code: string;
    type: 'percentage' | 'fixed' | 'free_shipping';
    value: number;
    description: string;
    minimum_order_amount: number | null;
    maximum_discount_amount: number | null;
    usage_limit: number | null;
    per_user_limit: number;
    valid_from: Date | null;
    valid_until: Date | null;
    region: 'us' | 'eu';
  } {
    // Generate unique code
    let code: string;
    let attempts = 0;
    do {
      const prefix = COUPON_PREFIXES[Math.floor(Math.random() * COUPON_PREFIXES.length)];
      const suffix = COUPON_SUFFIXES[Math.floor(Math.random() * COUPON_SUFFIXES.length)];
      const randomNum = Math.floor(Math.random() * 100);
      code = `${prefix}${randomNum}${suffix}`;
      attempts++;
      if (attempts > 100) {
        code = `COUPON${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        break;
      }
    } while (this.usedCodes.has(code.toUpperCase()));

    // Random coupon type
    const types: Array<'percentage' | 'fixed' | 'free_shipping'> = ['percentage', 'fixed', 'free_shipping'];
    const type = types[Math.floor(Math.random() * types.length)];

    // Generate value based on type
    let value: number;
    if (type === 'percentage') {
      value = Math.floor(Math.random() * 50) + 5; // 5-55%
    } else if (type === 'fixed') {
      value = Math.floor(Math.random() * 100) + 5; // $5-$105
    } else {
      value = 0; // free_shipping
    }

    // Random region
    const region = Math.random() > 0.5 ? 'us' : 'eu';

    // Random validity (some active, some future, some expired)
    const now = new Date();
    let valid_from: Date | null = null;
    let valid_until: Date | null = null;
    
    const validityType = Math.random();
    if (validityType < 0.7) {
      // 70% active now
      valid_from = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Started up to 30 days ago
      valid_until = new Date(now.getTime() + Math.random() * 60 * 24 * 60 * 60 * 1000); // Expires in up to 60 days
    } else if (validityType < 0.85) {
      // 15% future
      valid_from = new Date(now.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);
      valid_until = new Date(valid_from.getTime() + Math.random() * 60 * 24 * 60 * 60 * 1000);
    } else {
      // 15% expired
      valid_from = new Date(now.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000 - 30 * 24 * 60 * 60 * 1000);
      valid_until = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    }

    // Random limits
    const usage_limit = Math.random() > 0.5 ? Math.floor(Math.random() * 1000) + 50 : null;
    const per_user_limit = Math.floor(Math.random() * 3) + 1; // 1-3 uses per user
    const minimum_order_amount = Math.random() > 0.6 ? Math.floor(Math.random() * 200) + 25 : null; // $25-$225
    const maximum_discount_amount = type === 'percentage' && Math.random() > 0.5 
      ? Math.floor(Math.random() * 100) + 25 
      : null; // $25-$125 max discount

    const descriptions = [
      `Special ${type === 'percentage' ? `${value}%` : type === 'fixed' ? `$${value}` : 'free shipping'} discount`,
      `Limited time offer - ${type === 'percentage' ? `${value}%` : type === 'fixed' ? `$${value}` : 'free shipping'} off`,
      `Exclusive ${type === 'percentage' ? `${value}%` : type === 'fixed' ? `$${value}` : 'free shipping'} promotion`,
      `Save ${type === 'percentage' ? `${value}%` : type === 'fixed' ? `$${value}` : 'on shipping'} today!`,
      `Get ${type === 'percentage' ? `${value}%` : type === 'fixed' ? `$${value}` : 'free shipping'} off your order`
    ];

    return {
      code,
      type,
      value,
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      minimum_order_amount,
      maximum_discount_amount,
      usage_limit,
      per_user_limit,
      valid_from,
      valid_until,
      region
    };
  }
}

// Main execution (only if run directly, not when imported)
if (require.main === module) {
  const count = process.argv[2] ? parseInt(process.argv[2], 10) : 15;

  if (isNaN(count) || count <= 0) {
    console.error('❌ Invalid count. Please provide a positive number.');
    process.exit(1);
  }

  const generator = new TestCouponGenerator();
  generator.generateCoupons(count).catch(error => {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  });
}

