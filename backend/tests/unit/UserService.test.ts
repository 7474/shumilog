import { describe, it, expect, beforeEach } from 'vitest';
import { UserService } from '../../src/services/UserService.js';
import { Database } from '../../src/db/database.js';

describe('UserService', () => {
  let userService: UserService;
  let mockDatabase: Database;

  beforeEach(() => {
    // Create a mock database instance
    const mockDB = new MockD1Database();
    mockDatabase = new Database({ d1Database: mockDB });
    userService = new UserService(mockDatabase);
  });

  describe('createUser', () => {
    it('should create user with valid data', async () => {
      // Arrange
      const userData = {
        twitter_id: 'twitter-123',
        twitter_username: 'testuser',
        display_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg'
      };

      // Act
      const result = await userService.createUser(userData);

      // Assert
      expect(result).toBeDefined();
      expect(result.twitter_username).toBe('testuser');
      expect(result.display_name).toBe('Test User');
      expect(result.avatar_url).toBe('https://example.com/avatar.jpg');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeDefined();
    });

    it('should create user without avatar_url', async () => {
      // Arrange
      const userData = {
        twitter_id: 'twitter-456',
        twitter_username: 'minimal_user',
        display_name: 'Minimal User'
      };

      // Act
      const result = await userService.createUser(userData);

      // Assert
      expect(result).toBeDefined();
      expect(result.twitter_username).toBe('minimal_user');
      expect(result.display_name).toBe('Minimal User');
      expect(result.avatar_url).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('should return null when user not found', async () => {
      // Act
      const result = await userService.findById('non-existent-user');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByTwitterId', () => {
    it('should return null when user not found', async () => {
      // Act
      const result = await userService.findByTwitterId('non-existent-twitter-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByTwitterUsername', () => {
    it('should return null when user not found', async () => {
      // Act
      const result = await userService.findByTwitterUsername('non-existent-username');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getUserStats', () => {
    it('should return default stats for user with no data', async () => {
      // Act
      const result = await userService.getUserStats('test-user-id');

      // Assert
      expect(result).toEqual({
        totalLogs: 0,
        totalTags: 0,
        recentLogsCount: 0
      });
    });
  });
});

// Mock class for testing (this would normally be imported from the real file)
class MockD1Database {
  private users: Map<string, any> = new Map();

  prepare(query: string) {
    const database = this;
    return {
      bind(...params: any[]) {
        return {
          async first() {
            if (query.includes('SELECT') && query.includes('FROM users') && query.includes('WHERE id = ?')) {
              const userId = params[0];
              return database.users.get(userId) || null;
            }
            return null;
          },
          async run() {
            if (query.includes('INSERT INTO users')) {
              const [id, twitter_id, twitter_username, display_name, avatar_url, created_at, updated_at] = params;
              database.users.set(id, { id, twitter_id, twitter_username, display_name, avatar_url, created_at, updated_at, is_active: true });
              return { success: true, meta: { last_row_id: id, changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          }
        };
      }
    };
  }

  seedUser(id: string, data: any) {
    this.users.set(id, { id, ...data });
  }

  clear() {
    this.users.clear();
  }
}