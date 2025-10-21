import { describe, it, expect, beforeEach } from 'vitest';
import { TagService } from '../../src/services/TagService.js';
import { createDrizzleDB, type DrizzleDB } from '../../src/db/drizzle.js';
import { clearTestData, getTestD1Database, createTestUser } from '../helpers/app.js';
import { CreateTagData, UpdateTagData } from '../../src/models/Tag.js';

describe('TagService', () => {
  describe('getTagSupportByName', () => {
    it('should return Wikipedia summary for support_type=wikipedia_summary', async () => {
      // Wikipedia APIをモック
      global.fetch = async (url: any) => {
        if (typeof url === 'string' && url.includes('wikipedia.org')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              extract: 'テストの概要',
              content_urls: { desktop: { page: 'https://ja.wikipedia.org/wiki/テスト' } }
            })
          } as any;
        }
        throw new Error('Unexpected fetch call');
      };
      const result = await tagService.getTagSupportByName('テスト', 'wikipedia_summary');
      expect(result.content).toContain('テストの概要');
      expect(result.content).toContain('Wikipedia');
      expect(result.support_type).toBe('wikipedia_summary');
    });

    it('should return AI enhanced summary for support_type=ai_enhanced', async () => {
      // AiServiceのモック
      const mockAiService = {
        generateTagContentFromName: async (tagName: string) => ({
          content: `AI生成: ${tagName}`
        })
      };
      tagService.setAiService(mockAiService as any);
      const result = await tagService.getTagSupportByName('AIタグ', 'ai_enhanced');
      expect(result.content).toContain('AI生成: AIタグ');
      expect(result.support_type).toBe('ai_enhanced');
    });

    it('should throw error if AI service not set for ai_enhanced', async () => {
      tagService.setAiService(undefined as any);
      await expect(tagService.getTagSupportByName('AIタグ', 'ai_enhanced')).rejects.toThrow('AI service not available');
    });

    it('should throw error for invalid support_type', async () => {
      await expect(tagService.getTagSupportByName('タグ', 'invalid_type')).rejects.toThrow('Unsupported support type');
    });

    it('should fall back to search when direct Wikipedia lookup fails', async () => {
      // Wikipedia APIをモック: 最初は404、検索で記事を見つける
      let callCount = 0;
      global.fetch = async (url: any) => {
        if (typeof url === 'string' && url.includes('wikipedia.org')) {
          callCount++;
          
          // 最初の直接検索（REST API）は404を返す
          if (callCount === 1 && url.includes('/page/summary/')) {
            return {
              ok: false,
              status: 404,
              json: async () => ({ error: 'Not found' })
            } as any;
          }
          
          // OpenSearch APIで検索結果を返す
          if (url.includes('action=opensearch')) {
            return {
              ok: true,
              status: 200,
              json: async () => [
                'きみの色',           // 検索クエリ
                ['きみの色 (映画)'],  // 見つかった記事タイトル
                ['映画の説明'],       // 説明
                ['https://ja.wikipedia.org/wiki/%E3%81%8D%E3%81%BF%E3%81%AE%E8%89%B2_(%E6%98%A0%E7%94%BB)']
              ]
            } as any;
          }
          
          // 見つかったタイトルでの再検索
          if (url.includes('/page/summary/') && url.includes('%E3%81%8D%E3%81%BF%E3%81%AE%E8%89%B2')) {
            return {
              ok: true,
              status: 200,
              json: async () => ({
                extract: '映画「きみの色」は...',
                content_urls: { 
                  desktop: { 
                    page: 'https://ja.wikipedia.org/wiki/%E3%81%8D%E3%81%BF%E3%81%AE%E8%89%B2_(%E6%98%A0%E7%94%BB)' 
                  } 
                }
              })
            } as any;
          }
        }
        throw new Error('Unexpected fetch call: ' + url);
      };
      
      const result = await tagService.getTagSupportByName('きみの色', 'wikipedia_summary');
      expect(result.content).toContain('映画「きみの色」は...');
      expect(result.content).toContain('Wikipedia');
      expect(result.support_type).toBe('wikipedia_summary');
      expect(callCount).toBeGreaterThanOrEqual(3); // 直接検索 + OpenSearch + 再検索
    });

    it('should throw error when search also fails to find article', async () => {
      // Wikipedia APIをモック: 直接検索も、OpenSearchも失敗
      global.fetch = async (url: any) => {
        if (typeof url === 'string' && url.includes('wikipedia.org')) {
          // 直接検索は404
          if (url.includes('/page/summary/')) {
            return {
              ok: false,
              status: 404,
              json: async () => ({ error: 'Not found' })
            } as any;
          }
          
          // OpenSearch APIも結果なし
          if (url.includes('action=opensearch')) {
            return {
              ok: true,
              status: 200,
              json: async () => [
                'xyzabc123notexist999',  // 検索クエリ
                [],                       // 結果なし
                [],
                []
              ]
            } as any;
          }
        }
        throw new Error('Unexpected fetch call: ' + url);
      };
      
      await expect(tagService.getTagSupportByName('xyzabc123notexist999', 'wikipedia_summary'))
        .rejects.toThrow('Wikipedia page not found');
    });
  });
  let tagService: TagService;
  let drizzleDB: DrizzleDB;

  beforeEach(async () => {
    await clearTestData();
    drizzleDB = createDrizzleDB(getTestD1Database());
    tagService = new TagService(drizzleDB);

    await Promise.all([
      createTestUser('user-123', 'tag-user-123'),
      createTestUser('user-1', 'tag-user-1'),
      createTestUser('user-2', 'tag-user-2')
    ]);
  });

  describe('createTag', () => {
    it('should create a new tag with minimal data', async () => {
      const createData: CreateTagData = {
        name: 'Anime'
      };
      const createdBy = 'user-123';

      const result = await tagService.createTag(createData, createdBy);

      expect(result).toMatchObject({
        id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/), // UUID format
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
        id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/), // UUID format
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
        .rejects.toThrow('Tag not found');
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

      expect(result.items).toHaveLength(4);
      expect(result.items.map((t) => t.name).sort()).toEqual(['Anime', 'Attack on Titan', 'Manga', 'Movies']);
    });

    it('should filter tags by name search', async () => {
      const result = await tagService.searchTags({ search: 'anime' });

      expect(result.items).toHaveLength(2);
      expect(result.items.map((t) => t.name).sort()).toEqual(['Anime', 'Attack on Titan']);
    });

    it('should filter tags by description search', async () => {
      const result = await tagService.searchTags({ search: 'Japanese' });

      expect(result.items).toHaveLength(2);
      expect(result.items.map((t) => t.name).sort()).toEqual(['Anime', 'Manga']);
    });

    it('should respect limit parameter', async () => {
      const result = await tagService.searchTags({ limit: 2 });

      expect(result.items).toHaveLength(2);
    });

    it('should respect offset parameter', async () => {
      const allResults = await tagService.searchTags();
      const offsetResults = await tagService.searchTags({ offset: 2 });

      expect(offsetResults.items).toHaveLength(2);
      expect(offsetResults.items[0].id).not.toBe(allResults.items[0].id);
      expect(offsetResults.items[0].id).not.toBe(allResults.items[1].id);
    });

    it('should handle empty search results', async () => {
      const result = await tagService.searchTags({ search: 'nonexistent' });

      expect(result.items).toHaveLength(0);
    });

    it('should be case insensitive', async () => {
      const result1 = await tagService.searchTags({ search: 'anime' });
      const result2 = await tagService.searchTags({ search: 'ANIME' });
      const result3 = await tagService.searchTags({ search: 'Anime' });

      expect(result1.items.length).toBeGreaterThan(0);
      expect(result1.items.length).toBe(result2.items.length);
      expect(result1.items.length).toBe(result3.items.length);
      expect(result1.items.map(t => t.id).sort()).toEqual(result2.items.map(t => t.id).sort());
      expect(result1.items.map(t => t.id).sort()).toEqual(result3.items.map(t => t.id).sort());
    });

    it('should support 1-character search using LIKE fallback', async () => {
      // Single character search should work with LIKE fallback
      const result = await tagService.searchTags({ search: 'A' });

      // Should find tags containing 'A' (Anime, Attack on Titan, Manga, etc.)
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.some(tag => tag.name.toLowerCase().includes('a'))).toBe(true);
    });

    it('should support 2-character search using LIKE fallback', async () => {
      // Two character search should work with LIKE fallback
      const result = await tagService.searchTags({ search: 'an' });

      // Should find tags containing 'an' (Anime, Manga, etc.)
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.some(tag => 
        tag.name.toLowerCase().includes('an') || 
        tag.description?.toLowerCase().includes('an')
      )).toBe(true);
    });

    it('should return tags ordered by updated_at DESC (newest first)', async () => {
      // Clear and create tags with delays to ensure different timestamps
      await clearTestData();
      await createTestUser('user-1', 'tag-user-1');
      
      const tag1 = await tagService.createTag({ name: 'First Tag' }, 'user-1');
      
      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const tag2 = await tagService.createTag({ name: 'Second Tag' }, 'user-1');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const tag3 = await tagService.createTag({ name: 'Third Tag' }, 'user-1');

      const result = await tagService.searchTags();

      // Should be ordered by updated_at DESC (newest first)
      expect(result.items).toHaveLength(3);
      expect(result.items[0].id).toBe(tag3.id); // Most recent
      expect(result.items[1].id).toBe(tag2.id);
      expect(result.items[2].id).toBe(tag1.id); // Oldest
    });

    it('should maintain updated_at DESC order when searching', async () => {
      // Clear and create tags with delays
      await clearTestData();
      await createTestUser('user-1', 'tag-user-1');
      
      await tagService.createTag({ name: 'Anime First', description: 'anime content' }, 'user-1');
      await new Promise(resolve => setTimeout(resolve, 10));
      const tag2 = await tagService.createTag({ name: 'Anime Second', description: 'more anime' }, 'user-1');
      await new Promise(resolve => setTimeout(resolve, 10));
      const tag3 = await tagService.createTag({ name: 'Anime Third', description: 'latest anime' }, 'user-1');

      const result = await tagService.searchTags({ search: 'anime' });

      // Should be ordered by updated_at DESC even when searching
      expect(result.items.length).toBeGreaterThanOrEqual(2);
      expect(result.items[0].id).toBe(tag3.id); // Most recent matching tag
      expect(result.items[1].id).toBe(tag2.id);
    });
  });

  describe('getTagUsageStats', () => {
    it('should return usage stats for tag', async () => {
      const tag = await tagService.createTag({ name: 'Test Tag' }, 'user-123');

      const result = await tagService.getTagUsageStats(tag.id);

      expect(result).toMatchObject({
        tagId: tag.id,
        usageCount: 0, // No logs associated yet
        lastUsed: null
      });
    });

    it('should handle tag with no associations', async () => {
      const result = await tagService.getTagUsageStats('non-existent-tag');

      expect(result).toMatchObject({
        tagId: 'non-existent-tag',
        usageCount: 0,
        lastUsed: null
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
      for (const tag of allTags.items) {
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

    it('should be case insensitive', async () => {
      const result1 = await tagService.getTagSuggestions('anime');
      const result2 = await tagService.getTagSuggestions('ANIME');
      const result3 = await tagService.getTagSuggestions('Anime');

      expect(result1.length).toBeGreaterThan(0);
      expect(result1.length).toBe(result2.length);
      expect(result1.length).toBe(result3.length);
      expect(result1.map(t => t.id).sort()).toEqual(result2.map(t => t.id).sort());
      expect(result1.map(t => t.id).sort()).toEqual(result3.map(t => t.id).sort());
    });

    it('should support 1-character search using LIKE fallback', async () => {
      // Single character search should work with LIKE fallback
      const result = await tagService.getTagSuggestions('A');

      // Should find tags containing 'A' (Anime, Animation, etc.)
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(tag => tag.name.toLowerCase().includes('a'))).toBe(true);
    });

    it('should support 2-character search using LIKE fallback', async () => {
      // Two character search should work with LIKE fallback
      const result = await tagService.getTagSuggestions('an');

      // Should find tags containing 'an' (Anime, Animation, etc.)
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(tag => 
        tag.name.toLowerCase().includes('an') || 
        tag.description?.toLowerCase().includes('an')
      )).toBe(true);
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

  describe('getRecentReferringTags', () => {
    it('should return tags that reference the target tag', async () => {
      // Create target tag
      const targetTag = await tagService.createTag({ name: 'Target Tag' }, 'user-1');
      
      // Create referring tags with associations
      const referringTag1 = await tagService.createTag({ 
        name: 'Referring Tag 1',
        description: `This references ${targetTag.name}`
      }, 'user-1');
      await tagService.createTagAssociation(referringTag1.id, targetTag.id);
      
      const referringTag2 = await tagService.createTag({ 
        name: 'Referring Tag 2',
        description: `Also references ${targetTag.name}`
      }, 'user-2');
      await tagService.createTagAssociation(referringTag2.id, targetTag.id);

      const result = await tagService.getRecentReferringTags(targetTag.id);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2);
      expect(result.some(tag => tag.id === referringTag1.id)).toBe(true);
      expect(result.some(tag => tag.id === referringTag2.id)).toBe(true);
    });

    it('should return empty array when no tags reference the target', async () => {
      const tag = await tagService.createTag({ name: 'Lonely Tag' }, 'user-1');

      const result = await tagService.getRecentReferringTags(tag.id);

      expect(result).toEqual([]);
    });

    it('should sort results by association creation date (newest first)', async () => {
      const targetTag = await tagService.createTag({ name: 'Popular Tag' }, 'user-1');
      
      // Create first reference
      const oldTag = await tagService.createTag({ name: 'Old Ref' }, 'user-1');
      await tagService.createTagAssociation(oldTag.id, targetTag.id);
      
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Create second reference
      const newTag = await tagService.createTag({ name: 'New Ref' }, 'user-2');
      await tagService.createTagAssociation(newTag.id, targetTag.id);

      const result = await tagService.getRecentReferringTags(targetTag.id);

      expect(result.length).toBe(2);
      // The newer reference should come first
      expect(result[0].id).toBe(newTag.id);
      expect(result[1].id).toBe(oldTag.id);
    });

    it('should respect limit parameter', async () => {
      const targetTag = await tagService.createTag({ name: 'Target' }, 'user-1');
      
      // Create 5 referring tags
      for (let i = 0; i < 5; i++) {
        const refTag = await tagService.createTag({ name: `Ref ${i}` }, 'user-1');
        await tagService.createTagAssociation(refTag.id, targetTag.id);
      }

      const result = await tagService.getRecentReferringTags(targetTag.id, 3);

      expect(result.length).toBe(3);
    });

    it('should not include bidirectional references from getTagAssociations', async () => {
      const tag1 = await tagService.createTag({ name: 'Tag 1' }, 'user-1');
      const tag2 = await tagService.createTag({ name: 'Tag 2' }, 'user-1');
      
      // Create association: tag1 -> tag2
      await tagService.createTagAssociation(tag1.id, tag2.id);

      // getRecentReferringTags for tag2 should return tag1
      const referringToTag2 = await tagService.getRecentReferringTags(tag2.id);
      expect(referringToTag2.length).toBe(1);
      expect(referringToTag2[0].id).toBe(tag1.id);

      // getRecentReferringTags for tag1 should return empty (no one references tag1)
      const referringToTag1 = await tagService.getRecentReferringTags(tag1.id);
      expect(referringToTag1.length).toBe(0);
    });
  });
});