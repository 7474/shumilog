import { Log, LogDetail, LogModel, CreateLogData, UpdateLogData, LogSearchParams } from '../models/Log.js';
import { Tag, TagModel } from '../models/Tag.js';
import { User } from '../models/User.js';
import type { DrizzleDB } from '../db/drizzle.js';
import { queryAll, queryFirst, queryRawAll, queryRawFirst } from '../db/query-helpers.js';
import { ImageModel, type LogImage } from '../models/Image.js';
import { logs, logTagAssociations } from '../db/schema.js';
import { eq, and, sql as drizzleSql } from 'drizzle-orm';

export interface LogSearchResult {
  logs: Log[];
  total: number;
  hasMore: boolean;
}

export class LogService {
  constructor(private db: DrizzleDB) {}

  /**
   * Create a new log entry
   */
  async createLog(data: CreateLogData, userId: string): Promise<Log> {
    const now = new Date().toISOString();
    const logId = crypto.randomUUID();
    
    // Create the log
    await this.db.insert(logs).values({
      id: logId,
      userId,
      title: data.title || null,
      contentMd: data.content_md,
      isPublic: data.is_public || false,
      createdAt: now,
      updatedAt: now,
    });

    // Extract hashtags from content and merge with explicit tag names
    const contentHashtags = this.extractHashtagsFromContent(data.content_md);
    const allTagNames = new Set<string>();
    
    // Add explicitly provided tag names
    if (data.tag_names && data.tag_names.length > 0) {
      data.tag_names.forEach(name => allTagNames.add(name));
    }
    
    // Add hashtags extracted from content
    contentHashtags.forEach(name => allTagNames.add(name));
    
    // Associate all tags with log
    if (allTagNames.size > 0) {
      await this.associateTagsByNamesWithLog(logId, Array.from(allTagNames), userId);
    } else if (data.tag_ids && data.tag_ids.length > 0) {
      // Use existing tag IDs if no tag names were provided
      await this.associateTagsWithLog(logId, data.tag_ids);
    }

    // Return the created log with user and tags
    const createdLog = await this.getLogById(logId, userId);
    if (!createdLog) {
      throw new Error('Failed to create log');
    }
    
    return createdLog;
  }

  /**
   * Update a log entry
   */
  async updateLog(logId: string, data: UpdateLogData, userId: string): Promise<Log> {
    // Verify ownership
    const isOwner = await this.validateLogOwnership(logId, userId);
    if (!isOwner) {
      throw new Error('Unauthorized: User does not own this log');
    }
    
    const updates: Partial<typeof logs.$inferInsert> = {};
    
    if (data.title !== undefined) {
      updates.title = data.title;
    }
    
    if (data.content_md !== undefined) {
      updates.contentMd = data.content_md;
    }
    
    if (data.is_public !== undefined) {
      updates.isPublic = data.is_public;
    }
    
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date().toISOString();
      
      await this.db
        .update(logs)
        .set(updates)
        .where(eq(logs.id, logId));
    }
    
    // Update tag associations if provided or if content was updated
    let shouldUpdateTags = data.tag_names !== undefined || data.tag_ids !== undefined;
    let extractedHashtags: string[] = [];
    
    // Extract hashtags from updated content
    if (data.content_md !== undefined) {
      extractedHashtags = this.extractHashtagsFromContent(data.content_md);
      shouldUpdateTags = true;
    }
    
    if (shouldUpdateTags) {
      // Remove all existing associations
      await this.db.delete(logTagAssociations).where(eq(logTagAssociations.logId, logId));
      
      if (data.tag_names !== undefined) {
        // Merge explicit tag names with extracted hashtags
        const allTagNames = new Set<string>();
        data.tag_names.forEach(name => allTagNames.add(name));
        extractedHashtags.forEach(name => allTagNames.add(name));
        
        if (allTagNames.size > 0) {
          await this.associateTagsByNamesWithLog(logId, Array.from(allTagNames), userId);
        }
      } else if (data.tag_ids !== undefined) {
        // Use existing tag IDs plus extracted hashtags
        if (data.tag_ids.length > 0) {
          await this.associateTagsWithLog(logId, data.tag_ids);
        }
        if (extractedHashtags.length > 0) {
          await this.associateTagsByNamesWithLog(logId, extractedHashtags, userId);
        }
      } else if (extractedHashtags.length > 0) {
        // Only extracted hashtags (no explicit tags provided)
        await this.associateTagsByNamesWithLog(logId, extractedHashtags, userId);
      }
    }
    
    // Return updated log
    const updatedLog = await this.getLogById(logId, userId);
    if (!updatedLog) {
      throw new Error('Log not found after update');
    }
    
    return updatedLog;
  }

  /**
   * Get log by ID
   */
  async getLogById(id: string, _userId?: string): Promise<LogDetail | null> {
    // Get log with user info
    const logRow = await queryFirst(
      this.db,
      drizzleSql`SELECT l.*, u.twitter_username, u.display_name, u.avatar_url, u.role, u.created_at as user_created_at
      FROM logs l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = ${id}`
    );
    
    if (!logRow) {
      return null;
    }
    
    // 並列実行: タグとイメージを同時に取得
    const [tagRows, imageRows] = await Promise.all([
      // Get associated tags
      queryAll(
        this.db,
        drizzleSql`SELECT lta.log_id, t.id, t.name, t.description, t.metadata, t.created_by, t.created_at, t.updated_at,
               lta.association_order
        FROM tags t
        JOIN log_tag_associations lta ON t.id = lta.tag_id
        WHERE lta.log_id = ${id}
        ORDER BY lta.association_order ASC, t.name ASC`
      ),
      // Get images for the log
      queryAll(
        this.db,
        drizzleSql`SELECT i.*, lia.display_order
        FROM images i
        JOIN log_image_associations lia ON i.id = lia.image_id
        WHERE lia.log_id = ${id}
        ORDER BY lia.display_order ASC, i.created_at ASC`
      )
    ]);
    
    const user: User = {
      id: logRow.user_id,
      twitter_username: logRow.twitter_username,
      display_name: logRow.display_name,
      avatar_url: logRow.avatar_url,
      role: logRow.role || 'user',
      created_at: logRow.user_created_at
    };
    
    const tags: Tag[] = tagRows.map(row => TagModel.fromRow(row));
    const images: LogImage[] = imageRows.map(row => ImageModel.fromRowWithDisplayOrder(row));
    
    return LogModel.fromRowWithVisibility(logRow, user, tags, images);
  }

  /**
   * Search logs with full-text search using FTS5
   */
  async searchLogs(options: LogSearchParams): Promise<LogSearchResult> {
    const { tag_ids, user_id, is_public, search, limit = 20, offset = 0 } = options;
    
    let sql: string;
    let countSql: string;
    const params: any[] = [];
    const countParams: any[] = [];
    
    // Use FTS5 if search query is provided, otherwise use regular query
    if (search) {
      // Trigram tokenizer requires at least 3 characters
      // For shorter queries, use LIKE fallback
      const useFTS = search.length >= 3;
      
      const conditions: string[] = [];
      const countConditions: string[] = [];
      
      if (useFTS) {
        // FTS5-based search query
        sql = `
          SELECT DISTINCT l.*, u.twitter_username, u.display_name, u.avatar_url, u.role, u.created_at as user_created_at
          FROM logs l
          JOIN users u ON l.user_id = u.id
          JOIN logs_fts fts ON l.id = fts.log_id
        `;
        
        countSql = `SELECT COUNT(DISTINCT l.id) as total FROM logs l JOIN logs_fts fts ON l.id = fts.log_id`;
        
        // FTS5 MATCH condition - wrap in quotes to treat as phrase and escape internal quotes
        const searchQuery = `"${search.replace(/"/g, '""')}"`;
        conditions.push('logs_fts MATCH ?');
        params.push(searchQuery);
        countConditions.push('logs_fts MATCH ?');
        countParams.push(searchQuery);
      } else {
        // LIKE-based search for short queries (1-2 characters)
        sql = `
          SELECT DISTINCT l.*, u.twitter_username, u.display_name, u.avatar_url, u.role, u.created_at as user_created_at
          FROM logs l
          JOIN users u ON l.user_id = u.id
        `;
        
        countSql = `SELECT COUNT(DISTINCT l.id) as total FROM logs l`;
        
        // LIKE condition for title or content
        const likePattern = `%${search}%`;
        conditions.push('(l.title LIKE ? OR l.content_md LIKE ?)');
        params.push(likePattern, likePattern);
        countConditions.push('(l.title LIKE ? OR l.content_md LIKE ?)');
        countParams.push(likePattern, likePattern);
      }
      
      // Add tag filter if provided
      if (tag_ids && tag_ids.length > 0) {
        const placeholders = tag_ids.map(() => '?').join(',');
        sql += ` JOIN log_tag_associations lta ON l.id = lta.log_id`;
        conditions.push(`lta.tag_id IN (${placeholders})`);
        params.push(...tag_ids);
        
        countSql += ` JOIN log_tag_associations lta ON l.id = lta.log_id`;
        countConditions.push(`lta.tag_id IN (${placeholders})`);
        countParams.push(...tag_ids);
      }
      
      if (user_id) {
        conditions.push('l.user_id = ?');
        params.push(user_id);
        countConditions.push('l.user_id = ?');
        countParams.push(user_id);
      }
      
      if (is_public !== undefined) {
        conditions.push('l.is_public = ?');
        params.push(is_public ? 1 : 0);
        countConditions.push('l.is_public = ?');
        countParams.push(is_public ? 1 : 0);
      }
      
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      if (countConditions.length > 0) {
        countSql += ` WHERE ${countConditions.join(' AND ')}`;
      }
      
      sql += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
    } else {
      // Regular query without search
      sql = `
        SELECT DISTINCT l.*, u.twitter_username, u.display_name, u.avatar_url, u.role, u.created_at as user_created_at
        FROM logs l
        JOIN users u ON l.user_id = u.id
      `;
      
      countSql = `SELECT COUNT(DISTINCT l.id) as total FROM logs l`;
      
      const conditions: string[] = [];
      const countConditions: string[] = [];
      
      if (tag_ids && tag_ids.length > 0) {
        const placeholders = tag_ids.map(() => '?').join(',');
        sql += ` JOIN log_tag_associations lta ON l.id = lta.log_id`;
        conditions.push(`lta.tag_id IN (${placeholders})`);
        params.push(...tag_ids);
        
        countSql += ` JOIN log_tag_associations lta ON l.id = lta.log_id`;
        countConditions.push(`lta.tag_id IN (${placeholders})`);
        countParams.push(...tag_ids);
      }
      
      if (user_id) {
        conditions.push('l.user_id = ?');
        params.push(user_id);
        countConditions.push('l.user_id = ?');
        countParams.push(user_id);
      }
      
      if (is_public !== undefined) {
        conditions.push('l.is_public = ?');
        params.push(is_public ? 1 : 0);
        countConditions.push('l.is_public = ?');
        countParams.push(is_public ? 1 : 0);
      }
      
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      if (countConditions.length > 0) {
        countSql += ` WHERE ${countConditions.join(' AND ')}`;
      }
      
      sql += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }
    
    // 並列実行: ログ取得とカウントクエリを同時に実行
    const [logRows, totalResult] = await Promise.all([
      queryRawAll(this.db, sql, params),
      queryRawFirst<{ total: number }>(this.db, countSql, countParams)
    ]);
    
    const logs = await this.enrichLogsWithTags(logRows);
    const total = totalResult?.total || 0;
    
    return {
      logs,
      total,
      hasMore: offset + logs.length < total
    };
  }

  /**
   * Get logs for a user
   */
  async getUserLogs(userId: string, limit = 20, offset = 0): Promise<LogSearchResult> {
    return this.searchLogs({ user_id: userId, limit, offset });
  }

  /**
   * Get public logs (for discovery)
   */
  async getPublicLogs(limit = 20, offset = 0): Promise<LogSearchResult> {
    const sql = `
      SELECT l.*, u.twitter_username, u.display_name, u.avatar_url, u.role, u.created_at as user_created_at
      FROM logs l
      JOIN users u ON l.user_id = u.id
      WHERE l.is_public = 1
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    // 並列実行: ログ取得とカウントクエリを同時に実行
    const [logRows, totalResult] = await Promise.all([
      queryRawAll(this.db, sql, [limit, offset]),
      queryRawFirst<{ total: number }>(
        this.db,
        'SELECT COUNT(*) as total FROM logs WHERE is_public = 1',
        []
      )
    ]);
    
    const logs = await this.enrichLogsWithTags(logRows);
    const total = totalResult?.total || 0;
    
    return {
      logs,
      total,
      hasMore: offset + logs.length < total
    };
  }

  /**
   * Get logs by tag
   */
  async getLogsByTag(tagId: string, limit = 20, offset = 0): Promise<LogSearchResult> {
    return this.searchLogs({ tag_ids: [tagId], limit, offset });
  }

  /**
   * Get related logs based on shared tags
   */
  async getRelatedLogs(logId: string, limit = 10): Promise<Log[]> {
    // First, get the tags of the target log
    const targetLog = await this.getLogById(logId);
    if (!targetLog || targetLog.associated_tags.length === 0) {
      return [];
    }

    const tagIds = targetLog.associated_tags.map(tag => tag.id);
    const placeholders = tagIds.map(() => '?').join(',');

    // Find public logs that share tags with the target log
    // Order by the number of shared tags (descending)
    const sql = `
      SELECT l.*, u.twitter_username, u.display_name, u.avatar_url, u.role, u.created_at as user_created_at,
             COUNT(DISTINCT lta.tag_id) as shared_tag_count
      FROM logs l
      JOIN users u ON l.user_id = u.id
      JOIN log_tag_associations lta ON l.id = lta.log_id
      WHERE lta.tag_id IN (${placeholders})
        AND l.id != ?
        AND l.is_public = 1
      GROUP BY l.id, l.user_id, l.title, l.content_md, l.is_public, l.created_at, l.updated_at,
               u.twitter_username, u.display_name, u.avatar_url, u.role, u.created_at
      ORDER BY shared_tag_count DESC, l.created_at DESC
      LIMIT ?
    `;

    const params = [...tagIds, logId, limit];
    const logRows = await queryRawAll(this.db, sql, params);
    const logs = await this.enrichLogsWithTags(logRows);

    return logs;
  }

  /**
   * Associate tags with log using tag names, creating tags if they don't exist
   */
  async associateTagsByNamesWithLog(logId: string, tagNames: string[], userId: string): Promise<void> {
    if (tagNames.length === 0) return;
    
    // Batch query: Get all existing tags in one query
    const placeholders = tagNames.map(() => '?').join(',');
    const existingTags = await queryRawAll<{ id: string; name: string }>(
      this.db,
      `SELECT id, name FROM tags WHERE name IN (${placeholders})`,
      tagNames
    );
    
    // Create a map of existing tag names to IDs
    const existingTagMap = new Map<string, string>();
    for (const tag of existingTags) {
      existingTagMap.set(tag.name, tag.id);
    }
    
    // Find tags that need to be created
    const tagsToCreate = tagNames.filter(name => !existingTagMap.has(name));
    
    // Batch create: Create all missing tags in one transaction
    if (tagsToCreate.length > 0) {
      const now = new Date().toISOString();
      
      // Create all missing tags using Drizzle bulk insert
      const tagsToInsert = tagsToCreate.map(tagName => {
        const tagId = crypto.randomUUID();
        existingTagMap.set(tagName, tagId);
        return {
          id: tagId,
          name: tagName,
          description: '',
          metadata: '{}',
          createdBy: userId,
          createdAt: now,
          updatedAt: now
        };
      });
      
      // Use Drizzle's bulk insert
      const { tags } = await import('../db/schema.js');
      await this.db.insert(tags).values(tagsToInsert);
    }
    
    // Collect all tag IDs in the order of tagNames
    const tagIds = tagNames.map(name => existingTagMap.get(name)!);
    
    // Now associate all tag IDs with the log
    await this.associateTagsWithLog(logId, tagIds);
  }

  /**
   * Associate tags with a log
   */
  async associateTagsWithLog(logId: string, tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) return;
    
    // Batch insert using Drizzle
    const values = tagIds.map((tagId, index) => ({
      logId,
      tagId,
      associationOrder: index,
      createdAt: new Date().toISOString(),
    }));
    
    await this.db.insert(logTagAssociations).values(values).onConflictDoNothing();
  }

  /**
   * Remove tag associations from a log
   */
  async removeTagsFromLog(logId: string, tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) return;
    
    await this.db.delete(logTagAssociations)
      .where(
        and(
          eq(logTagAssociations.logId, logId),
          drizzleSql`${logTagAssociations.tagId} IN ${tagIds}`
        )
      );
  }

  /**
   * Delete a log entry
   */
  async deleteLog(logId: string, userId: string): Promise<void> {
    // Verify ownership
    const isOwner = await this.validateLogOwnership(logId, userId);
    if (!isOwner) {
      throw new Error('Unauthorized: User does not own this log');
    }
    
    // Delete tag associations first (cascade should handle this, but being explicit)
    await this.db.delete(logTagAssociations).where(eq(logTagAssociations.logId, logId));
    
    // Delete the log
    await this.db.delete(logs).where(eq(logs.id, logId));
  }

  /**
   * Check if log can be shared (share preconditions)
   */
  async canShareLog(logId: string, userId: string): Promise<{ canShare: boolean; reason?: string }> {
    const log = await this.getLogById(logId, userId);
    
    if (!log) {
      return { canShare: false, reason: 'Log not found' };
    }

    if (log.user_id !== userId) {
      return { canShare: false, reason: 'Not authorized - user does not own this log' };
    }

    if (!log.is_public) {
      return { canShare: false, reason: 'Cannot share private log' };
    }

    return { canShare: true };
  }

  /**
   * Share a log (placeholder for Twitter sharing)
   */
  async shareLog(logId: string, userId: string): Promise<{ success: boolean; message: string; shareUrl?: string }> {
    const shareCheck = await this.canShareLog(logId, userId);
    
    if (!shareCheck.canShare) {
      return { success: false, message: shareCheck.reason || 'Cannot share log' };
    }

    // For now, just return a mock share URL - TwitterService will handle actual sharing
    const shareUrl = this.generateShareUrl();
    
    return {
      success: true,
      message: 'Log shared successfully',
      shareUrl: `https://example.com/logs/${shareUrl}`
    };
  }

  /**
   * Generate share URL for a log
   */
  generateShareUrl(): string {
    return `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get recent logs for discovery
   */
  async getRecentLogs(limit = 10): Promise<Log[]> {
    const sql = `
      SELECT l.*, u.twitter_username, u.display_name, u.avatar_url, u.role, u.created_at as user_created_at
      FROM logs l
      JOIN users u ON l.user_id = u.id
      WHERE l.is_public = 1
      ORDER BY l.created_at DESC
      LIMIT ?
    `;
    
    const logRows = await queryRawAll(this.db, sql, [limit]);
    return this.enrichLogsWithTags(logRows);
  }

  /**
   * Parse content for potential tag suggestions
   */
  async extractTagSuggestions(content: string): Promise<string[]> {
    // Simple implementation - look for hashtags and common anime/manga terms
    const hashtags = content.match(/#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g) || [];
    
    // Remove # from hashtags
    return hashtags.map(tag => tag.substring(1));
  }

  /**
   * Extract hashtag patterns from content (#{tagName} and #tagName formats)
   * This uses the same logic as TagService for consistency
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
    // Match hashtags but don't include trailing periods or hyphens
    const simplePattern = /#([a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF_.-]*[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF_])/g;
    
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
   * Get user's log statistics
   */
  async getUserLogStats(userId: string): Promise<{
    totalLogs: number;
    publicLogs: number;
    recentLogsCount: number;
  }> {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);
    
    // 並列実行: 3つのカウントクエリを同時に実行
    const [totalResult, publicResult, recentResult] = await Promise.all([
      queryRawFirst<{ count: number }>(
        this.db,
        'SELECT COUNT(*) as count FROM logs WHERE user_id = ?',
        [userId]
      ),
      queryRawFirst<{ count: number }>(
        this.db,
        'SELECT COUNT(*) as count FROM logs WHERE user_id = ? AND is_public = 1',
        [userId]
      ),
      queryRawFirst<{ count: number }>(
        this.db,
        'SELECT COUNT(*) as count FROM logs WHERE user_id = ? AND created_at >= ?',
        [userId, recentDate.toISOString()]
      )
    ]);
    
    return {
      totalLogs: totalResult?.count || 0,
      publicLogs: publicResult?.count || 0,
      recentLogsCount: recentResult?.count || 0
    };
  }

  /**
   * Validate user owns the log
   */
  async validateLogOwnership(logId: string, userId: string): Promise<boolean> {
    const result = await this.db.get<{ count: number }>(
      drizzleSql`SELECT COUNT(*) as count FROM logs WHERE id = ${logId} AND user_id = ${userId}`
    );
    
    const owns = (result?.count || 0) > 0;
    if (!owns) {
      console.warn('validateLogOwnership check failed', { logId, userId, result });
    }
    return owns;
  }

  /**
   * Helper method to enrich log rows with tag information
   */
  private async enrichLogsWithTags(logRows: any[]): Promise<Log[]> {
    if (logRows.length === 0) return [];
    
    const logIds = logRows.map(row => row.id);
    const placeholders = logIds.map(() => '?').join(',');
    
    // 並列実行: タグとイメージを同時に取得
    const [tagAssociations, imageRows] = await Promise.all([
      // Get all tags for these logs in one query
      queryRawAll(
        this.db,
        `SELECT lta.log_id, t.id, t.name, t.description, t.metadata, t.created_by, t.created_at, t.updated_at
        FROM log_tag_associations lta
        JOIN tags t ON lta.tag_id = t.id
        WHERE lta.log_id IN (${placeholders})
        ORDER BY lta.log_id, lta.association_order ASC`,
        logIds
      ),
      // Get all images for these logs in one query
      queryRawAll(
        this.db,
        `SELECT i.*, lia.log_id, lia.display_order
        FROM images i
        JOIN log_image_associations lia ON i.id = lia.image_id
        WHERE lia.log_id IN (${placeholders})
        ORDER BY lia.log_id, lia.display_order ASC, i.created_at ASC`,
        logIds
      )
    ]);
    
    // Group tags by log_id
    const tagsByLogId = new Map<string, Tag[]>();
    for (const tagRow of tagAssociations) {
      const logId = tagRow.log_id;
      if (!tagsByLogId.has(logId)) {
        tagsByLogId.set(logId, []);
      }
      tagsByLogId.get(logId)!.push(TagModel.fromRow({
        ...tagRow,
        metadata: typeof tagRow.metadata === 'string' ? tagRow.metadata : JSON.stringify(tagRow.metadata || {})
      }));
    }
    
    // Group images by log_id
    const imagesByLogId = new Map<string, LogImage[]>();
    for (const imageRow of imageRows) {
      const logId = imageRow.log_id;
      if (!imagesByLogId.has(logId)) {
        imagesByLogId.set(logId, []);
      }
      imagesByLogId.get(logId)!.push(ImageModel.fromRowWithDisplayOrder(imageRow));
    }
    
    // Build log objects
    return logRows.map(row => {
      const user: User = {
        id: row.user_id,
        twitter_username: row.twitter_username,
        display_name: row.display_name,
        avatar_url: row.avatar_url,
        role: row.role || 'user',
        created_at: row.user_created_at
      };

      const tags = tagsByLogId.get(row.id) || [];
      const images = imagesByLogId.get(row.id) || [];

      return LogModel.fromRow(
        {
          ...row,
          is_public: typeof row.is_public === 'number' ? row.is_public : row.is_public ? 1 : 0
        },
        user,
        tags,
        images
      );
    });
  }
}