/**
 * Database schema aligned with minimal data model blueprint
 */

import { USER_TABLE_SCHEMA } from '../models/User.js';
import { SESSION_TABLE_SCHEMA } from '../models/Session.js';
import { TAG_TABLE_SCHEMA } from '../models/Tag.js';
import { TAG_ASSOCIATION_TABLE_SCHEMA } from '../models/TagAssociation.js';
import { LOG_TABLE_SCHEMA } from '../models/Log.js';
import { LOG_TAG_ASSOCIATION_TABLE_SCHEMA } from '../models/LogTagAssociation.js';

/**
 * Database schemas in dependency order for minimal D1 implementation
 */
export const DATABASE_SCHEMAS = [
  // Base tables first (no foreign keys)
  USER_TABLE_SCHEMA,
  TAG_TABLE_SCHEMA,
  
  // Tables with foreign keys to base tables
  SESSION_TABLE_SCHEMA,
  LOG_TABLE_SCHEMA,
  
  // Junction tables (many-to-many relationships)
  TAG_ASSOCIATION_TABLE_SCHEMA,
  LOG_TAG_ASSOCIATION_TABLE_SCHEMA,
  
  // Schema version tracking
  `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
    description TEXT
  );
  
  INSERT OR IGNORE INTO schema_migrations (version, description) 
  VALUES (1, 'Minimal D1 schema creation');
  `
];

/**
 * Create all database tables and indexes
 */
export async function createDatabaseSchema(db: any): Promise<void> {
  try {
    // Enable foreign key constraints
    await db.exec('PRAGMA foreign_keys = ON;');
    
    // Create all tables in order
    for (const schema of DATABASE_SCHEMAS) {
      await db.exec(schema);
    }
    
    console.log('Database schema created successfully');
  } catch (error) {
    console.error('Error creating database schema:', error);
    throw error;
  }
}

/**
 * Drop all tables (for testing/reset)
 */
export async function dropDatabaseSchema(db: any): Promise<void> {
  const tables = [
    'schema_migrations',
    'log_tag_associations',
    'tag_associations',
    'logs',
    'sessions',
    'tags',
    'users'
  ];

  try {
    await db.exec('PRAGMA foreign_keys = OFF;');
    
    for (const table of tables) {
      await db.exec(`DROP TABLE IF EXISTS ${table};`);
    }
    
    await db.exec('PRAGMA foreign_keys = ON;');
    console.log('Database schema dropped successfully');
  } catch (error) {
    console.error('Error dropping database schema:', error);
    throw error;
  }
}

/**
 * Check if database schema is up to date
 */
export async function checkSchemaVersion(db: any): Promise<number> {
  try {
    const result = await db.prepare(`
      SELECT version FROM schema_migrations 
      ORDER BY version DESC LIMIT 1
    `).get();
    
    return result?.version || 0;
  } catch (error) {
    // If migrations table doesn't exist, schema version is 0
    return 0;
  }
}