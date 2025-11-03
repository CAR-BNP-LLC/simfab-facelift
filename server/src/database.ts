import { Pool } from 'pg';

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

class Database {
  private pool: Pool;

  constructor() {
    // Use DATABASE_URL for production (Heroku), or local PostgreSQL for development
    const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/simfab_dev';
    
    this.pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 30000, // 30 seconds timeout for resource-constrained environments
    });
    
    // Initialize database tables
    this.initDatabase().catch(err => {
      console.error('Failed to initialize database:', err);
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

export const database = new Database();