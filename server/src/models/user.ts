import sqlite3 from 'sqlite3';

export interface User {
  id?: number;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
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
  subscribed_at: string;
  is_active: boolean;
  created_at?: string;
}

class UserModel {
  private db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
    this.initTables();
  }

  private initTables(): void {
    // Create users table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating users table:', err);
      } else {
        console.log('Users table created successfully');
      }
    });

    // Create password_resets table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        reset_code TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        used BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        console.error('Error creating password_resets table:', err);
      } else {
        console.log('Password resets table created successfully');
      }
    });

    // Create newsletter_subscriptions table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        subscribed_at DATETIME NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating newsletter_subscriptions table:', err);
      } else {
        console.log('Newsletter subscriptions table created successfully');
      }
    });
  }

  // User methods
  async createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    return new Promise((resolve, reject) => {
      const db = this.db;
      this.db.run(`
        INSERT INTO users (email, password, first_name, last_name, is_active)
        VALUES (?, ?, ?, ?, ?)
      `, [user.email, user.password, user.first_name, user.last_name, user.is_active], function(err: any) {
        if (err) {
          reject(err);
        } else {
          // Get the created user
          db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err: any, row: any) => {
            if (err) {
              reject(err);
            } else {
              resolve(row as User);
            }
          });
        }
      });
    });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as User || null);
        }
      });
    });
  }

  async getUserById(id: number): Promise<User | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as User || null);
        }
      });
    });
  }

  async updateUserPassword(id: number, hashedPassword: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        UPDATE users 
        SET password = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [hashedPassword, id], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // Password reset methods
  async createPasswordReset(userId: number, resetCode: string, expiresAt: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO password_resets (user_id, reset_code, expires_at)
        VALUES (?, ?, ?)
      `, [userId, resetCode, expiresAt], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async getPasswordResetByCode(resetCode: string): Promise<PasswordReset | null> {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT * FROM password_resets 
        WHERE reset_code = ? AND used = 0 AND expires_at > datetime('now')
      `, [resetCode], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as PasswordReset || null);
        }
      });
    });
  }

  async markPasswordResetAsUsed(resetCode: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        UPDATE password_resets 
        SET used = 1 
        WHERE reset_code = ?
      `, [resetCode], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // Newsletter subscription methods
  async subscribeToNewsletter(email: string, subscribedAt: string): Promise<NewsletterSubscription> {
    return new Promise((resolve, reject) => {
      const db = this.db;
      this.db.run(`
        INSERT OR REPLACE INTO newsletter_subscriptions (email, subscribed_at, is_active)
        VALUES (?, ?, 1)
      `, [email, subscribedAt], function(err: any) {
        if (err) {
          reject(err);
        } else {
          // Get the subscription
          db.get('SELECT * FROM newsletter_subscriptions WHERE email = ?', [email], (err: any, row: any) => {
            if (err) {
              reject(err);
            } else {
              resolve(row as NewsletterSubscription);
            }
          });
        }
      });
    });
  }

  async unsubscribeFromNewsletter(email: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        UPDATE newsletter_subscriptions 
        SET is_active = 0 
        WHERE email = ?
      `, [email], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async getNewsletterSubscription(email: string): Promise<NewsletterSubscription | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM newsletter_subscriptions WHERE email = ?', [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as NewsletterSubscription || null);
        }
      });
    });
  }
}

export default UserModel;
