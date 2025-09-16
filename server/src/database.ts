import sqlite3 from 'sqlite3';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export interface Product {
  id?: number;
  type?: string;
  sku: string;
  gtin_upc_ean_isbn?: string;
  name: string;
  published?: string;
  is_featured?: string;
  visibility_in_catalog?: string;
  short_description?: string;
  description?: string;
  date_sale_price_starts?: string;
  date_sale_price_ends?: string;
  tax_status?: string;
  tax_class?: string;
  in_stock?: string;
  stock?: number;
  low_stock_amount?: number;
  backorders_allowed?: string;
  sold_individually?: string;
  weight_lbs?: number;
  length_in?: number;
  width_in?: number;
  height_in?: number;
  allow_customer_reviews?: string;
  purchase_note?: string;
  sale_price?: number;
  regular_price?: number;
  categories?: string;
  tags?: string;
  shipping_class?: string;
  images?: string;
  brands?: string;
  created_at?: string;
  updated_at?: string;
}

// Database interface for both SQLite and PostgreSQL
interface DatabaseInterface {
  initDatabase(): Promise<void>;
  dropProductsTable(): Promise<void>;
  insertProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<void>;
  getAllProducts(): Promise<Product[]>;
  getProductById(id: number): Promise<Product | null>;
  close(): void;
}

// SQLite implementation for development
class SQLiteDatabase implements DatabaseInterface {
  private db: sqlite3.Database;

  constructor() {
    // Ensure data directory exists
    const dataDir = './data';
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const dbPath = path.join(dataDir, 'products.db');
    this.db = new sqlite3.Database(dbPath);
  }

  async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT,
          sku TEXT UNIQUE NOT NULL,
          gtin_upc_ean_isbn TEXT,
          name TEXT NOT NULL,
          published TEXT,
          is_featured TEXT,
          visibility_in_catalog TEXT,
          short_description TEXT,
          description TEXT,
          date_sale_price_starts TEXT,
          date_sale_price_ends TEXT,
          tax_status TEXT,
          tax_class TEXT,
          in_stock TEXT,
          stock INTEGER DEFAULT 0,
          low_stock_amount INTEGER,
          backorders_allowed TEXT,
          sold_individually TEXT,
          weight_lbs REAL,
          length_in REAL,
          width_in REAL,
          height_in REAL,
          allow_customer_reviews TEXT,
          purchase_note TEXT,
          sale_price REAL,
          regular_price REAL,
          categories TEXT,
          tags TEXT,
          shipping_class TEXT,
          images TEXT,
          brands TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error initializing SQLite database:', err);
          reject(err);
        } else {
          console.log('SQLite database initialized successfully');
          resolve();
        }
      });
    });
  }

  async dropProductsTable(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DROP TABLE IF EXISTS products', (err) => {
        if (err) {
          console.error('Error dropping products table:', err);
          reject(err);
        } else {
          console.log('Products table dropped successfully');
          this.initDatabase();
          resolve();
        }
      });
    });
  }

  async insertProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO products (
          type, sku, gtin_upc_ean_isbn, name, published, is_featured, visibility_in_catalog,
          short_description, description, date_sale_price_starts, date_sale_price_ends,
          tax_status, tax_class, in_stock, stock, low_stock_amount, backorders_allowed,
          sold_individually, weight_lbs, length_in, width_in, height_in, allow_customer_reviews,
          purchase_note, sale_price, regular_price, categories, tags, shipping_class,
          images, brands
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        product.type, product.sku, product.gtin_upc_ean_isbn, product.name, product.published,
        product.is_featured, product.visibility_in_catalog, product.short_description,
        product.description, product.date_sale_price_starts, product.date_sale_price_ends,
        product.tax_status, product.tax_class, product.in_stock, product.stock,
        product.low_stock_amount, product.backorders_allowed, product.sold_individually,
        product.weight_lbs, product.length_in, product.width_in, product.height_in,
        product.allow_customer_reviews, product.purchase_note, product.sale_price,
        product.regular_price, product.categories, product.tags, product.shipping_class,
        product.images, product.brands
      ], (err) => {
        if (err) {
          console.error('Error inserting product:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async getAllProducts(): Promise<Product[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM products ORDER BY created_at DESC', (err, rows) => {
        if (err) {
          console.error('Error fetching products:', err);
          reject(err);
        } else {
          resolve(rows as Product[]);
        }
      });
    });
  }

  async getProductById(id: number): Promise<Product | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
        if (err) {
          console.error('Error fetching product by ID:', err);
          reject(err);
        } else {
          resolve(row as Product || null);
        }
      });
    });
  }

  close(): void {
    this.db.close();
  }
}

// PostgreSQL implementation for production
class PostgreSQLDatabase implements DatabaseInterface {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async initDatabase(): Promise<void> {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          type TEXT,
          sku TEXT UNIQUE NOT NULL,
          gtin_upc_ean_isbn TEXT,
          name TEXT NOT NULL,
          published TEXT,
          is_featured TEXT,
          visibility_in_catalog TEXT,
          short_description TEXT,
          description TEXT,
          date_sale_price_starts TEXT,
          date_sale_price_ends TEXT,
          tax_status TEXT,
          tax_class TEXT,
          in_stock TEXT,
          stock INTEGER DEFAULT 0,
          low_stock_amount INTEGER,
          backorders_allowed TEXT,
          sold_individually TEXT,
          weight_lbs REAL,
          length_in REAL,
          width_in REAL,
          height_in REAL,
          allow_customer_reviews TEXT,
          purchase_note TEXT,
          sale_price REAL,
          regular_price REAL,
          categories TEXT,
          tags TEXT,
          shipping_class TEXT,
          images TEXT,
          brands TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('PostgreSQL database initialized successfully');
    } catch (err) {
      console.error('Error initializing PostgreSQL database:', err);
      throw err;
    }
  }

  async dropProductsTable(): Promise<void> {
    try {
      await this.pool.query('DROP TABLE IF EXISTS products');
      console.log('Products table dropped successfully');
      await this.initDatabase();
    } catch (err) {
      console.error('Error dropping products table:', err);
      throw err;
    }
  }

  async insertProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    try {
      await this.pool.query(`
        INSERT INTO products (
          type, sku, gtin_upc_ean_isbn, name, published, is_featured, visibility_in_catalog,
          short_description, description, date_sale_price_starts, date_sale_price_ends,
          tax_status, tax_class, in_stock, stock, low_stock_amount, backorders_allowed,
          sold_individually, weight_lbs, length_in, width_in, height_in, allow_customer_reviews,
          purchase_note, sale_price, regular_price, categories, tags, shipping_class,
          images, brands
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
      `, [
        product.type, product.sku, product.gtin_upc_ean_isbn, product.name, product.published,
        product.is_featured, product.visibility_in_catalog, product.short_description,
        product.description, product.date_sale_price_starts, product.date_sale_price_ends,
        product.tax_status, product.tax_class, product.in_stock, product.stock,
        product.low_stock_amount, product.backorders_allowed, product.sold_individually,
        product.weight_lbs, product.length_in, product.width_in, product.height_in,
        product.allow_customer_reviews, product.purchase_note, product.sale_price,
        product.regular_price, product.categories, product.tags, product.shipping_class,
        product.images, product.brands
      ]);
    } catch (err) {
      console.error('Error inserting product:', err);
      throw err;
    }
  }

  async getAllProducts(): Promise<Product[]> {
    try {
      const result = await this.pool.query('SELECT * FROM products ORDER BY created_at DESC');
      return result.rows;
    } catch (err) {
      console.error('Error fetching products:', err);
      throw err;
    }
  }

  async getProductById(id: number): Promise<Product | null> {
    try {
      const result = await this.pool.query('SELECT * FROM products WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (err) {
      console.error('Error fetching product by ID:', err);
      throw err;
    }
  }

  close(): void {
    this.pool.end();
  }
}

// Factory function to create the appropriate database instance
function createDatabase(): DatabaseInterface {
  if (process.env.DATABASE_URL) {
    console.log('Using PostgreSQL database (production)');
    return new PostgreSQLDatabase();
  } else {
    console.log('Using SQLite database (development)');
    return new SQLiteDatabase();
  }
}

export const database = createDatabase();