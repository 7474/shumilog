/**
 * Database schema creation script with all tables and indexes
 * 
 * This script contains all the SQL schemas for the shumilog database
 */

import { 
  USER_TABLE_SCHEMA 
} from '../models/User.js';
import { 
  TAG_TABLE_SCHEMA 
} from '../models/Tag.js';
import { 
  LOG_TABLE_SCHEMA 
} from '../models/Log.js';
import { 
  TAG_ASSOCIATION_TABLE_SCHEMA 
} from '../models/TagAssociation.js';
import { 
  LOG_TAG_ASSOCIATION_TABLE_SCHEMA 
} from '../models/LogTagAssociation.js';
import { 
  USER_TAG_PROGRESS_TABLE_SCHEMA 
} from '../models/UserTagProgress.js';

/**
 * All database schemas in dependency order
 */
export const DATABASE_SCHEMAS = [
  // Base tables first (no foreign keys)
  USER_TABLE_SCHEMA,
  TAG_TABLE_SCHEMA,
  
  // Tables with foreign keys to base tables
  LOG_TABLE_SCHEMA,
  TAG_ASSOCIATION_TABLE_SCHEMA,
  
  // Junction tables (many-to-many relationships)
  LOG_TAG_ASSOCIATION_TABLE_SCHEMA,
  USER_TAG_PROGRESS_TABLE_SCHEMA,
  
  // Additional indexes for performance
  `
  -- Composite indexes for common query patterns
  CREATE INDEX IF NOT EXISTS idx_logs_user_privacy_status ON logs(user_id, privacy, status);
  CREATE INDEX IF NOT EXISTS idx_logs_privacy_status_published ON logs(privacy, status, published_at DESC);
  CREATE INDEX IF NOT EXISTS idx_tags_category_usage_name ON tags(category, usage_count DESC, name);
  CREATE INDEX IF NOT EXISTS idx_user_tag_progress_user_status_updated ON user_tag_progress(user_id, status, last_updated DESC);
  
  -- Full-text search indexes (if SQLite supports FTS5)
  CREATE VIRTUAL TABLE IF NOT EXISTS logs_fts USING fts5(
    title, 
    content,
    content_id UNINDEXED
  );
  
  -- Triggers to keep FTS table in sync
  CREATE TRIGGER IF NOT EXISTS logs_fts_insert 
  AFTER INSERT ON logs BEGIN
    INSERT INTO logs_fts(title, content, content_id) 
    VALUES (new.title, new.content, new.id);
  END;
  
  CREATE TRIGGER IF NOT EXISTS logs_fts_update 
  AFTER UPDATE ON logs BEGIN
    UPDATE logs_fts 
    SET title = new.title, content = new.content 
    WHERE content_id = new.id;
  END;
  
  CREATE TRIGGER IF NOT EXISTS logs_fts_delete 
  AFTER DELETE ON logs BEGIN
    DELETE FROM logs_fts WHERE content_id = old.id;
  END;
  `,
  
  // Database metadata and version tracking
  `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT
  );
  
  INSERT OR IGNORE INTO schema_migrations (version, description) 
  VALUES (1, 'Initial schema creation');
  `
];

/**
 * Database constraints and checks
 */
export const DATABASE_CONSTRAINTS = `
  -- Additional constraints not covered in table schemas
  
  -- Ensure log privacy is valid
  CREATE TRIGGER IF NOT EXISTS validate_log_privacy
  BEFORE INSERT ON logs
  WHEN NEW.privacy NOT IN ('public', 'private')
  BEGIN
    SELECT RAISE(ABORT, 'Invalid privacy value. Must be public or private.');
  END;
  
  -- Ensure log status is valid
  CREATE TRIGGER IF NOT EXISTS validate_log_status
  BEFORE INSERT ON logs
  WHEN NEW.status NOT IN ('draft', 'published', 'archived', 'deleted')
  BEGIN
    SELECT RAISE(ABORT, 'Invalid status value.');
  END;
  
  -- Ensure tag category is valid
  CREATE TRIGGER IF NOT EXISTS validate_tag_category
  BEFORE INSERT ON tags
  WHEN NEW.category NOT IN (
    'anime', 'manga', 'game', 'novel', 'movie', 'tv', 'music',
    'character', 'genre', 'studio', 'creator', 'season', 'year',
    'rating', 'status', 'general'
  )
  BEGIN
    SELECT RAISE(ABORT, 'Invalid tag category.');
  END;
  
  -- Ensure user tag progress status is valid
  CREATE TRIGGER IF NOT EXISTS validate_progress_status
  BEFORE INSERT ON user_tag_progress
  WHEN NEW.status NOT IN (
    'planning', 'current', 'completed', 'paused', 'dropped', 'rewatching', 'rereading'
  )
  BEGIN
    SELECT RAISE(ABORT, 'Invalid progress status.');
  END;
  
  -- Auto-update updated_at timestamps
  CREATE TRIGGER IF NOT EXISTS update_users_timestamp
  AFTER UPDATE ON users
  BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;
  
  CREATE TRIGGER IF NOT EXISTS update_tags_timestamp
  AFTER UPDATE ON tags
  BEGIN
    UPDATE tags SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;
  
  CREATE TRIGGER IF NOT EXISTS update_logs_timestamp
  AFTER UPDATE ON logs
  BEGIN
    UPDATE logs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;
  
  CREATE TRIGGER IF NOT EXISTS update_user_tag_progress_timestamp
  AFTER UPDATE ON user_tag_progress
  BEGIN
    UPDATE user_tag_progress SET last_updated = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;
  
  -- Auto-update tag usage counts
  CREATE TRIGGER IF NOT EXISTS increment_tag_usage
  AFTER INSERT ON log_tag_associations
  BEGIN
    UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
  END;
  
  CREATE TRIGGER IF NOT EXISTS decrement_tag_usage
  AFTER DELETE ON log_tag_associations
  BEGIN
    UPDATE tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
  END;
  
  -- Auto-set published_at when status changes to published
  CREATE TRIGGER IF NOT EXISTS set_published_at
  AFTER UPDATE OF status ON logs
  WHEN NEW.status = 'published' AND OLD.status != 'published'
  BEGIN
    UPDATE logs SET published_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;
  
  -- Auto-set completed_at when progress status changes to completed
  CREATE TRIGGER IF NOT EXISTS set_completed_at
  AFTER UPDATE OF status ON user_tag_progress
  WHEN NEW.status = 'completed' AND OLD.status != 'completed'
  BEGIN
    UPDATE user_tag_progress SET completed_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;
`;

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
    
    // Add constraints and triggers
    await db.exec(DATABASE_CONSTRAINTS);
    
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
    'logs_fts',
    'schema_migrations',
    'user_tag_progress', 
    'log_tag_associations',
    'tag_associations',
    'logs',
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