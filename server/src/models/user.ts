import { Pool } from 'pg';

export interface User {
  id?: number;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  created_at?: string;
  updated_at?: string;
}

export interface PasswordReset {
  id?: number;
  user_id: number;
  reset_code: string;
  expires_at: string;
  used: boolean;
  created_at?: string;
}

export interface NewsletterSubscription {
  id?: number;
  email: string;
  verification_token?: string;
  verified_at?: string;
  status?: string;
  source?: string;
  preferences?: any;
  created_at?: string;
  updated_at?: string;
}

class UserModel {
  private pool: Pool;

  constructor() {
    // Use DATABASE_URL for production (Heroku), or local PostgreSQL for development
    const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/simfab_dev';
    
    this.pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 30000, // 30 seconds timeout for resource-constrained environments
    });
    
    // Start initialization with retry logic (don't await - let it run in background)
    this.initTablesWithRetry().catch(err => {
      console.error('Failed to initialize UserModel tables after retries:', err);
      // Don't throw - let the app continue and retry on next request
    });
  }

  /**
   * Retry helper with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 10,
    initialDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        const delay = initialDelay * Math.pow(2, attempt);
        
        // Only retry on connection errors
        if (error instanceof Error && (
          error.message.includes('connection') ||
          error.message.includes('timeout') ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('terminated')
        )) {
          console.log(`⚠️  Database connection attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // For non-connection errors, throw immediately
        throw error;
      }
    }
    
    throw lastError!;
  }

  private async initTablesWithRetry(): Promise<void> {
    await this.retryWithBackoff(async () => {
      await this.initTables();
    }, 10, 2000); // 10 retries, starting with 2 second delay
  }

  private async initTables(): Promise<void> {
    // Test connection first
    await this.pool.query('SELECT 1');
    
    // Create users table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created successfully');

    // Create password_resets table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        reset_code TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Password resets table created successfully');

    // Create newsletter_subscriptions table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        subscribed_at TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Newsletter subscriptions table created successfully');
  }

  // User methods
  async createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    try {
      const result = await this.pool.query(`
        INSERT INTO users (email, password, first_name, last_name)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [user.email, user.password, user.first_name, user.last_name]);
      
      return result.rows[0];
    } catch (err) {
      console.error('Error creating user:', err);
      throw err;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
      return result.rows[0] || null;
    } catch (err) {
      console.error('Error getting user by email:', err);
      throw err;
    }
  }

  async getUserById(id: number): Promise<User | null> {
    try {
      const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (err) {
      console.error('Error getting user by ID:', err);
      throw err;
    }
  }

  async updateUserPassword(id: number, hashedPassword: string): Promise<void> {
    try {
      await this.pool.query(`
        UPDATE users 
        SET password = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [hashedPassword, id]);
    } catch (err) {
      console.error('Error updating user password:', err);
      throw err;
    }
  }

  // Password reset methods
  async createPasswordReset(userId: number, resetCode: string, expiresAt: string): Promise<void> {
    try {
      await this.pool.query(`
        INSERT INTO password_resets (user_id, reset_code, expires_at)
        VALUES ($1, $2, $3)
      `, [userId, resetCode, expiresAt]);
    } catch (err) {
      console.error('Error creating password reset:', err);
      throw err;
    }
  }

  async getPasswordResetByCode(resetCode: string): Promise<PasswordReset | null> {
    try {
      const result = await this.pool.query(`
        SELECT * FROM password_resets 
        WHERE reset_code = $1 AND used = false AND expires_at > NOW()
      `, [resetCode]);
      return result.rows[0] || null;
    } catch (err) {
      console.error('Error getting password reset by code:', err);
      throw err;
    }
  }

  async markPasswordResetAsUsed(resetCode: string): Promise<void> {
    try {
      await this.pool.query(`
        UPDATE password_resets 
        SET used = true 
        WHERE reset_code = $1
      `, [resetCode]);
    } catch (err) {
      console.error('Error marking password reset as used:', err);
      throw err;
    }
  }

  // Newsletter subscription methods
  async subscribeToNewsletter(email: string, subscribedAt: string): Promise<NewsletterSubscription> {
    try {
      const result = await this.pool.query(`
        INSERT INTO newsletter_subscriptions (email, status, source)
        VALUES ($1, 'active', 'website')
        ON CONFLICT (email) 
        DO UPDATE SET status = 'active', updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [email]);
      
      return result.rows[0];
    } catch (err) {
      console.error('Error subscribing to newsletter:', err);
      throw err;
    }
  }

  async unsubscribeFromNewsletter(email: string): Promise<void> {
    try {
      await this.pool.query(`
        UPDATE newsletter_subscriptions 
        SET status = 'unsubscribed', updated_at = CURRENT_TIMESTAMP
        WHERE email = $1
      `, [email]);
    } catch (err) {
      console.error('Error unsubscribing from newsletter:', err);
      throw err;
    }
  }

  async getNewsletterSubscription(email: string): Promise<NewsletterSubscription | null> {
    try {
      const result = await this.pool.query('SELECT * FROM newsletter_subscriptions WHERE email = $1', [email]);
      return result.rows[0] || null;
    } catch (err) {
      console.error('Error getting newsletter subscription:', err);
      throw err;
    }
  }
}

export default UserModel;