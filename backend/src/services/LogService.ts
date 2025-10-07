import { Log, LogDetail, LogModel, CreateLogData, UpdateLogData, LogSearchParams } from '../models/Log.js';
import { Tag, TagModel } from '../models/Tag.js';
import { User } from '../models/User.js';
import { Database } from '../db/database.js';
import { ImageModel, type LogImage } from '../models/Image.js';

export interface LogSearchResult {
  logs: Log[];
  total: number;
  hasMore: boolean;
}

export class LogService {
  constructor(private db: Database) {}

  /**
   * Create a new log entry
   */
  async createLog(data: CreateLogData, userId: string): Promise<Log> {
    const now = new Date().toISOString();
    const logId = `log_${Date.now()}`;
    
    // Create the log
    const stmt = this.db.prepare(`
      INSERT INTO logs (id, user_id, title, content_md, is_public, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    await stmt.run([
      logId,
      userId,
      data.title || null,
      data.content_md,
      data.is_public ? 1 : 0,
      now,
      now
    ]);

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
    
    const updates: string[] = [];
    const params: any[] = [];
    
    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }
    
    if (data.content_md !== undefined) {
      updates.push('content_md = ?');
      params.push(data.content_md);
    }
    
    if (data.is_public !== undefined) {
      updates.push('is_public = ?');
      params.push(data.is_public ? 1 : 0);
    }
    
    if (updates.length > 0) {
      updates.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(logId);
      
      const stmt = this.db.prepare(`
        UPDATE logs 
        SET ${updates.join(', ')}
        WHERE id = ?
      `);
      
      await stmt.run(params);
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
      const deleteStmt = this.db.prepare('DELETE FROM log_tag_associations WHERE log_id = ?');
      await deleteStmt.run([logId]);
      
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
    const logRow = await this.db.queryFirst(`
      SELECT l.*, u.twitter_username, u.display_name, u.avatar_url, u.role, u.created_at as user_created_at
      FROM logs l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = ?
    `, [id]);
    
    if (!logRow) {
      return null;
    }
    
    // 並列実行: タグとイメージを同時に取得
    const [tagRows, imageRows] = await Promise.all([
      // Get associated tags
      this.db.query(`
        SELECT lta.log_id, t.id, t.name, t.description, t.metadata, t.created_by, t.created_at, t.updated_at,
               lta.association_order
        FROM tags t
        JOIN log_tag_associations lta ON t.id = lta.tag_id
        WHERE lta.log_id = ?
        ORDER BY lta.association_order ASC, t.name ASC
      `, [id]),
      // Get images for the log
      this.db.query(`
        SELECT i.*, lia.display_order
        FROM images i
        JOIN log_image_associations lia ON i.id = lia.image_id
        WHERE lia.log_id = ?
        ORDER BY lia.display_order ASC, i.created_at ASC
      `, [id])
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
   * Search logs with full-text search
   */
  async searchLogs(options: LogSearchParams): Promise<LogSearchResult> {
    const { tag_ids, user_id, is_public, search, limit = 20, offset = 0 } = options;
    
    let sql = `
      SELECT DISTINCT l.*, u.twitter_username, u.display_name, u.avatar_url, u.role, u.created_at as user_created_at
      FROM logs l
      JOIN users u ON l.user_id = u.id
    `;
    
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (tag_ids && tag_ids.length > 0) {
      const placeholders = tag_ids.map(() => '?').join(',');
      sql += ` JOIN log_tag_associations lta ON l.id = lta.log_id`;
      conditions.push(`lta.tag_id IN (${placeholders})`);
      params.push(...tag_ids);
    }
    
    if (user_id) {
      conditions.push('l.user_id = ?');
      params.push(user_id);
    }
    
    if (is_public !== undefined) {
      conditions.push('l.is_public = ?');
      params.push(is_public ? 1 : 0);
    }

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push('(l.title LIKE ? OR l.content_md LIKE ?)');
      params.push(searchPattern, searchPattern);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    sql += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    // Build count query
    let countSql = `SELECT COUNT(DISTINCT l.id) as total FROM logs l`;
    const countParams: any[] = [];
    
    if (tag_ids && tag_ids.length > 0) {
      const _placeholders = tag_ids.map(() => '?').join(',');
      countSql += ` JOIN log_tag_associations lta ON l.id = lta.log_id`;
      countParams.push(...tag_ids);
    }
    
    const countConditions: string[] = [];
    if (tag_ids && tag_ids.length > 0) {
      const placeholders = tag_ids.map(() => '?').join(',');
      countConditions.push(`lta.tag_id IN (${placeholders})`);
    }

    if (user_id) {
      countConditions.push('l.user_id = ?');
      countParams.push(user_id);
    }

    if (is_public !== undefined) {
      countConditions.push('l.is_public = ?');
      countParams.push(is_public ? 1 : 0);
    }

    if (search) {
      const searchPattern = `%${search}%`;
      countConditions.push('(l.title LIKE ? OR l.content_md LIKE ?)');
      countParams.push(searchPattern, searchPattern);
    }
    
    if (countConditions.length > 0) {
      countSql += ` WHERE ${countConditions.join(' AND ')}`;
    }
    
    // 並列実行: ログ取得とカウントクエリを同時に実行
    const [logRows, totalResult] = await Promise.all([
      this.db.query(sql, params),
      this.db.queryFirst<{ total: number }>(countSql, countParams)
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
      this.db.query(sql, [limit, offset]),
      this.db.queryFirst<{ total: number }>(
        'SELECT COUNT(*) as total FROM logs WHERE is_public = 1'
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
    const logRows = await this.db.query(sql, params);
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
    const existingTags = await this.db.query<{ id: string; name: string }>(
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
      
      // Use batch insert for better performance
      const insertStatements = tagsToCreate.map(tagName => {
        const tagId = `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        existingTagMap.set(tagName, tagId);
        return {
          sql: `INSERT INTO tags (id, name, description, metadata, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          params: [tagId, tagName, '', '{}', userId, now, now]
        };
      });
      
      await this.db.batch(insertStatements);
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
    
    const now = new Date().toISOString();
    
    // Batch insert: Use batch API for better performance
    const insertStatements = tagIds.map((tagId, index) => ({
      sql: 'INSERT OR IGNORE INTO log_tag_associations (log_id, tag_id, association_order, created_at) VALUES (?, ?, ?, ?)',
      params: [logId, tagId, index, now]
    }));
    
    await this.db.batch(insertStatements);
  }

  /**
   * Remove tag associations from a log
   */
  async removeTagsFromLog(logId: string, tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) return;
    
    const placeholders = tagIds.map(() => '?').join(',');
    const stmt = this.db.prepare(
      `DELETE FROM log_tag_associations WHERE log_id = ? AND tag_id IN (${placeholders})`
    );
    
    await stmt.run([logId, ...tagIds]);
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
    
    // Delete tag associations first
    const deleteAssociationsStmt = this.db.prepare(
      'DELETE FROM log_tag_associations WHERE log_id = ?'
    );
    await deleteAssociationsStmt.run([logId]);
    
    // Delete the log
    const deleteLogStmt = this.db.prepare('DELETE FROM logs WHERE id = ?');
    await deleteLogStmt.run([logId]);
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
    
    const logRows = await this.db.query(sql, [limit]);
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
    const simplePattern = /#([a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF_-]+)/g;
    
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
      this.db.queryFirst<{ count: number }>(
        'SELECT COUNT(*) as count FROM logs WHERE user_id = ?',
        [userId]
      ),
      this.db.queryFirst<{ count: number }>(
        'SELECT COUNT(*) as count FROM logs WHERE user_id = ? AND is_public = 1',
        [userId]
      ),
      this.db.queryFirst<{ count: number }>(
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
    const result = await this.db.queryFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM logs WHERE id = ? AND user_id = ?',
      [logId, userId]
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
      this.db.query(`
        SELECT lta.log_id, t.id, t.name, t.description, t.metadata, t.created_by, t.created_at, t.updated_at
        FROM log_tag_associations lta
        JOIN tags t ON lta.tag_id = t.id
        WHERE lta.log_id IN (${placeholders})
        ORDER BY t.name
      `, logIds),
      // Get all images for these logs in one query
      this.db.query(`
        SELECT i.*, lia.log_id, lia.display_order
        FROM images i
        JOIN log_image_associations lia ON i.id = lia.image_id
        WHERE lia.log_id IN (${placeholders})
        ORDER BY lia.log_id, lia.display_order ASC, i.created_at ASC
      `, logIds)
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