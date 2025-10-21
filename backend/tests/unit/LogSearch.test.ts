import { describe, it, expect, beforeEach } from 'vitest';
import { LogService } from '../../src/services/LogService.js';
import { createDrizzleDB, type DrizzleDB } from '../../src/db/drizzle.js';
import { clearTestData, getTestD1Database, createTestUser, seedTestTags } from '../helpers/app.js';

describe('Log Search Functionality', () => {
  let logService: LogService;
  let drizzleDB: DrizzleDB;

  beforeEach(async () => {
    await clearTestData();
    drizzleDB = createDrizzleDB(getTestD1Database());
    logService = new LogService(drizzleDB);

    await Promise.all([
      createTestUser('user-1', 'testuser1'),
      createTestUser('user-2', 'testuser2')
    ]);
    await seedTestTags();
  });

  describe('searchLogs with text search', () => {
    beforeEach(async () => {
      // Create test logs with different content
      await logService.createLog({
        title: 'Attack on Titan Review',
        content_md: '# Attack on Titan\n\nGreat anime series!',
        is_public: true
      }, 'user-1');

      await logService.createLog({
        title: 'My Favorite Manga',
        content_md: 'Reading One Piece is amazing!',
        is_public: true
      }, 'user-1');

      await logService.createLog({
        title: 'Gaming Log',
        content_md: 'Played Attack on Titan game today',
        is_public: true
      }, 'user-2');

      await logService.createLog({
        title: 'Private Note',
        content_md: 'This mentions Attack but is private',
        is_public: false
      }, 'user-2');
    });

    it('should find logs by title search', async () => {
      const result = await logService.searchLogs({ 
        search: 'Attack',
        is_public: true 
      });

      expect(result.logs.length).toBeGreaterThanOrEqual(2);
      expect(result.logs.some(log => log.title?.includes('Attack'))).toBe(true);
    });

    it('should find logs by content search', async () => {
      const result = await logService.searchLogs({ 
        search: 'anime',
        is_public: true 
      });

      expect(result.logs.length).toBeGreaterThanOrEqual(1);
      expect(result.logs.some(log => log.content_md.includes('anime'))).toBe(true);
    });

    it('should be case insensitive', async () => {
      const result1 = await logService.searchLogs({ 
        search: 'attack',
        is_public: true 
      });
      const result2 = await logService.searchLogs({ 
        search: 'ATTACK',
        is_public: true 
      });

      expect(result1.logs.length).toBe(result2.logs.length);
      expect(result1.logs.length).toBeGreaterThan(0);
    });

    it('should support 1-character search using LIKE fallback', async () => {
      // Single character search should work with LIKE fallback
      const result = await logService.searchLogs({ 
        search: 'A',
        is_public: true 
      });

      // Should find logs containing 'A' (Attack, amazing, etc.)
      expect(result.logs.length).toBeGreaterThan(0);
    });

    it('should support 2-character search using LIKE fallback', async () => {
      // Two character search should work with LIKE fallback
      const result = await logService.searchLogs({ 
        search: 'Ma',
        is_public: true 
      });

      // Should find logs containing 'Ma' (Manga, amazing, etc.)
      expect(result.logs.length).toBeGreaterThan(0);
    });

    it('should combine search with other filters', async () => {
      const result = await logService.searchLogs({ 
        search: 'Attack',
        user_id: 'user-1',
        is_public: true 
      });

      expect(result.logs.length).toBeGreaterThanOrEqual(1);
      expect(result.logs.every(log => log.user_id === 'user-1')).toBe(true);
    });

    it('should respect privacy filter with search', async () => {
      const result = await logService.searchLogs({ 
        search: 'Attack',
        is_public: true 
      });

      // Should not include private logs
      expect(result.logs.every(log => log.is_public === true)).toBe(true);
    });

    it('should return empty results for non-matching search', async () => {
      const result = await logService.searchLogs({ 
        search: 'NonexistentContent12345',
        is_public: true 
      });

      expect(result.logs.length).toBe(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });
});
