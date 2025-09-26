/**
 * Database seed data with deterministic fixtures for testing/quickstart
 */

export interface SeedData {
  users: any[];
  tags: any[];
  logs: any[];
  tagAssociations: any[];
  logTagAssociations: any[];
}

/**
 * Deterministic seed data for testing and quickstart validation
 */
export const SEED_DATA: SeedData = {
  users: [
    {
      id: 'user_log_owner',
      twitter_username: 'testuser',
      display_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
      created_at: '2023-01-01T00:00:00Z'
    }
  ],
  
  tags: [
    {
      id: 'tag_anime',
      name: 'anime',
      description: 'Japanese animation',
      metadata: '{"category": "media"}',
      created_by: 'user_log_owner',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    },
    {
      id: 'tag_gaming',
      name: 'gaming',
      description: 'Video games',
      metadata: '{"category": "media"}',
      created_by: 'user_log_owner',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    }
  ],
  
  logs: [
    {
      id: 'log_public_1',
      user_id: 'user_log_owner',
      title: 'My anime journey',
      content_md: 'Started watching **Attack on Titan** today. Great animation!',
      is_public: 1,
      created_at: '2023-01-02T00:00:00Z',
      updated_at: '2023-01-02T00:00:00Z'
    },
    {
      id: 'log_public_2',
      user_id: 'user_log_owner',
      title: 'Gaming progress',
      content_md: 'Completed the first level of my new game.',
      is_public: 1,
      created_at: '2023-01-03T00:00:00Z',
      updated_at: '2023-01-03T00:00:00Z'
    }
  ],
  
  tagAssociations: [
    {
      tag_id: 'tag_anime',
      associated_tag_id: 'tag_gaming',
      created_at: '2023-01-01T00:00:00Z'
    }
  ],
  
  logTagAssociations: [
    {
      log_id: 'log_public_1',
      tag_id: 'tag_anime'
    },
    {
      log_id: 'log_public_2',
      tag_id: 'tag_gaming'
    }
  ]
};

/**
 * Generate SQL for seeding the database
 */
export function generateSeedSQL(): string[] {
  const statements: string[] = [];
  
  // Insert users
  SEED_DATA.users.forEach(user => {
    statements.push(`
      INSERT OR IGNORE INTO users (id, twitter_username, display_name, avatar_url, created_at)
      VALUES ('${user.id}', '${user.twitter_username}', '${user.display_name}', '${user.avatar_url}', '${user.created_at}');
    `);
  });
  
  // Insert tags
  SEED_DATA.tags.forEach(tag => {
    statements.push(`
      INSERT OR IGNORE INTO tags (id, name, description, metadata, created_by, created_at, updated_at)
      VALUES ('${tag.id}', '${tag.name}', '${tag.description}', '${tag.metadata}', '${tag.created_by}', '${tag.created_at}', '${tag.updated_at}');
    `);
  });
  
  // Insert logs
  SEED_DATA.logs.forEach(log => {
    statements.push(`
      INSERT OR IGNORE INTO logs (id, user_id, title, content_md, is_public, created_at, updated_at)
      VALUES ('${log.id}', '${log.user_id}', '${log.title}', '${log.content_md}', ${log.is_public}, '${log.created_at}', '${log.updated_at}');
    `);
  });
  
  // Insert tag associations
  SEED_DATA.tagAssociations.forEach(assoc => {
    statements.push(`
      INSERT OR IGNORE INTO tag_associations (tag_id, associated_tag_id, created_at)
      VALUES ('${assoc.tag_id}', '${assoc.associated_tag_id}', '${assoc.created_at}');
    `);
  });
  
  // Insert log-tag associations
  SEED_DATA.logTagAssociations.forEach(assoc => {
    statements.push(`
      INSERT OR IGNORE INTO log_tag_associations (log_id, tag_id)
      VALUES ('${assoc.log_id}', '${assoc.tag_id}');
    `);
  });
  
  return statements;
}

/**
 * Check if database has been seeded
 */
export async function isDatabaseSeeded(db: any): Promise<boolean> {
  try {
    const result = await db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE id = 'user_log_owner'
    `).get();
    
    return result.count > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Seed the database with test data
 */
export async function seedDatabase(db: any): Promise<void> {
  try {
    const statements = generateSeedSQL();
    
    for (const statement of statements) {
      await db.exec(statement.trim());
    }
    
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}