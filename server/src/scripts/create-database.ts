#!/usr/bin/env node

/**
 * Script to create the simfab_dev database if it doesn't exist
 * This works by connecting to PostgreSQL's default 'postgres' database first,
 * then creating the target database.
 * 
 * Usage: node create-database.js
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/simfab_dev';

// Parse connection string to extract database name
function parseConnectionString(connString: string): {
  user: string;
  password: string;
  host: string;
  port: number;
  database: string;
} {
  // Remove postgresql:// prefix
  const url = connString.replace(/^postgresql:\/\//, '');
  
  // Split into parts
  const parts = url.split('/');
  const dbName = parts[1] || 'simfab_dev';
  
  // Parse user:password@host:port
  const authHost = parts[0];
  const [auth, hostPort] = authHost.split('@');
  const [user, password] = auth.split(':');
  const [host, port] = (hostPort || 'localhost:5432').split(':');
  
  return {
    user: user || 'postgres',
    password: password || '',
    host: host || 'localhost',
    port: parseInt(port || '5432'),
    database: dbName
  };
}

async function createDatabaseIfNotExists(): Promise<void> {
  const config = parseConnectionString(connectionString);
  const targetDb = config.database;
  
  console.log(`🔍 Checking if database '${targetDb}' exists...`);
  console.log(`   Host: ${config.host}:${config.port}`);
  console.log(`   User: ${config.user}`);
  console.log(`   Target Database: ${targetDb}`);
  console.log('');
  
  // Connect to PostgreSQL's default 'postgres' database to create the target database
  const adminPool = new Pool({
    user: config.user,
    password: config.password,
    host: config.host,
    port: config.port,
    database: 'postgres', // Connect to default database
    connectionTimeoutMillis: 10000,
  });
  
  try {
    // Check if database exists
    const checkResult = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [targetDb]
    );
    
    if (checkResult.rows.length > 0) {
      console.log(`✅ Database '${targetDb}' already exists`);
      await adminPool.end();
      return;
    }
    
    // Create the database
    console.log(`🔧 Creating database '${targetDb}'...`);
    await adminPool.query(`CREATE DATABASE ${targetDb}`);
    console.log(`✅ Database '${targetDb}' created successfully`);
    
    await adminPool.end();
    
    // Verify by connecting to the new database
    console.log(`🔍 Verifying database connection...`);
    const verifyPool = new Pool({
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      database: targetDb,
      connectionTimeoutMillis: 10000,
    });
    
    await verifyPool.query('SELECT 1');
    console.log(`✅ Database '${targetDb}' is accessible`);
    await verifyPool.end();
    
    console.log('');
    console.log('✅ Database setup complete!');
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Run migrations: npm run migrate:up');
    console.log('   2. Or restart the server to run migrations automatically');
    console.log('');
    
  } catch (error: any) {
    await adminPool.end();
    
    if (error.code === '3D000') {
      console.error(`❌ Database '${targetDb}' does not exist and could not be created`);
      console.error(`   Error: ${error.message}`);
      console.error('');
      console.error('💡 Troubleshooting:');
      console.error('   1. Make sure PostgreSQL is running');
      console.error('   2. Check that the user has CREATE DATABASE privileges');
      console.error('   3. Verify DATABASE_URL is correct');
      process.exit(1);
    } else if (error.code === 'ECONNREFUSED') {
      console.error(`❌ Could not connect to PostgreSQL at ${config.host}:${config.port}`);
      console.error(`   Error: ${error.message}`);
      console.error('');
      console.error('💡 Troubleshooting:');
      console.error('   1. Make sure PostgreSQL is running');
      console.error('   2. Check that the host and port are correct');
      process.exit(1);
    } else if (error.code === '28P01') {
      console.error(`❌ Authentication failed for user '${config.user}'`);
      console.error(`   Error: ${error.message}`);
      console.error('');
      console.error('💡 Troubleshooting:');
      console.error('   1. Check that the password is correct');
      console.error('   2. Verify DATABASE_URL credentials');
      process.exit(1);
    } else {
      console.error(`❌ Unexpected error: ${error.message}`);
      console.error(`   Code: ${error.code}`);
      process.exit(1);
    }
  }
}

// Run the script
createDatabaseIfNotExists().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

