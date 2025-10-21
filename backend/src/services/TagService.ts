import { Tag, TagModel, CreateTagData, UpdateTagData, TagSearchParams } from '../models/Tag.js';
import { TagRevisionModel } from '../models/TagRevision.js';
import type { PaginatedResult } from '../types/pagination.js';
import type { DrizzleDB } from '../db/drizzle.js';
import { queryAll, queryFirst, queryWithPagination } from '../db/query-helpers.js';
import { AiService } from './AiService.js';
import { tags, tagAssociations, logTagAssociations, tagRevisions } from '../db/schema.js';
import { eq, sql as drizzleSql } from 'drizzle-orm';

export interface TagUsageStats {
  tagId: string;
  usageCount: number;
  lastUsed: string | null;
}

export class TagService {
  private aiService?: AiService;

  constructor(private db: DrizzleDB) {}

  /**
   * AiServiceを設定（オプション）
   * テスト時にモックを注入するために使用
   */
  setAiService(aiService: AiService): void {
    this.aiService = aiService;
  }

  private generateTagId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    // Fallback for environments without crypto.randomUUID
    return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  private async getTagRow(tagId: string): Promise<any | null> {
    const result = await this.db
      .select()
      .from(tags)
      .where(eq(tags.id, tagId))
      .limit(1);
    
    if (!result || result.length === 0) {
      return null;
    }
    
    // Convert camelCase to snake_case for compatibility with TagModel.fromRow
    const row = result[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      metadata: row.metadata,
      created_by: row.createdBy,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  async isTagOwnedBy(tagId: string, userId: string): Promise<boolean> {
    const result = await this.db
      .select({ createdBy: tags.createdBy })
      .from(tags)
      .where(eq(tags.id, tagId))
      .limit(1);

    if (!result || result.length === 0) {
      return false;
    }

    return result[0].createdBy === userId;
  }

  /**
   * Create a new tag
   */
  async createTag(data: CreateTagData, createdBy: string): Promise<Tag> {
    const now = new Date().toISOString();
    const tagId = this.generateTagId();
    
    await this.db.insert(tags).values({
      id: tagId,
      name: data.name,
      description: data.description || null,
      metadata: TagModel.serializeMetadata(data.metadata || {}),
      createdBy,
      createdAt: now,
      updatedAt: now,
    });

    const tag = {
      id: tagId,
      name: data.name,
      description: data.description,
      metadata: data.metadata || {},
      created_by: createdBy,
      created_at: now,
      updated_at: now
    };

    // Create initial revision (revision 0)
    await this.createRevision(tagId, tag, createdBy, 0);

    // Process hashtag associations in description
    if (data.description) {
      await this.processTagAssociations(tagId, data.description, createdBy);
    }

    return tag;
  }

  /**
   * Update a tag
   */
  async updateTag(tagId: string, data: UpdateTagData): Promise<Tag> {
    const existingTag = await this.getTagById(tagId);

    if (!existingTag) {
      throw new Error('Tag not found');
    }

    const updates: Partial<typeof tags.$inferInsert> = {};
    
    if (data.name !== undefined) {
      updates.name = data.name;
    }
    
    if (data.description !== undefined) {
      updates.description = data.description;
    }
    
    if (data.metadata !== undefined) {
      updates.metadata = TagModel.serializeMetadata(data.metadata);
    }
    
    if (Object.keys(updates).length === 0) {
      throw new Error('No fields to update');
    }
    
    updates.updatedAt = new Date().toISOString();
    
    await this.db
      .update(tags)
      .set(updates)
      .where(eq(tags.id, tagId));
    
    // Return updated tag
    const updatedTag = await this.getTagById(tagId);
    if (!updatedTag) {
      throw new Error('Tag not found after update');
    }
    
    // Create revision after update
    const nextRevisionNumber = await this.getNextRevisionNumber(tagId);
    await this.createRevision(tagId, updatedTag, updatedTag.created_by, nextRevisionNumber);
    
    // Process hashtag associations if description was updated
    if (data.description !== undefined) {
      await this.processTagAssociations(tagId, data.description || '', updatedTag.created_by);
    }
    
    return updatedTag;
  }

  /**
   * Get tag by ID
   */
  async getTagById(id: string): Promise<Tag | null> {
    const row = await this.getTagRow(id);
    return row ? TagModel.fromRow(row) : null;
  }

  /**
   * Get tag by name
   */
  async getTagByName(name: string): Promise<Tag | null> {
    const row = await queryFirst(
      this.db,
      drizzleSql`SELECT id, name, description, metadata, created_by, created_at, updated_at FROM tags WHERE name = ${name}`
    );
    return row ? TagModel.fromRow(row) : null;
  }

  /**
   * Search tags using FTS5 full-text search
   */
  async searchTags(options: TagSearchParams = {}): Promise<PaginatedResult<Tag>> {
    const { search, limit = 20, offset = 0 } = options;

    let selectQuery: ReturnType<typeof drizzleSql>;
    let countQuery: ReturnType<typeof drizzleSql>;

    if (search) {
      // Trigram tokenizer requires at least 3 characters
      // For shorter queries, use LIKE fallback
      const useFTS = search.length >= 3;
      
      if (useFTS) {
        // Use FTS5 for search - wrap in quotes to treat as phrase
        const searchQuery = `"${search.replace(/"/g, '""')}"`;
        selectQuery = drizzleSql`
          SELECT t.id, t.name, t.description, t.metadata, t.created_by, t.created_at, t.updated_at 
          FROM tags t
          JOIN tags_fts fts ON t.id = fts.tag_id
          WHERE tags_fts MATCH ${searchQuery}
          ORDER BY t.updated_at DESC
        `;
        countQuery = drizzleSql`
          SELECT COUNT(*) as total 
          FROM tags t
          JOIN tags_fts fts ON t.id = fts.tag_id
          WHERE tags_fts MATCH ${searchQuery}
        `;
      } else {
        // LIKE-based search for short queries (1-2 characters)
        const likePattern = `%${search}%`;
        selectQuery = drizzleSql`
          SELECT id, name, description, metadata, created_by, created_at, updated_at 
          FROM tags 
          WHERE name LIKE ${likePattern} OR description LIKE ${likePattern}
          ORDER BY updated_at DESC
        `;
        countQuery = drizzleSql`
          SELECT COUNT(*) as total 
          FROM tags 
          WHERE name LIKE ${likePattern} OR description LIKE ${likePattern}
        `;
      }
    } else {
      // No search, return all tags
      selectQuery = drizzleSql`SELECT id, name, description, metadata, created_by, created_at, updated_at FROM tags ORDER BY updated_at DESC`;
      countQuery = drizzleSql`SELECT COUNT(*) as total FROM tags`;
    }

    const result = await queryWithPagination(this.db, selectQuery, countQuery, limit, offset);

    return {
      ...result,
      items: result.items.map(row => TagModel.fromRow(row))
    };
  }

  async getTagDetail(id: string): Promise<(Tag & { associations: Tag[]; usage_count: number; recent_logs: any[]; recent_referring_tags: Tag[] }) | null> {
    const tag = await this.getTagById(id);

    if (!tag) {
      return null;
    }

    const associations = await this.getTagAssociations(id);
    const usageStats = await this.getTagUsageStats(id);
    const recentLogs = await this.getRecentLogsForTag(id, 10);
    const recentReferringTags = await this.getRecentReferringTags(id, 10);

    return {
      ...tag,
      associations,
      usage_count: usageStats.usageCount,
      recent_logs: recentLogs,
      recent_referring_tags: recentReferringTags
    };
  }

  /**
   * Get tag usage statistics
   */
  async getTagUsageStats(tagId: string): Promise<TagUsageStats> {
    const usageResult = await queryFirst<{ count: number }>(
      this.db,
      drizzleSql`SELECT COUNT(*) as count FROM log_tag_associations WHERE tag_id = ${tagId}`
    );
    
    const lastUsedResult = await queryFirst<{ last_used: string }>(
      this.db,
      drizzleSql`SELECT l.created_at as last_used 
       FROM log_tag_associations lta 
       JOIN logs l ON l.id = lta.log_id 
       WHERE lta.tag_id = ${tagId}
       ORDER BY l.created_at DESC 
       LIMIT 1`
    );
    
    return {
      tagId,
      usageCount: usageResult?.count || 0,
      lastUsed: lastUsedResult?.last_used || null
    };
  }

  /**
   * Get most popular tags
   */
  async getPopularTags(limit = 20): Promise<Tag[]> {
    const rows = await queryAll(
      this.db,
      drizzleSql`SELECT t.id, t.name, t.description, t.metadata, t.created_by, t.created_at, t.updated_at,
              COUNT(lta.tag_id) as usage_count
       FROM tags t
       LEFT JOIN log_tag_associations lta ON t.id = lta.tag_id
       GROUP BY t.id
       ORDER BY usage_count DESC, t.name ASC
       LIMIT ${limit}`
    );
    
    return rows.map(row => TagModel.fromRow(row));
  }

  /**
   * Get recently used tags for a user
   */
  async getRecentTagsForUser(userId: string, limit = 10): Promise<Tag[]> {
    const rows = await queryAll(
      this.db,
      drizzleSql`SELECT DISTINCT t.id, t.name, t.description, t.metadata, t.created_by, t.created_at, t.updated_at,
              MAX(l.created_at) as last_used
       FROM tags t
       JOIN log_tag_associations lta ON t.id = lta.tag_id
       JOIN logs l ON l.id = lta.log_id
       WHERE l.user_id = ${userId}
       GROUP BY t.id
       ORDER BY last_used DESC
       LIMIT ${limit}`
    );
    
    return rows.map(row => TagModel.fromRow(row));
  }

  /**
   * Get tag suggestions based on input using FTS5
   */
  async getTagSuggestions(query: string, limit = 5): Promise<Tag[]> {
    let rows;
    
    // Trigram tokenizer requires at least 3 characters
    // For shorter queries, use LIKE fallback
    if (query.length >= 3) {
      const searchQuery = `"${query.replace(/"/g, '""')}"`;
      rows = await queryAll(
        this.db,
        drizzleSql`SELECT t.id, t.name, t.description, t.metadata, t.created_by, t.created_at, t.updated_at,
                COUNT(lta.tag_id) as usage_count
         FROM tags t
         JOIN tags_fts fts ON t.id = fts.tag_id
         LEFT JOIN log_tag_associations lta ON t.id = lta.tag_id
         WHERE tags_fts MATCH ${searchQuery}
         GROUP BY t.id
         ORDER BY usage_count DESC, t.name ASC
         LIMIT ${limit}`
      );
    } else {
      // LIKE-based search for short queries (1-2 characters)
      const likePattern = `%${query}%`;
      rows = await queryAll(
        this.db,
        drizzleSql`SELECT t.id, t.name, t.description, t.metadata, t.created_by, t.created_at, t.updated_at,
                COUNT(lta.tag_id) as usage_count
         FROM tags t
         LEFT JOIN log_tag_associations lta ON t.id = lta.tag_id
         WHERE t.name LIKE ${likePattern} OR t.description LIKE ${likePattern}
         GROUP BY t.id
         ORDER BY usage_count DESC, t.name ASC
         LIMIT ${limit}`
      );
    }
    
    return rows.map(row => TagModel.fromRow(row));
  }

  /**
   * Get recent public logs for a tag
   */
  async getRecentLogsForTag(tagId: string, limit = 10): Promise<any[]> {
    const rows = await queryAll(
      this.db,
      drizzleSql`SELECT l.id, l.user_id, l.title, l.content_md, l.is_public, l.created_at, l.updated_at,
              u.twitter_username, u.display_name, u.avatar_url, u.created_at as user_created_at
       FROM logs l
       JOIN users u ON l.user_id = u.id
       JOIN log_tag_associations lta ON l.id = lta.log_id
       WHERE lta.tag_id = ${tagId} AND l.is_public = 1
       ORDER BY l.created_at DESC
       LIMIT ${limit}`
    );
    
    // Enrich with tags for each log
    const enrichedLogs = [];
    for (const row of rows) {
      const tagRows = await queryAll(
        this.db,
        drizzleSql`SELECT t.id, t.name, t.description, t.metadata, t.created_by, t.created_at, t.updated_at,
                lta.association_order
         FROM tags t
         JOIN log_tag_associations lta ON t.id = lta.tag_id
         WHERE lta.log_id = ${row.id}
         ORDER BY lta.association_order ASC, t.name ASC`
      );
      
      const tags = tagRows.map((tagRow: any) => TagModel.fromRow(tagRow));
      
      enrichedLogs.push({
        id: row.id,
        user_id: row.user_id,
        title: row.title ?? null,
        content_md: row.content_md,
        is_public: row.is_public === 1,
        privacy: row.is_public === 1 ? 'public' : 'private',
        created_at: row.created_at,
        updated_at: row.updated_at,
        user: {
          id: row.user_id,
          twitter_username: row.twitter_username ?? '',
          display_name: row.display_name,
          avatar_url: row.avatar_url ?? null,
          role: 'user',
          created_at: row.user_created_at
        },
        associated_tags: tags,
        images: []
      });
    }
    
    return enrichedLogs;
  }

  /**
   * Delete a tag
   */
  async deleteTag(tagId: string): Promise<void> {
    // Remove log associations
    await this.db.delete(logTagAssociations).where(eq(logTagAssociations.tagId, tagId));

    // Remove tag associations in both directions
    await this.db.delete(tagAssociations)
      .where(
        drizzleSql`${tagAssociations.tagId} = ${tagId} OR ${tagAssociations.associatedTagId} = ${tagId}`
      );

    // Finally remove the tag
    await this.db.delete(tags).where(eq(tags.id, tagId));
  }

  /**
   * Create tag-to-tag association (for tag hierarchies)
   */
  async createTagAssociation(tagId: string, associatedTagId: string, associationOrder = 0): Promise<void> {
    if (tagId === associatedTagId) {
      throw new Error('Cannot create self-association');
    }

    const tag = await this.getTagById(tagId);
    if (!tag) {
      throw new Error('Tag not found');
    }

    const associatedTag = await this.getTagById(associatedTagId);
    if (!associatedTag) {
      throw new Error('Associated tag not found');
    }

    await this.db.insert(tagAssociations).values({
      tagId,
      associatedTagId,
      associationOrder,
      createdAt: new Date().toISOString(),
    }).onConflictDoNothing();
  }

  /**
   * Get tag associations for a tag
   * @param tagId - The tag ID to get associations for
   * @param sortBy - Sort mode: 'order' (default, by appearance order) or 'recent' (by creation time)
   */
  async getTagAssociations(tagId: string, sortBy: 'order' | 'recent' = 'order'): Promise<Tag[]> {
    const orderClause = sortBy === 'recent' 
      ? drizzleSql.raw('ORDER BY ta.created_at DESC, t.name ASC')
      : drizzleSql.raw('ORDER BY ta.association_order ASC, t.name ASC');

    const rows = await queryAll(
      this.db,
      drizzleSql`SELECT t.id, t.name, t.description, t.metadata, t.created_by, t.created_at, t.updated_at,
              ta.association_order, ta.created_at as association_created_at
       FROM tags t
       JOIN tag_associations ta ON t.id = ta.associated_tag_id
       WHERE ta.tag_id = ${tagId}
       ${orderClause}`
    );

    return rows.map(row => TagModel.fromRow(row));
  }

  /**
   * Get tags that recently created associations to this tag (reverse references)
   * Sorted by when the association was created (newest first)
   */
  async getRecentReferringTags(tagId: string, limit = 10): Promise<Tag[]> {
    const rows = await queryAll(
      this.db,
      drizzleSql`SELECT t.id, t.name, t.description, t.metadata, t.created_by, t.created_at, t.updated_at,
              ta.created_at as association_created_at
       FROM tags t
       JOIN tag_associations ta ON t.id = ta.tag_id
       WHERE ta.associated_tag_id = ${tagId}
       ORDER BY ta.created_at DESC
       LIMIT ${limit}`
    );

    return rows.map(row => TagModel.fromRow(row));
  }

  /**
   * Remove tag association
   */
  async removeTagAssociation(tagId: string, associatedTagId: string): Promise<void> {
    await this.db.run(
      drizzleSql`DELETE FROM tag_associations WHERE tag_id = ${tagId} AND associated_tag_id = ${associatedTagId}`
    );
  }

  /**
   * Extract hashtag patterns from content (#{tagName} and #tagName formats)
   */
  private extractHashtagsFromContent(content: string): string[] {
    const hashtagsWithPositions: { position: number; name: string }[] = [];
    
    // Pattern 1: #{tagName} - extended format (for tags with whitespace)
    const extendedPattern = /#\{([^}]+)\}/g;
    let match;
    
    while ((match = extendedPattern.exec(content)) !== null) {
      const tagName = match[1].trim();
      if (tagName) {
        hashtagsWithPositions.push({ position: match.index, name: tagName });
      }
    }
    
    // Pattern 2: #tagName - simple format (no whitespace)
    // Match all non-whitespace characters except braces (to avoid matching extended format)
    const simplePattern = /#([^\s{}]+)/g;
    
    while ((match = simplePattern.exec(content)) !== null) {
      const tagName = match[1].trim();
      if (tagName) {
        hashtagsWithPositions.push({ position: match.index, name: tagName });
      }
    }
    
    // Sort by position to maintain order of appearance, then remove duplicates
    hashtagsWithPositions.sort((a, b) => a.position - b.position);
    
    const uniqueMatches: string[] = [];
    for (const item of hashtagsWithPositions) {
      if (!uniqueMatches.includes(item.name)) {
        uniqueMatches.push(item.name);
      }
    }
    
    return uniqueMatches;
  }

  /**
   * Process hashtag patterns in tag description and create associations
   */
  async processTagAssociations(tagId: string, description: string, userId: string): Promise<void> {
    if (!description) return;
    
    const hashtagNames = this.extractHashtagsFromContent(description);
    if (hashtagNames.length === 0) return;

    // Delete existing associations for this tag before recreating them with new order
    await this.db.run(drizzleSql`DELETE FROM tag_associations WHERE tag_id = ${tagId}`);

    for (let i = 0; i < hashtagNames.length; i++) {
      const tagName = hashtagNames[i];
      // Try to find existing tag by name
      const existingTag = await queryFirst<{ id: string }>(
        this.db,
        drizzleSql`SELECT id FROM tags WHERE name = ${tagName}`
      );

      let associatedTagId: string;

      if (existingTag) {
        // Tag exists, use its ID
        associatedTagId = existingTag.id;
      } else {
        // Tag doesn't exist, create it with empty description and metadata
        const now = new Date().toISOString();
        associatedTagId = crypto.randomUUID();
        
        await this.db.run(
          drizzleSql`INSERT INTO tags (id, name, description, metadata, created_by, created_at, updated_at)
          VALUES (${associatedTagId}, ${tagName}, ${''}, ${'{}'}, ${userId}, ${now}, ${now})`
        );
      }

      // Create association if it doesn't already exist and avoid self-association
      // Use index i as the association_order to maintain order of appearance
      if (associatedTagId !== tagId) {
        try {
          await this.createTagAssociation(tagId, associatedTagId, i);
        } catch (error) {
          // Ignore errors from duplicate associations or other minor issues
          console.warn('Failed to create tag association:', { tagId, associatedTagId, error });
        }
      }
    }
  }

  /**
   * Get support content for tag editing based on tag name
   * This doesn't require an existing tag ID, so it can be used when creating new tags
   * Currently supports: wikipedia_summary, ai_enhanced
   */
  async getTagSupportByName(tagName: string, supportType: string): Promise<{ content: string; support_type: string }> {
    if (!tagName || typeof tagName !== 'string' || tagName.trim().length === 0) {
      throw new Error('Tag name is required');
    }

    switch (supportType) {
      case 'wikipedia_summary':
        return await this.getWikipediaSummary(tagName);
      case 'ai_enhanced':
        return await this.getAiEnhancedSummary(tagName);
      default:
        throw new Error(`Unsupported support type: ${supportType}`);
    }
  }

  /**
   * Fetch Wikipedia summary for a tag and convert to markdown with hashtags
   */
  private async getWikipediaSummary(tagName: string): Promise<{ content: string; support_type: string }> {
    try {
      // Wikipedia API endpoint - using Japanese Wikipedia
      const apiUrl = `https://ja.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(tagName)}`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'ShumilogApp/1.0 (https://github.com/7474/shumilog-wigh-spec-kit)',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Wikipedia page not found');
        }
        throw new Error(`Wikipedia API error: ${response.status}`);
      }

      const data = await response.json() as any;
      
      if (!data.extract) {
        throw new Error('No summary available');
      }

      // Convert the summary to include hashtags for key terms
      let content = this.convertToHashtaggedContent(data.extract as string, tagName);
      
      // Add Wikipedia CC attribution link at the end of content
      const wikipediaUrl = data.content_urls?.desktop?.page;
      if (wikipediaUrl) {
        content += `\n\n出典: [Wikipedia](<${wikipediaUrl}>)`;
      }
      
      return {
        content,
        support_type: 'wikipedia_summary'
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch Wikipedia summary: ${error.message}`);
      }
      throw new Error('Failed to fetch Wikipedia summary');
    }
  }

  /**
   * Convert plain text to markdown with hashtags for relevant terms
   */
  private convertToHashtaggedContent(text: string, primaryTagName: string): string {
    // Common terms that should be hashtagged in Japanese context
    const hashtaggableTerms = [
      'アニメ', 'マンガ', '漫画', 'ゲーム', '音楽', '映画', '小説', '書籍',
      'テレビ', 'ドラマ', '舞台', 'コンサート', 'ライブ', 'イベント',
      '声優', 'キャラクター', 'ストーリー', 'シリーズ', '作品', 'エピソード',
      'RPG', 'アクション', 'アドベンチャー', 'シミュレーション', 'パズル',
      'J-POP', 'ロック', 'ジャズ', 'クラシック', 'ポップ',
      'SF', 'ファンタジー', 'ミステリー', 'ホラー', 'コメディ', 'ラブコメ',
      'バトル', '冒険', '恋愛', '日常', '学園', 'スポーツ'
    ];

    let content = text;

    // Add hashtag to mentions of the primary tag name
    const primaryRegex = new RegExp(`(?<!#)\\b${this.escapeRegExp(primaryTagName)}\\b`, 'gi');
    content = content.replace(primaryRegex, `#${primaryTagName}`);

    // Add hashtags to other relevant terms (case-sensitive match)
    for (const term of hashtaggableTerms) {
      // Only hashtag if not already a hashtag
      const regex = new RegExp(`(?<!#)${this.escapeRegExp(term)}(?!\\})`, 'g');
      content = content.replace(regex, (match) => {
        // Check if this term contains spaces
        if (match.includes(' ')) {
          return `#{${match}}`;
        }
        return `#${match}`;
      });
    }

    return content;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * AIを使用してWikipediaの内容を基に編集サポート内容を生成
   * AIサービスがWikipedia取得とメタデータ抽出を内部で処理
   */
  private async getAiEnhancedSummary(tagName: string): Promise<{ content: string; support_type: string }> {
    if (!this.aiService) {
      throw new Error('AI service not available');
    }

    try {
      // AIサービスにタグ名のみを渡して内容を生成
      // Wikipedia取得とメタデータ抽出はAIサービス内部で処理される
      const result = await this.aiService.generateTagContentFromName(tagName);
      
      return {
        content: result.content,
        support_type: 'ai_enhanced'
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to generate AI-enhanced summary: ${error.message}`);
      }
      throw new Error('Failed to generate AI-enhanced summary');
    }
  }

  /**
   * Create a revision record for a tag
   */
  private async createRevision(tagId: string, tag: Tag, createdBy: string, revisionNumber: number): Promise<void> {
    const revisionId = this.generateTagId();
    const now = new Date().toISOString();
    
    await this.db.insert(tagRevisions).values({
      id: revisionId,
      tagId,
      revisionNumber,
      name: tag.name,
      description: tag.description || null,
      metadata: TagModel.serializeMetadata(tag.metadata),
      createdAt: now,
      createdBy,
    });
  }

  /**
   * Get the next revision number for a tag
   */
  private async getNextRevisionNumber(tagId: string): Promise<number> {
    const result = await queryFirst<{ max_revision: number | null }>(
      this.db,
      drizzleSql`SELECT MAX(revision_number) as max_revision FROM tag_revisions WHERE tag_id = ${tagId}`
    );
    
    return (result?.max_revision ?? -1) + 1;
  }

  /**
   * Get all revisions for a tag (internal helper, not exposed via API yet)
   */
  private async getTagRevisions(tagId: string): Promise<any[]> {
    const rows = await queryAll(
      this.db,
      drizzleSql`SELECT id, tag_id, revision_number, name, description, metadata, created_at, created_by
       FROM tag_revisions
       WHERE tag_id = ${tagId}
       ORDER BY revision_number ASC`
    );
    
    return rows.map(row => TagRevisionModel.fromRow(row));
  }

  /**
   * Get a specific revision for a tag (internal helper, not exposed via API yet)
   */
  private async getTagRevision(tagId: string, revisionNumber: number): Promise<any | null> {
    const row = await queryFirst(
      this.db,
      drizzleSql`SELECT id, tag_id, revision_number, name, description, metadata, created_at, created_by
       FROM tag_revisions
       WHERE tag_id = ${tagId} AND revision_number = ${revisionNumber}`
    );
    
    return row ? TagRevisionModel.fromRow(row) : null;
  }
}