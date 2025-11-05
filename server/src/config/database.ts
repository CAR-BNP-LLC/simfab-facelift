import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Determine if database is local (doesn't support SSL) or remote (requires SSL)
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/simfab_dev';

// Export helper function to determine if database is local
export function isLocalDatabase(connString: string): boolean {
  return connString.includes('localhost') || 
         connString.includes('127.0.0.1') || 
         connString.includes('@postgres:') || // Docker container name
         connString.includes('@postgresql:'); // Alternative container name
}

// Export helper function to determine SSL config
export function getSSLConfig(connString: string): false | { rejectUnauthorized: false } {
  // SSL configuration:
  // - Local databases (localhost, Docker containers): No SSL (they don't support it)
  // - Remote databases (Heroku, AWS RDS, etc.): SSL required in production
  const isLocal = isLocalDatabase(connString);
  const useSSL = !isLocal && process.env.NODE_ENV === 'production';
  return useSSL ? { rejectUnauthorized: false } : false;
}

const useSSL = getSSLConfig(connectionString);

const poolConfig: PoolConfig = {
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 30000, // Return an error after 30 seconds if connection could not be established (increased from 2s for resource-constrained environments)
};

export const pool = new Pool(poolConfig);

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('Database connection established successfully');
    return true;
  } catch (err) {
    console.error('Database connection failed:', err);
    return false;
  }
};

export default pool;


