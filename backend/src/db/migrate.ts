#!/usr/bin/env node
/**
 * Database migration and initialization script
 * Executes schema creation and seed data insertion using TypeScript modules
 */

import { Database } from './database.js';
import { DATABASE_SCHEMAS } from './schema.sql.js';
import { SEED_TAGS } from './seeds.sql.js';
import { v4 as uuidv4 } from 'uuid';

interface MigrationConfig {
  databasePath: string;
  force?: boolean;
  seedData?: boolean;
}

/**
 * Execute database migrations and initialization
 */
export async function runMigrations(config: MigrationConfig): Promise<void> {
  const db = new Database({
    databasePath: config.databasePath,
    options: {
      enableWAL: true,
      enableForeignKeys: true
    }
  });

  try {
    console.log('Connecting to database...');
    await db.connect();

    console.log('Running database migrations...');
    
    // Execute schema creation
    for (const schema of DATABASE_SCHEMAS) {
      console.log('Executing schema...');
      await db.exec(schema);
    }

    console.log('Schema creation completed');

    // Insert seed data if requested
    if (config.seedData) {
      console.log('Inserting seed data...');
      await insertSeedData(db);
      console.log('Seed data insertion completed');
    }

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

/**
 * Insert seed data into database
 */
async function insertSeedData(db: Database): Promise<void> {
  // Check if already seeded
  const existingTags = await db.query('SELECT COUNT(*) as count FROM tags');
  if (existingTags[0]?.count > 0) {
    console.log('Database already contains tags, skipping seed data insertion');
    return;
  }

  // Insert tags
  const insertTagStmt = db.prepare(`
    INSERT OR IGNORE INTO tags (id, name, description, category, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();

  for (const tag of SEED_TAGS) {
    const id = uuidv4();
    const metadata = tag.metadata ? JSON.stringify(tag.metadata) : null;
    const category = getCategoryFromTag(tag);
    
    await insertTagStmt.run([
      id,
      tag.name,
      tag.description || null,
      category,
      metadata,
      now,
      now
    ]);
  }

  console.log(`Inserted ${SEED_TAGS.length} seed tags`);

  // Create some basic tag associations
  const associations = [
    { parent: 'anime', children: ['attack-on-titan', 'demon-slayer', 'one-piece'] },
    { parent: 'action', children: ['attack-on-titan'] },
    { parent: 'adventure', children: ['one-piece'] },
  ];

  const insertAssocStmt = db.prepare(`
    INSERT OR IGNORE INTO tag_associations (id, parent_tag_id, child_tag_id, relationship_type, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const assoc of associations) {
    const parentTag = await db.queryFirst('SELECT id FROM tags WHERE name = ?', [assoc.parent]);
    if (!parentTag) continue;

    for (const childName of assoc.children) {
      const childTag = await db.queryFirst('SELECT id FROM tags WHERE name = ?', [childName]);
      if (!childTag) continue;

      await insertAssocStmt.run([
        uuidv4(),
        parentTag.id,
        childTag.id,
        'parent_child',
        now
      ]);
    }
  }

  console.log('Tag associations created');
}

/**
 * Determine category from tag data
 */
function getCategoryFromTag(tag: any): string {
  if (['anime', 'manga', 'game', 'novel', 'movie'].includes(tag.name)) {
    return 'category';
  }
  
  if (['action', 'adventure', 'comedy', 'drama', 'fantasy', 'romance', 'sci-fi', 'slice-of-life'].includes(tag.name)) {
    return 'genre';
  }
  
  if (['completed', 'watching', 'reading', 'on-hold', 'dropped', 'plan-to-watch', 'plan-to-read'].includes(tag.name)) {
    return 'status';
  }
  
  if (tag.metadata?.japanese_name || tag.metadata?.mal_id) {
    return 'anime';
  }
  
  return 'other';
}

/**
 * CLI execution
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const databasePath = process.env.DB_PATH || process.env.DATABASE_URL?.replace('file:', '') || '/data/shumilog.db';
  const force = process.argv.includes('--force');
  const seedData = !process.argv.includes('--no-seed');

  console.log(`Starting database migration for: ${databasePath}`);
  
  runMigrations({
    databasePath,
    force,
    seedData
  }).catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}