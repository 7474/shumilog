import { describe, it, expect, beforeEach } from 'vitest';
import { LogService } from '../../src/services/LogService.js';
import { createDrizzleDB, type DrizzleDB } from '../../src/db/drizzle.js';
import { clearTestData, getTestD1Database, createTestUser, seedTestTags ,
  TEST_TAG_IDS,
} from '../helpers/app.js';
import { CreateLogData, UpdateLogData } from '../../src/models/Log.js';

describe('LogService', () => {
  let logService: LogService;
  let drizzleDB: DrizzleDB;

  beforeEach(async () => {
    await clearTestData();
    drizzleDB = createDrizzleDB(getTestD1Database());
    logService = new LogService(drizzleDB);

    await Promise.all([
      createTestUser('user-123', 'testuser'),
      createTestUser('user-1', 'testuser1'),
      createTestUser('user-456', 'testuser456'),
      createTestUser('other-user', 'otheruser')
    ]);
    await seedTestTags();
  });

  describe('createLog', () => {
    it('should create a new log with basic data', async () => {
      const createData: CreateLogData = {
        tag_ids: [],
        content_md: 'This is my first log entry!',
        is_public: true
      };
      const userId = 'user-123';

      const result = await logService.createLog(createData, userId);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/); // UUID format
      expect(result.content_md).toBe('This is my first log entry!');
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
    });

    it('should create a log with title and tags', async () => {
      const createData: CreateLogData = {
        tag_ids: [TEST_TAG_IDS.ANIME, TEST_TAG_IDS.MANGA],
        title: 'My Awesome Log',
        content_md: 'This is detailed content with **markdown**.',
        is_public: false
      };
      const userId = 'user-123';

      const result = await logService.createLog(createData, userId);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/); // UUID format
      expect(result.title).toBe('My Awesome Log');
      expect(result.content_md).toBe('This is detailed content with **markdown**.');
    });

    it('should handle empty tag array', async () => {
      const createData: CreateLogData = {
        tag_ids: [],
        content_md: 'Content without tags',
        is_public: true
      };

      const result = await logService.createLog(createData, 'user-123');

      expect(result).toBeDefined();
      expect(result.content_md).toBe('Content without tags');
    });
  });

  describe('updateLog', () => {
    let existingLogId: string;
    const userId = 'user-123';

    beforeEach(async () => {
      // Create a log to update
      const createData: CreateLogData = {
        tag_ids: [],
        title: 'Original Title',
        content_md: 'Original content',
        is_public: true
      };
      const createdLog = await logService.createLog(createData, userId);
      existingLogId = createdLog.id;
    });

    it('should update log title', async () => {
      const updateData: UpdateLogData = {
        title: 'Updated Title'
      };

      const result = await logService.updateLog(existingLogId, updateData, userId);

      expect(result).toBeDefined();
      expect(result.title).toBe('Updated Title');
      expect(result.content_md).toBe('Original content'); // Should remain unchanged
    });

    it('should update log content', async () => {
      const updateData: UpdateLogData = {
        content_md: '# Updated Content\n\nThis is new content!'
      };

      const result = await logService.updateLog(existingLogId, updateData, userId);

      expect(result).toBeDefined();
      expect(result.content_md).toBe('# Updated Content\n\nThis is new content!');
      expect(result.title).toBe('Original Title'); // Should remain unchanged
    });

    it('should update multiple fields at once', async () => {
      const updateData: UpdateLogData = {
        title: 'Multi-Update Title',
        content_md: 'Multi-update content',
        is_public: false,
        tag_ids: [TEST_TAG_IDS.MANGA]
      };

      const result = await logService.updateLog(existingLogId, updateData, userId);

      expect(result).toBeDefined();
      expect(result.title).toBe('Multi-Update Title');
      expect(result.content_md).toBe('Multi-update content');
    });

    it('should throw error for unauthorized user', async () => {
      const updateData: UpdateLogData = {
        title: 'Unauthorized Update'
      };
      const unauthorizedUser = 'user-456';

      await expect(logService.updateLog(existingLogId, updateData, unauthorizedUser))
        .rejects.toThrow('Unauthorized: User does not own this log');
    });

    it('should throw error for non-existent log', async () => {
      const updateData: UpdateLogData = {
        title: 'Update Non-existent'
      };

      await expect(logService.updateLog('non-existent-id', updateData, userId))
        .rejects.toThrow('Unauthorized: User does not own this log');
    });
  });

  describe('getLogById', () => {
    it('should return log when found', async () => {
      const createData: CreateLogData = {
        tag_ids: [],
        title: 'Test Log',
        content_md: 'Test content',
        is_public: true
      };
      const createdLog = await logService.createLog(createData, 'user-123');

      const result = await logService.getLogById(createdLog.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(createdLog.id);
      expect(result?.title).toBe('Test Log');
      expect(result?.content_md).toBe('Test content');
    });

    it('should return null when log not found', async () => {
      const result = await logService.getLogById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('deleteLog', () => {
    let existingLogId: string;
    const userId = 'user-123';

    beforeEach(async () => {
      const createData: CreateLogData = {
        tag_ids: [],
        title: 'Log to Delete',
        content_md: 'This will be deleted',
        is_public: true
      };
      const createdLog = await logService.createLog(createData, userId);
      existingLogId = createdLog.id;
    });

    it('should delete log successfully', async () => {
      await logService.deleteLog(existingLogId, userId);

      const result = await logService.getLogById(existingLogId);
      expect(result).toBeNull();
    });

    it('should throw error for unauthorized user', async () => {
      const unauthorizedUser = 'user-456';

      await expect(logService.deleteLog(existingLogId, unauthorizedUser))
        .rejects.toThrow('Unauthorized: User does not own this log');
    });

    it('should throw error for non-existent log', async () => {
      await expect(logService.deleteLog('non-existent-id', userId))
        .rejects.toThrow('Unauthorized: User does not own this log');
    });
  });

  describe('validateLogOwnership', () => {
    let existingLogId: string;
    const userId = 'user-123';

    beforeEach(async () => {
      const createData: CreateLogData = {
        tag_ids: [],
        content_md: 'Ownership test',
        is_public: true
      };
      const createdLog = await logService.createLog(createData, userId);
      existingLogId = createdLog.id;
    });

    it('should return true for log owner', async () => {
      const result = await logService.validateLogOwnership(existingLogId, userId);

      expect(result).toBe(true);
    });

    it('should return false for non-owner', async () => {
      const result = await logService.validateLogOwnership(existingLogId, 'other-user');

      expect(result).toBe(false);
    });

    it('should return false for non-existent log', async () => {
      const result = await logService.validateLogOwnership('non-existent-id', userId);

      expect(result).toBe(false);
    });
  });

  describe('getUserLogStats', () => {
    const userId = 'user-123';

    beforeEach(async () => {
      // Create test logs for stats
      await logService.createLog({
        tag_ids: [],
        content_md: 'Public log',
        is_public: true
      }, userId);

      await logService.createLog({
        tag_ids: [],
        content_md: 'Private log',
        is_public: false
      }, userId);
    });

    it('should return user log statistics', async () => {
      const result = await logService.getUserLogStats(userId);

      expect(result).toMatchObject({
        totalLogs: expect.any(Number),
        publicLogs: expect.any(Number),
        recentLogsCount: expect.any(Number)
      });

      expect(result.totalLogs).toBeGreaterThan(0);
      expect(result.publicLogs).toBeGreaterThan(0);
    });

    it('should return zero stats for user with no logs', async () => {
      const result = await logService.getUserLogStats('user-with-no-logs');

      expect(result.totalLogs).toBe(0);
      expect(result.publicLogs).toBe(0);
      expect(result.recentLogsCount).toBe(0);
    });
  });

  describe('searchLogs', () => {
    beforeEach(async () => {
      // Create test data
      await logService.createLog({
        tag_ids: [TEST_TAG_IDS.ANIME, TEST_TAG_IDS.MANGA],
        title: 'Anime Review',
        content_md: 'Great anime series!',
        is_public: true
      }, 'user-1');
    });

    it('should return search results structure', async () => {
      const result = await logService.searchLogs({});

      expect(result).toMatchObject({
        logs: expect.any(Array),
        total: expect.any(Number),
        hasMore: expect.any(Boolean)
      });
    });

    it('should handle empty search parameters', async () => {
      const result = await logService.searchLogs({});

      expect(result.logs).toBeInstanceOf(Array);
      expect(typeof result.total).toBe('number');
      expect(typeof result.hasMore).toBe('boolean');
    });

    it('should handle search with user_id filter', async () => {
      const result = await logService.searchLogs({ user_id: 'user-1' });

      expect(result.logs).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getUserLogs', () => {
    const userId = 'user-123';

    beforeEach(async () => {
      // Create test logs for user
      await logService.createLog({
        tag_ids: [],
        title: 'User Log 1',
        content_md: 'First log',
        is_public: true
      }, userId);
    });

    it('should return user logs structure', async () => {
      const result = await logService.getUserLogs(userId);

      expect(result).toMatchObject({
        logs: expect.any(Array),
        total: expect.any(Number),
        hasMore: expect.any(Boolean)
      });
    });

    it('should handle pagination parameters', async () => {
      const result = await logService.getUserLogs(userId, 10, 0);

      expect(result.logs).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should return empty result for user with no logs', async () => {
      const result = await logService.getUserLogs('user-with-no-logs');

      expect(result.logs).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });
});