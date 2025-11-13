import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_CONNECTION = 'postgresql://localhost:5432/simfab_dev';
const FORBIDDEN_DATABASES = new Set(['template0', 'template1']);

// Determine if database is local (doesn't support SSL) or remote (requires SSL)
const connectionString = process.env.DATABASE_URL || DEFAULT_CONNECTION;

function getDatabaseName(connString: string): string | null {
  try {
    const url = new URL(connString);
    return url.pathname.replace(/^\//, '') || null;
  } catch {
    return null;
  }
}

function validateConnectionString(connString: string): void {
  const dbName = getDatabaseName(connString);

  if (!dbName) {
    console.warn(
      'Unable to determine database name from connection string. Proceeding without validation.'
    );
    return;
  }

  if (FORBIDDEN_DATABASES.has(dbName)) {
    throw new Error(
      `Refusing to connect to protected database '${dbName}'. Update DATABASE_URL to point to your application database.`
    );
  }
}

validateConnectionString(connectionString);

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

async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function ensureDatabaseReady(
  retries = 5,
  initialDelayMs = 1000,
  maxDelayMs = 15000
): Promise<void> {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      if (attempt > 0) {
        console.info(`Database connection established after ${attempt + 1} attempts.`);
      }
      return;
    } catch (err) {
      attempt += 1;
      const delay = Math.min(initialDelayMs * Math.pow(2, attempt - 1), maxDelayMs);

      if (attempt > retries) {
        console.error(
          `Database health check failed after ${attempt} attempts. Giving up.`,
          err
        );
        throw err;
      }

      console.warn(
        `Database not ready (attempt ${attempt}/${retries}). Retrying in ${delay}ms...`,
        err instanceof Error ? err.message : err
      );
      await wait(delay);
    }
  }
}

void ensureDatabaseReady().catch((err) => {
  console.error('Database failed health check during startup:', err);
});

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


