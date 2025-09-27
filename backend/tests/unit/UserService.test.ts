import { describe, it, expect, beforeEach } from 'vitest';
import { UserService } from '../../src/services/UserService.js';
import { Database } from '../../src/db/database.js';
import { clearTestData, getTestD1Database } from '../helpers/app.js';

describe('UserService', () => {
  let userService: UserService;
  let mockDatabase: Database;

  beforeEach(async () => {
    await clearTestData();
    mockDatabase = new Database({ d1Database: getTestD1Database() });
    userService = new UserService(mockDatabase);
  });

  describe('createUser', () => {
    it('should create user with valid data', async () => {
      // Arrange
      const userData = {
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