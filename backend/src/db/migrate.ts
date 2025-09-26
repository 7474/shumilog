#!/usr/bin/env node
/**
 * Database migration and initialization script aligned with minimal D1 schema
 */

import { Database } from './database.js';
import { DATABASE_SCHEMAS } from './schema.sql.js';
import { seedDatabase, isDatabaseSeeded } from './seeds.sql.js';

interface MigrationConfig {
  databasePath: string;
  force?: boolean;
  seedData?: boolean;
}

/**
 * Execute database migrations and initialization
 */
async function migrate(config: MigrationConfig): Promise<void> {
  console.log('Starting database migration...');
  console.log(`Database path: ${config.databasePath}`);

  try {
    const db = new Database({ databasePath: config.databasePath });
    
    // Drop existing schema if force flag is set
    if (config.force) {
      console.log('Force flag set - dropping existing schema...');
      await dropExistingSchema(db);
    }

    // Create database schema
    console.log('Creating database schema...');
    await createSchema(db);

    // Insert seed data if requested
    if (config.seedData) {
      console.log('Checking if database needs seeding...');
      if (!(await isDatabaseSeeded(db))) {
        console.log('Inserting seed data...');
        await seedDatabase(db);
      } else {
        console.log('Database already seeded, skipping...');
      }
    }

    await db.close();
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

/**
 * Create database schema using exported schemas
 */
async function createSchema(db: Database): Promise<void> {
  // Enable foreign key constraints
  await db.exec('PRAGMA foreign_keys = ON;');
  
  // Create all tables in order
  for (const schema of DATABASE_SCHEMAS) {
    await db.exec(schema);
  }
  
  console.log('Database schema created successfully');
}

/**
 * Drop existing database schema
 */
async function dropExistingSchema(db: Database): Promise<void> {
  const tables = [
    'schema_migrations',
    'log_tag_associations',
    'tag_associations', 
    'logs',
    'sessions',
    'tags',
    'users'
  ];

  await db.exec('PRAGMA foreign_keys = OFF;');
  
  for (const table of tables) {
    await db.exec(`DROP TABLE IF EXISTS ${table};`);
  }
  
  await db.exec('PRAGMA foreign_keys = ON;');
  console.log('Existing schema dropped');
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  const config: MigrationConfig = {
    databasePath: args[0] || 'shumilog.db',
    force: args.includes('--force'),
    seedData: args.includes('--seed')
  };

  await migrate(config);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
