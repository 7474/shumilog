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

  async prepare(query: string) {
    // Return a mock prepared statement that mimics D1's interface
    return {
      bind: (...params: any[]) => ({
        run: async () => {
          // Handle INSERT operations
          if (query.includes('INSERT INTO users')) {
            const [id, twitter_id, twitter_username, display_name, avatar_url, created_at, updated_at] = params;
            this.users.set(id, { id, twitter_id, twitter_username, display_name, avatar_url, created_at, updated_at });
          } else if (query.includes('INSERT INTO tags')) {
            const [id, name, description, metadata, created_by, created_at, updated_at] = params;
            this.tags.set(id, { id, name, description, metadata, created_by, created_at, updated_at });
          }
          return { success: true };
        },
        all: async () => ({ results: [] }),
        first: async () => {
          // Handle SELECT operations
          if (query.includes('SELECT') && query.includes('FROM users') && query.includes('WHERE id = ?')) {
            const userId = params[0];
            const user = this.users.get(userId);
            return user || null;
          }
          return null;
        }
      })
    };
  }

  async exec(query: string) {
    return { success: true };
  }

  // Helper methods for test setup
  seedUser(id: string, data: any) {
    this.users.set(id, { id, ...data });
  }

  clear() {
    this.users.clear();
    this.tags.clear();
    this.logs.clear();
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
  const sessionId = 'mock-session-token';
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
    updated_at: new Date().toISOString()
  });
}

export async function clearTestData(): Promise<void> {
  mockKV.clear();
  mockDB.clear();
}

export { app, mockKV, mockDB };
export default app;