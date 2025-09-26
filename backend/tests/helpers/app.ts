// Test helper to provide the real app instance
import { createApp } from '../../src/index.js';

// Mock KV store for testing
class MockKV {
  private storage: Map<string, string> = new Map();

  async get(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  async put(key: string, value: string, options?: any): Promise<void> {
    this.storage.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }
}

// Mock D1 Database for testing
class MockD1Database {
  private users: Map<string, any> = new Map();
  private tags: Map<string, any> = new Map();
  private logs: Map<string, any> = new Map();
  private tagAssociations: Map<string, any> = new Map();
  private logTagAssociations: Map<string, any> = new Map();

  prepare(query: string) {
    const database = this;
    
    // Mock prepared statement object
    const preparedStatement = {
      bind(...params: any[]) {
        // Return bound statement with methods
        return {
          async run() {
            // Handle INSERT operations
            if (query.includes('INSERT INTO users')) {
              const [id, twitter_id, twitter_username, display_name, avatar_url, created_at, updated_at] = params;
              database.users.set(id, { id, twitter_id, twitter_username, display_name, avatar_url, created_at, updated_at, is_active: true });
              return { success: true, meta: { last_row_id: id, changes: 1 } };
            } else if (query.includes('INSERT INTO tags')) {
              const [id, name, description, metadata, created_by, created_at, updated_at] = params;
              database.tags.set(id, { id, name, description, metadata, created_by, created_at, updated_at });
              return { success: true, meta: { last_row_id: id, changes: 1 } };
            } else if (query.includes('INSERT INTO logs')) {
              const [id, user_id, title, content_md, is_public, created_at, updated_at] = params;
              database.logs.set(id, { id, user_id, title, content_md, is_public, created_at, updated_at });
              return { success: true, meta: { last_row_id: id, changes: 1 } };
            } 
            // Handle UPDATE operations
            else if (query.includes('UPDATE tags') && query.includes('SET') && query.includes('WHERE id = ?')) {
              const tagId = params[params.length - 1]; // Last parameter is the ID
              const existingTag = database.tags.get(tagId);
              if (existingTag) {
                let updatedTag = { ...existingTag };
                
                // Parse SET clause to map parameters to fields in order
                const setClause = query.match(/SET\s+(.*?)\s+WHERE/s)?.[1] || '';
                const setFields = setClause.split(',').map(field => field.trim());
                
                let paramIndex = 0;
                for (const field of setFields) {
                  if (field.includes('name = ?')) {
                    updatedTag.name = params[paramIndex];
                  } else if (field.includes('description = ?')) {
                    updatedTag.description = params[paramIndex];
                  } else if (field.includes('metadata = ?')) {
                    updatedTag.metadata = params[paramIndex];
                  } else if (field.includes('updated_at = ?')) {
                    updatedTag.updated_at = params[paramIndex];
                  }
                  paramIndex++;
                }
                
                database.tags.set(tagId, updatedTag);
                return { success: true, meta: { changes: 1 } };
              }
              return { success: true, meta: { changes: 0 } };
            }
            // Handle UPDATE operations for logs
            else if (query.includes('UPDATE logs') && query.includes('SET') && query.includes('WHERE id = ?')) {
              const logId = params[params.length - 1]; // Last parameter is the ID
              const existingLog = database.logs.get(logId);
              if (existingLog) {
                let updatedLog = { ...existingLog };
                
                // Parse SET clause to map parameters to fields in order
                const setClause = query.match(/SET\s+(.*?)\s+WHERE/s)?.[1] || '';
                const setFields = setClause.split(',').map((field: string) => field.trim());
                
                let paramIndex = 0;
                for (const field of setFields) {
                  if (field.includes('title = ?')) {
                    updatedLog.title = params[paramIndex];
                  } else if (field.includes('content_md = ?')) {
                    updatedLog.content_md = params[paramIndex];
                  } else if (field.includes('is_public = ?')) {
                    updatedLog.is_public = params[paramIndex];
                  } else if (field.includes('updated_at = ?')) {
                    updatedLog.updated_at = params[paramIndex];
                  }
                  paramIndex++;
                }
                
                database.logs.set(logId, updatedLog);
                return { success: true, meta: { changes: 1 } };
              }
              return { success: true, meta: { changes: 0 } };
            }
            // Handle DELETE operations
            else if (query.includes('DELETE FROM logs WHERE id = ?')) {
              const logId = params[0];
              const existed = database.logs.has(logId);
              database.logs.delete(logId);
              return { success: true, meta: { changes: existed ? 1 : 0 } };
            }
            else if (query.includes('DELETE FROM tags WHERE id = ?')) {
              const tagId = params[0];
              const existed = database.tags.has(tagId);
              database.tags.delete(tagId);
              return { success: true, meta: { changes: existed ? 1 : 0 } };
            } else if (query.includes('DELETE FROM log_tag_associations WHERE tag_id = ?')) {
              // Just return success for associations
              return { success: true, meta: { changes: 0 } };
            }
            return { success: true, meta: { changes: 0 } };
          },
          
          async all() {
            // Handle SELECT operations that return multiple rows
            if (query.includes('SELECT') && query.includes('FROM tags')) {
              let tagsArray = Array.from(database.tags.values());
              
              // Handle search filtering
              if (query.includes('WHERE') && query.includes('LIKE')) {
                const searchTerm = params.find(p => typeof p === 'string' && p.includes('%'));
                if (searchTerm) {
                  const cleanTerm = searchTerm.replace(/%/g, '').toLowerCase();
                  tagsArray = tagsArray.filter(tag => 
                    tag.name?.toLowerCase().includes(cleanTerm) || 
                    tag.description?.toLowerCase().includes(cleanTerm)
                  );
                }
              }
              
              // Handle LIMIT and OFFSET
              let limit = 20;
              let offset = 0;
              
              if (query.includes('LIMIT')) {
                const limitMatch = query.match(/LIMIT\s+(\d+)/);
                if (limitMatch) limit = parseInt(limitMatch[1]);
                
                // Check if limit is parameterized
                const limitIndex = query.split(' ').indexOf('LIMIT') + 1;
                if (query.split(' ')[limitIndex] === '?') {
                  const paramIndex = (query.substring(0, query.indexOf('LIMIT')).match(/\?/g) || []).length;
                  limit = params[paramIndex] || 20;
                }
              }
              
              if (query.includes('OFFSET')) {
                const offsetMatch = query.match(/OFFSET\s+(\d+)/);
                if (offsetMatch) offset = parseInt(offsetMatch[1]);
                
                // Check if offset is parameterized
                const offsetIndex = query.split(' ').indexOf('OFFSET') + 1;
                if (query.split(' ')[offsetIndex] === '?') {
                  const paramIndex = (query.substring(0, query.indexOf('OFFSET')).match(/\?/g) || []).length;
                  offset = params[paramIndex] || 0;
                }
              }
              
              // Sort by name for consistency
              tagsArray.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
              
              return { results: tagsArray.slice(offset, offset + limit) };
            } else if (query.includes('SELECT') && query.includes('FROM logs')) {
              const logsArray = Array.from(database.logs.values());
              return { results: logsArray.slice(0, 10) };
            }
            return { results: [] };
          },
          
          async first() {
            // Handle SELECT operations that return single row
            if (query.includes('SELECT') && query.includes('FROM users') && query.includes('WHERE id = ?')) {
              const userId = params[0];
              const user = database.users.get(userId);
              return user || null;
            } else if (query.includes('SELECT') && query.includes('FROM tags') && query.includes('WHERE id = ?')) {
              const tagId = params[0];
              const tag = database.tags.get(tagId);
              return tag || null;
            } else if (query.includes('SELECT') && query.includes('FROM logs') && query.includes('WHERE id = ?')) {
              const logId = params[0];
              const log = database.logs.get(logId);
              return log || null;
            } else if (query.includes('SELECT l.*, u.twitter_username') && query.includes('JOIN users u')) {
              // Handle log with user info JOIN query
              const logId = params[0];
              const log = database.logs.get(logId);
              if (!log) return null;
              
              const user = database.users.get(log.user_id);
              if (!user) return null;
              
              // Combine log and user data
              return {
                ...log,
                twitter_username: user.twitter_username,
                display_name: user.display_name,
                avatar_url: user.avatar_url,
                user_created_at: user.created_at
              };
            } else if (query.includes('COUNT(*)') && query.includes('FROM logs') && query.includes('id = ? AND user_id = ?')) {
              // Handle log ownership validation  
              const [logId, userId] = params;
              const log = database.logs.get(logId);
              const count = (log && log.user_id === userId) ? 1 : 0;
              return { count };
            } else if (query.includes('COUNT(*)') && query.includes('FROM log_tag_associations')) {
              // Return mock count for usage stats
              return { count: 0 };
            } else if (query.includes('last_used') && query.includes('FROM log_tag_associations')) {
              // Return mock last used date
              return { last_used: new Date().toISOString() };
            }
            return null;
          },

          async get<T>(params?: any[]): Promise<T | null> {
            // Same as first() but with different signature to match D1 API
            return this.first() as Promise<T | null>;
          }
        };
      }
    };
    
    return preparedStatement;
  }

  async exec(query: string) {
    return { success: true };
  }

  // Helper methods for test setup
  seedUser(id: string, data: any) {
    this.users.set(id, { id, ...data });
  }

  seedTag(id: string, data: any) {
    this.tags.set(id, { id, ...data });
  }

  seedLog(id: string, data: any) {
    this.logs.set(id, { id, ...data });
  }

  getUser(id: string) {
    return this.users.get(id);
  }

  getTag(id: string) {
    return this.tags.get(id);
  }

  clear() {
    this.users.clear();
    this.tags.clear();
    this.logs.clear();
    this.tagAssociations.clear();
    this.logTagAssociations.clear();
  }
}

// Create mock instances
const mockKV = new MockKV();
const mockDB = new MockD1Database();

// Create app instance for testing with mock environment
const mockEnv = {
  DB: mockDB, // Mock D1 database
  KV: mockKV, // Mock KV store
  TWITTER_CLIENT_ID: 'test_client_id',
  TWITTER_CLIENT_SECRET: 'test_client_secret',
  TWITTER_REDIRECT_URI: 'http://localhost:8787/auth/callback',
  NODE_ENV: 'test'
};

const app = createApp(mockEnv);

// Export helper functions for tests
export async function createTestSession(userId: string = 'mock-user-id'): Promise<string> {
  const sessionId = 'valid_session_token'; // Match what tests expect
  const session = {
    sessionId,
    userId,
    createdAt: Date.now(),
    lastAccessedAt: Date.now()
  };
  
  await mockKV.put(`session:${sessionId}`, JSON.stringify(session));
  await mockKV.put(`user_session:${userId}`, sessionId);
  
  return sessionId;
}

export async function createTestUser(userId: string = 'mock-user-id', username: string = 'testuser'): Promise<void> {
  // Seed user data in mock database
  mockDB.seedUser(userId, {
    twitter_id: `twitter_${userId}`,
    twitter_username: username,
    display_name: `Test User ${username}`,
    avatar_url: `https://example.com/avatar/${username}.jpg`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_active: true
  });
}

export async function seedTestTags(): Promise<void> {
  // Seed common test tags
  const testTags = [
    {
      id: 'tag_anime',
      name: 'Anime',
      description: 'Japanese animation',
      metadata: JSON.stringify({ category: 'media' }),
      created_by: 'mock-user-id',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'tag_attack_on_titan',
      name: 'Attack on Titan',
      description: 'Popular anime series',
      metadata: JSON.stringify({ category: 'series' }),
      created_by: 'mock-user-id',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'tag_manga',
      name: 'Manga',
      description: 'Japanese comics',
      metadata: JSON.stringify({ category: 'media' }),
      created_by: 'mock-user-id',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  testTags.forEach(tag => {
    mockDB.seedTag(tag.id, tag);
  });
}

export async function setupTestEnvironment(): Promise<string> {
  // Clear existing data
  await clearTestData();
  
  // Create test user
  await createTestUser();
  
  // Seed test tags
  await seedTestTags();
  
  // Create and return session token
  return await createTestSession();
}

export async function clearTestData(): Promise<void> {
  mockKV.clear();
  mockDB.clear();
}

export { app, mockKV, mockDB };
export default app;