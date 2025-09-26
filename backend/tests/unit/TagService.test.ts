import { describe, it, expect, beforeEach } from 'vitest';
import { TagService, TagUsageStats } from '../../src/services/TagService.js';
import { Database } from '../../src/db/database.js';
import { mockDB } from '../helpers/app.js';
import { Tag, CreateTagData, UpdateTagData, TagSearchParams } from '../../src/models/Tag.js';

describe('TagService', () => {
  let tagService: TagService;
  let mockDatabase: Database;

  beforeEach(() => {
    mockDB.clear(); // Clear data between tests
    mockDatabase = new Database({ d1Database: mockDB });
    tagService = new TagService(mockDatabase);
  });

  describe('createTag', () => {
    it('should create a new tag with minimal data', async () => {
      const createData: CreateTagData = {
        name: 'Anime'
      };
      const createdBy = 'user-123';

      const result = await tagService.createTag(createData, createdBy);

      expect(result).toMatchObject({
        id: expect.stringMatching(/^tag_\d+$/),
        name: 'Anime',
        description: undefined,
        metadata: {},
        created_by: createdBy,
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });
      expect(result.created_at).toBe(result.updated_at);
    });

    it('should create a new tag with full data', async () => {
      const createData: CreateTagData = {
        name: 'Attack on Titan',
        description: 'Popular anime series',
        metadata: {
          year: 2013,
          studio: 'Studio WIT',
          genre: 'Action'
        }
      };
      const createdBy = 'user-123';

      const result = await tagService.createTag(createData, createdBy);

      expect(result).toMatchObject({
        id: expect.stringMatching(/^tag_\d+$/),
        name: 'Attack on Titan',
        description: 'Popular anime series',
        metadata: {
          year: 2013,
          studio: 'Studio WIT',
          genre: 'Action'
        },
        created_by: createdBy,
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });
    });

    it('should handle empty metadata object', async () => {
      const createData: CreateTagData = {
        name: 'Test Tag',
        metadata: {}
      };

      const result = await tagService.createTag(createData, 'user-123');

      expect(result.metadata).toEqual({});
    });
  });

  describe('updateTag', () => {
    it('should update tag name', async () => {
      // Setup: Create a tag first
      const originalTag = await tagService.createTag({ name: 'Original Name' }, 'user-123');
      
      const updateData: UpdateTagData = {
        name: 'Updated Name'
      };

      const result = await tagService.updateTag(originalTag.id, updateData);

      expect(result.name).toBe('Updated Name');
      expect(result.id).toBe(originalTag.id);
      expect(result.updated_at).not.toBe(originalTag.updated_at);
    });

    it('should update tag description', async () => {
      const originalTag = await tagService.createTag({ name: 'Test Tag' }, 'user-123');
      
      const updateData: UpdateTagData = {
        description: 'New description'
      };

      const result = await tagService.updateTag(originalTag.id, updateData);

      expect(result.description).toBe('New description');
      expect(result.name).toBe(originalTag.name); // Should remain unchanged
    });

    it('should update tag metadata', async () => {
      const originalTag = await tagService.createTag({ 
        name: 'Test Tag',
        metadata: { version: 1 }
      }, 'user-123');
      
      const updateData: UpdateTagData = {
        metadata: { version: 2, category: 'updated' }
      };

      const result = await tagService.updateTag(originalTag.id, updateData);

      expect(result.metadata).toEqual({ version: 2, category: 'updated' });
    });

    it('should update multiple fields at once', async () => {
      const originalTag = await tagService.createTag({ name: 'Original' }, 'user-123');
      
      const updateData: UpdateTagData = {
        name: 'Updated Name',
        description: 'Updated Description',
        metadata: { updated: true }
      };

      const result = await tagService.updateTag(originalTag.id, updateData);

      expect(result).toMatchObject({
        name: 'Updated Name',
        description: 'Updated Description',
        metadata: { updated: true }
      });
    });

    it('should throw error when no fields to update', async () => {
      const tag = await tagService.createTag({ name: 'Test' }, 'user-123');
      
      const updateData: UpdateTagData = {};

      await expect(tagService.updateTag(tag.id, updateData))
        .rejects.toThrow('No fields to update');
    });

    it('should throw error when tag not found after update', async () => {
      const updateData: UpdateTagData = { name: 'New Name' };

      await expect(tagService.updateTag('non-existent-id', updateData))
        .rejects.toThrow('Tag not found after update');
    });
  });

  describe('getTagById', () => {
    it('should return tag when found', async () => {
      const createdTag = await tagService.createTag({
        name: 'Test Tag',
        description: 'Test Description',
        metadata: { test: true }
      }, 'user-123');

      const result = await tagService.getTagById(createdTag.id);

      expect(result).toMatchObject({
        id: createdTag.id,
        name: 'Test Tag',
        description: 'Test Description',
        metadata: { test: true },
        created_by: 'user-123'
      });
    });

    it('should return null when tag not found', async () => {
      const result = await tagService.getTagById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('searchTags', () => {
    beforeEach(async () => {
      // Setup test data
      await tagService.createTag({ name: 'Anime', description: 'Japanese animation' }, 'user-1');
      await tagService.createTag({ name: 'Manga', description: 'Japanese comics' }, 'user-1');
      await tagService.createTag({ name: 'Movies', description: 'Film content' }, 'user-2');
      await tagService.createTag({ name: 'Attack on Titan', description: 'Popular anime series' }, 'user-1');
    });

    it('should return all tags when no search specified', async () => {
      const result = await tagService.searchTags();

      expect(result).toHaveLength(4);
      expect(result.map(t => t.name).sort()).toEqual(['Anime', 'Attack on Titan', 'Manga', 'Movies']);
    });

    it('should filter tags by name search', async () => {
      const result = await tagService.searchTags({ search: 'anime' });

      expect(result).toHaveLength(2);
      expect(result.map(t => t.name).sort()).toEqual(['Anime', 'Attack on Titan']);
    });

    it('should filter tags by description search', async () => {
      const result = await tagService.searchTags({ search: 'Japanese' });

      expect(result).toHaveLength(2);
      expect(result.map(t => t.name).sort()).toEqual(['Anime', 'Manga']);
    });

    it('should respect limit parameter', async () => {
      const result = await tagService.searchTags({ limit: 2 });

      expect(result).toHaveLength(2);
    });

    it('should respect offset parameter', async () => {
      const allResults = await tagService.searchTags();
      const offsetResults = await tagService.searchTags({ offset: 2 });

      expect(offsetResults).toHaveLength(2);
      expect(offsetResults[0].id).not.toBe(allResults[0].id);
      expect(offsetResults[0].id).not.toBe(allResults[1].id);
    });

    it('should handle empty search results', async () => {
      const result = await tagService.searchTags({ search: 'nonexistent' });

      expect(result).toHaveLength(0);
    });
  });

  describe('getTagUsageStats', () => {
    it('should return usage stats for tag', async () => {
      const tag = await tagService.createTag({ name: 'Test Tag' }, 'user-123');

      const result = await tagService.getTagUsageStats(tag.id);

      expect(result).toMatchObject({
        tagId: tag.id,
        usageCount: 0, // No logs associated yet
        lastUsed: expect.any(String)
      });
    });

    it('should handle tag with no associations', async () => {
      const result = await tagService.getTagUsageStats('non-existent-tag');

      expect(result).toMatchObject({
        tagId: 'non-existent-tag',
        usageCount: 0,
        lastUsed: expect.any(String)
      });
    });
  });

  describe('getPopularTags', () => {
    beforeEach(async () => {
      // Setup test data
      await tagService.createTag({ name: 'Popular Tag 1' }, 'user-1');
      await tagService.createTag({ name: 'Popular Tag 2' }, 'user-1');
      await tagService.createTag({ name: 'Unpopular Tag' }, 'user-2');
    });

    it('should return tags ordered by popularity', async () => {
      const result = await tagService.getPopularTags();

      expect(result).toHaveLength(3);
      expect(result.map(t => t.name)).toEqual(['Popular Tag 1', 'Popular Tag 2', 'Unpopular Tag']);
    });

    it('should respect limit parameter', async () => {
      const result = await tagService.getPopularTags(2);

      expect(result).toHaveLength(2);
    });

    it('should handle empty results', async () => {
      // Clear all data first
      const allTags = await tagService.searchTags();
      for (const tag of allTags) {
        await tagService.deleteTag(tag.id);
      }

      const result = await tagService.getPopularTags();

      expect(result).toHaveLength(0);
    });
  });

  describe('getRecentTagsForUser', () => {
    it('should return recent tags for user', async () => {
      const result = await tagService.getRecentTagsForUser('user-123');

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeLessThanOrEqual(10); // Default limit
    });

    it('should respect limit parameter', async () => {
      const result = await tagService.getRecentTagsForUser('user-123', 5);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array for user with no logs', async () => {
      const result = await tagService.getRecentTagsForUser('non-existent-user');

      expect(result).toEqual([]);
    });
  });

  describe('getTagSuggestions', () => {
    beforeEach(async () => {
      await tagService.createTag({ name: 'Anime', description: 'Japanese animation' }, 'user-1');
      await tagService.createTag({ name: 'Animation', description: 'Animated content' }, 'user-1');
      await tagService.createTag({ name: 'Movies', description: 'Film content' }, 'user-2');
    });

    it('should return suggestions based on name match', async () => {
      const result = await tagService.getTagSuggestions('ani');

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(tag => tag.name.toLowerCase().includes('ani'))).toBe(true);
    });

    it('should return suggestions based on description match', async () => {
      const result = await tagService.getTagSuggestions('animation');

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(tag => 
        tag.name.toLowerCase().includes('animation') || 
        tag.description?.toLowerCase().includes('animation')
      )).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const result = await tagService.getTagSuggestions('a', 2);

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array for no matches', async () => {
      const result = await tagService.getTagSuggestions('zzz-no-match');

      expect(result).toEqual([]);
    });
  });

  describe('deleteTag', () => {
    it('should delete tag successfully', async () => {
      const tag = await tagService.createTag({ name: 'To Delete' }, 'user-123');

      await tagService.deleteTag(tag.id);

      const result = await tagService.getTagById(tag.id);
      expect(result).toBeNull();
    });

    it('should delete tag associations when deleting tag', async () => {
      const tag = await tagService.createTag({ name: 'To Delete' }, 'user-123');

      // This should not throw even if there are no associations
      await expect(tagService.deleteTag(tag.id)).resolves.not.toThrow();
    });

    it('should handle deleting non-existent tag', async () => {
      // Should not throw error
      await expect(tagService.deleteTag('non-existent-id')).resolves.not.toThrow();
    });
  });
});