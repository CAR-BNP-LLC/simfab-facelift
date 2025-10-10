import { Pool } from 'pg';
import { pool } from '../config/database';
import fs from 'fs';
import path from 'path';

interface Migration {
  id: number;
  name: string;
  executed_at: Date;
}

class MigrationRunner {
  private pool: Pool;

  constructor(dbPool: Pool) {
    this.pool = dbPool;
  }

  async init(): Promise<void> {
    // Create migrations tracking table if it doesn't exist
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Migrations table initialized');
  }

  async getExecutedMigrations(): Promise<Migration[]> {
    const result = await this.pool.query<Migration>(
      'SELECT * FROM migrations ORDER BY id ASC'
    );
    return result.rows;
  }

  async markMigrationExecuted(name: string): Promise<void> {
    await this.pool.query(
      'INSERT INTO migrations (name) VALUES ($1)',
      [name]
    );
  }

  async isMigrationExecuted(name: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT COUNT(*) FROM migrations WHERE name = $1',
      [name]
    );
    return parseInt(result.rows[0].count) > 0;
  }

  async executeMigration(filePath: string, fileName: string): Promise<void> {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    try {
      console.log(`\n🔄 Executing migration: ${fileName}`);
      await this.pool.query('BEGIN');
      await this.pool.query(sql);
      await this.markMigrationExecuted(fileName);
      await this.pool.query('COMMIT');
      console.log(`✅ Migration completed: ${fileName}`);
    } catch (error) {
      await this.pool.query('ROLLBACK');
      console.error(`❌ Migration failed: ${fileName}`);
      throw error;
    }
  }

  async runMigrations(): Promise<void> {
    await this.init();

    const migrationsDir = path.join(__dirname, 'sql');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ensure migrations run in order

    console.log(`\n📦 Found ${files.length} migration files`);

    for (const file of files) {
      const isExecuted = await this.isMigrationExecuted(file);
      
      if (isExecuted) {
        console.log(`⏭️  Skipping already executed: ${file}`);
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      await this.executeMigration(filePath, file);
    }

    console.log('\n✅ All migrations completed successfully!\n');
  }

  async rollback(steps: number = 1): Promise<void> {
    const executed = await this.getExecutedMigrations();
    
    if (executed.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    const toRollback = executed.slice(-steps);
    
    for (const migration of toRollback.reverse()) {
      console.log(`\n🔄 Rolling back: ${migration.name}`);
      
      // Check for rollback file
      const rollbackFile = migration.name.replace('.sql', '.rollback.sql');
      const rollbackPath = path.join(__dirname, 'sql', rollbackFile);
      
      if (fs.existsSync(rollbackPath)) {
        const sql = fs.readFileSync(rollbackPath, 'utf8');
        
        try {
          await this.pool.query('BEGIN');
          await this.pool.query(sql);
          await this.pool.query('DELETE FROM migrations WHERE name = $1', [migration.name]);
          await this.pool.query('COMMIT');
          console.log(`✅ Rollback completed: ${migration.name}`);
        } catch (error) {
          await this.pool.query('ROLLBACK');
          console.error(`❌ Rollback failed: ${migration.name}`);
          throw error;
        }
      } else {
        console.log(`⚠️  No rollback file found for: ${migration.name}`);
      }
    }
  }

  async status(): Promise<void> {
    await this.init();
    
    const executed = await this.getExecutedMigrations();
    const migrationsDir = path.join(__dirname, 'sql');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql') && !file.includes('.rollback.'))
      .sort();

    console.log('\n📊 Migration Status:\n');
    console.log('ID  | Status    | Name');
    console.log('----+-----------+------------------------');

    let id = 1;
    for (const file of files) {
      const isExecuted = executed.some(m => m.name === file);
      const status = isExecuted ? '✅ Executed' : '⏸️  Pending';
      console.log(`${id.toString().padStart(3)} | ${status} | ${file}`);
      id++;
    }
    
    console.log('\n');
  }
}

// CLI interface
const command = process.argv[2];
const runner = new MigrationRunner(pool);

(async () => {
  try {
    switch (command) {
      case 'up':
        await runner.runMigrations();
        break;
      case 'down':
        const steps = parseInt(process.argv[3]) || 1;
        await runner.rollback(steps);
        break;
      case 'status':
        await runner.status();
        break;
      default:
        console.log(`
Usage: ts-node migrate.ts [command]

Commands:
  up              Run all pending migrations
  down [steps]    Rollback migrations (default: 1 step)
  status          Show migration status
        `);
    }
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
})();

export default MigrationRunner;


