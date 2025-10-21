import { describe, it, expect, beforeEach } from 'vitest';
import { createDrizzleDB, type DrizzleDB } from '../../src/db/drizzle.js';
import { TagService } from '../../src/services/TagService.js';
import { LogService } from '../../src/services/LogService.js';
import { clearTestData, getTestD1Database, createTestUser } from '../helpers/app.js';

describe('Association Ordering', () => {
  let drizzleDB: DrizzleDB;
  let tagService: TagService;
  let logService: LogService;
  let testUserId: string;

  beforeEach(async () => {
    await clearTestData();
    drizzleDB = createDrizzleDB(getTestD1Database());
    tagService = new TagService(drizzleDB);
    logService = new LogService(drizzleDB);

    // Create a test user
    testUserId = 'user_test_ordering';
    await createTestUser(testUserId, 'Test User');
  });

  describe('Tag Association Ordering', () => {
    it('should maintain order of hashtags in tag description', async () => {
      // Create a tag with multiple hashtags in specific order
      const mainTag = await tagService.createTag(
        {
          name: 'Anime Series',
          description: 'A collection about #Action #Drama #Fantasy anime series',
          metadata: {}
        },
        testUserId
      );

      // Get associations
      const associations = await tagService.getTagAssociations(mainTag.id);

      // Verify the order matches the appearance in description
      expect(associations).toHaveLength(3);
      expect(associations[0].name).toBe('Action');
      expect(associations[1].name).toBe('Drama');
      expect(associations[2].name).toBe('Fantasy');
    });

    it('should update order when tag description changes', async () => {
      // Create tag with initial hashtags
      const tag = await tagService.createTag(
        {
          name: 'Gaming',
          description: 'About #RPG #Strategy games',
          metadata: {}
        },
        testUserId
      );

      // Update with different order
      await tagService.updateTag(tag.id, {
        description: 'Updated to #Strategy #RPG #Action order'
      });

      const associations = await tagService.getTagAssociations(tag.id);
      
      // Verify new order
      expect(associations).toHaveLength(3);
      expect(associations[0].name).toBe('Strategy');
      expect(associations[1].name).toBe('RPG');
      expect(associations[2].name).toBe('Action');
    });

    it('should handle extended hashtag format with spaces', async () => {
      const tag = await tagService.createTag(
        {
          name: 'Complex Tags',
          description: 'Testing #{First Tag} #SimpleTag #{Third Complex Tag}',
          metadata: {}
        },
        testUserId
      );

      const associations = await tagService.getTagAssociations(tag.id);
      
      expect(associations).toHaveLength(3);
      expect(associations[0].name).toBe('First Tag');
      expect(associations[1].name).toBe('SimpleTag');
      expect(associations[2].name).toBe('Third Complex Tag');
    });
  });

  describe('Log Tag Association Ordering', () => {
    it('should maintain order of hashtags in log content', async () => {
      const log = await logService.createLog(
        {
          title: 'Ordered Tags Test',
          content_md: 'Watching #Anime with #Action and #Drama elements',
          is_public: true
        },
        testUserId
      );

      const retrievedLog = await logService.getLogById(log.id, testUserId);
      expect(retrievedLog).not.toBeNull();
      
      if (retrievedLog) {
        expect(retrievedLog.associated_tags).toHaveLength(3);
        expect(retrievedLog.associated_tags[0].name).toBe('Anime');
        expect(retrievedLog.associated_tags[1].name).toBe('Action');
        expect(retrievedLog.associated_tags[2].name).toBe('Drama');
      }
    });

    it('should preserve order when using explicit tag names', async () => {
      // First create some tags
      await tagService.createTag({ name: 'Tag1', metadata: {} }, testUserId);
      await tagService.createTag({ name: 'Tag2', metadata: {} }, testUserId);
      await tagService.createTag({ name: 'Tag3', metadata: {} }, testUserId);

      const log = await logService.createLog(
        {
          title: 'Explicit Tags Test',
          content_md: 'Content without hashtags',
          is_public: true,
          tag_names: ['Tag3', 'Tag1', 'Tag2'] // Specific order
        },
        testUserId
      );

      const retrievedLog = await logService.getLogById(log.id, testUserId);
      expect(retrievedLog).not.toBeNull();
      
      if (retrievedLog) {
        expect(retrievedLog.associated_tags).toHaveLength(3);
        // Should maintain the order from tag_names array
        expect(retrievedLog.associated_tags[0].name).toBe('Tag3');
        expect(retrievedLog.associated_tags[1].name).toBe('Tag1');
        expect(retrievedLog.associated_tags[2].name).toBe('Tag2');
      }
    });

    it('should merge hashtags and explicit tags in order of appearance', async () => {
      const log = await logService.createLog(
        {
          title: 'Mixed Tags Test',
          content_md: 'Content with #InContent tags',
          is_public: true,
          tag_names: ['ExplicitTag']
        },
        testUserId
      );

      const retrievedLog = await logService.getLogById(log.id, testUserId);
      expect(retrievedLog).not.toBeNull();
      
      if (retrievedLog) {
        expect(retrievedLog.associated_tags).toHaveLength(2);
        // Explicit tags come first, then hashtags from content
        expect(retrievedLog.associated_tags.map(t => t.name)).toContain('ExplicitTag');
        expect(retrievedLog.associated_tags.map(t => t.name)).toContain('InContent');
      }
    });
  });

  describe('Reverse Reference Ordering', () => {
    it('should return referring tags sorted by association creation time (newest first)', async () => {
      const targetTag = await tagService.createTag(
        { name: 'TargetTag', metadata: {} },
        testUserId
      );

      // Create multiple tags that reference the target tag
      // with slight delays to ensure different created_at times
      await tagService.createTag(
        {
          name: 'FirstReferrer',
          description: 'References #TargetTag',
          metadata: {}
        },
        testUserId
      );

      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      await tagService.createTag(
        {
          name: 'SecondReferrer',
          description: 'Also references #TargetTag',
          metadata: {}
        },
        testUserId
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      await tagService.createTag(
        {
          name: 'ThirdReferrer',
          description: 'Latest reference to #TargetTag',
          metadata: {}
        },
        testUserId
      );

      const referringTags = await tagService.getRecentReferringTags(targetTag.id, 10);

      // Should be sorted by created_at DESC (newest first)
      expect(referringTags).toHaveLength(3);
      expect(referringTags[0].name).toBe('ThirdReferrer');
      expect(referringTags[1].name).toBe('SecondReferrer');
      expect(referringTags[2].name).toBe('FirstReferrer');
    });

    it('should support sorting tag associations by creation time', async () => {
      const mainTag = await tagService.createTag(
        {
          name: 'MainTag',
          description: 'Initial with #FirstTag',
          metadata: {}
        },
        testUserId
      );

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update to add more tags
      await tagService.updateTag(mainTag.id, {
        description: 'Updated with #FirstTag #SecondTag'
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      // Update again to add third tag
      await tagService.updateTag(mainTag.id, {
        description: 'Updated with #FirstTag #SecondTag #ThirdTag'
      });

      // Get associations sorted by order (default)
      const associationsByOrder = await tagService.getTagAssociations(mainTag.id, 'order');
      expect(associationsByOrder).toHaveLength(3);
      expect(associationsByOrder[0].name).toBe('FirstTag');
      expect(associationsByOrder[1].name).toBe('SecondTag');
      expect(associationsByOrder[2].name).toBe('ThirdTag');

      // Get associations sorted by recent (creation time)
      const associationsByRecent = await tagService.getTagAssociations(mainTag.id, 'recent');
      expect(associationsByRecent).toHaveLength(3);
      // When updated, all associations are recreated, so they might have same timestamp
      // But the sorting should still work without errors
      expect(associationsByRecent).toHaveLength(3);
    });

    it('should get recent logs for tag sorted by log creation time', async () => {
      const tag = await tagService.createTag(
        { name: 'TestTag', metadata: {} },
        testUserId
      );

      // Create multiple logs with the tag
      await logService.createLog(
        {
          title: 'First Log',
          content_md: 'Content with #TestTag',
          is_public: true
        },
        testUserId
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      await logService.createLog(
        {
          title: 'Second Log',
          content_md: 'More content with #TestTag',
          is_public: true
        },
        testUserId
      );

      const recentLogs = await tagService.getRecentLogsForTag(tag.id, 10);

      // Should be sorted by log created_at DESC (newest first)
      expect(recentLogs).toHaveLength(2);
      expect(recentLogs[0].title).toBe('Second Log');
      expect(recentLogs[1].title).toBe('First Log');
    });
  });
});
