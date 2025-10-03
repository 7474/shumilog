import { Tag, TagModel, CreateTagData, UpdateTagData, TagSearchParams } from '../models/Tag.js';
import { Database, PaginatedResult } from '../db/database.js';

export interface TagUsageStats {
  tagId: string;
  usageCount: number;
  lastUsed: string | null;
}

export class TagService {
  constructor(private db: Database) {}

  private generateTagId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `tag_${crypto.randomUUID()}`;
    }

    return `tag_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  private async getTagRow(tagId: string): Promise<any | null> {
    return await this.db.queryFirst(
      'SELECT id, name, description, metadata, created_by, created_at, updated_at FROM tags WHERE id = ?',
      [tagId]
    );
  }

  async isTagOwnedBy(tagId: string, userId: string): Promise<boolean> {
    const result = await this.db.queryFirst<{ created_by: string }>(
      'SELECT created_by FROM tags WHERE id = ?',
      [tagId]
    );

    if (!result) {
      return false;
    }

    return result.created_by === userId;
  }

  /**
   * Create a new tag
   */
  async createTag(data: CreateTagData, createdBy: string): Promise<Tag> {
    const now = new Date().toISOString();
    const tagId = this.generateTagId();
    
    const stmt = this.db.prepare(`
      INSERT INTO tags (id, name, description, metadata, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    await stmt.run([
      tagId,
      data.name,
      data.description || null,
      TagModel.serializeMetadata(data.metadata || {}),
      createdBy,
      now,
      now
    ]);

    const tag = {
      id: tagId,
      name: data.name,
      description: data.description,
      metadata: data.metadata || {},
      created_by: createdBy,
      created_at: now,
      updated_at: now
    };

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

    const updates: string[] = [];
    const params: any[] = [];
    
    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    
    if (data.metadata !== undefined) {
      updates.push('metadata = ?');
      params.push(TagModel.serializeMetadata(data.metadata));
    }
    
    if (updates.length === 0) {
      throw new Error('No fields to update');
    }
    
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(tagId);
    
    const stmt = this.db.prepare(`
      UPDATE tags 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);
    
    await stmt.run(params);
    
    // Return updated tag
    const updatedTag = await this.getTagById(tagId);
    if (!updatedTag) {
      throw new Error('Tag not found after update');
    }
    
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
   * Search tags
   */
  async searchTags(options: TagSearchParams = {}): Promise<PaginatedResult<Tag>> {
    const { search, limit = 20, offset = 0 } = options;

    const baseSelect = 'SELECT id, name, description, metadata, created_by, created_at, updated_at FROM tags';
    const baseCount = 'SELECT COUNT(*) as total FROM tags';
    const clauses: string[] = [];
    const params: any[] = [];

    if (search) {
      clauses.push('(LOWER(name) LIKE ? OR LOWER(description) LIKE ?)');
      const pattern = `%${search.toLowerCase()}%`;
      params.push(pattern, pattern);
    }

    const whereClause = clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '';
    const selectSql = `${baseSelect}${whereClause} ORDER BY name ASC`;
    const countSql = `${baseCount}${whereClause}`;

    const result = await this.db.queryWithPagination(selectSql, countSql, params, limit, offset);

    return {
      ...result,
      items: result.items.map(row => TagModel.fromRow(row))
    };
  }

  async getTagDetail(id: string): Promise<(Tag & { associations: Tag[]; reverse_associations: Tag[]; usage_count: number }) | null> {
    const tag = await this.getTagById(id);

    if (!tag) {
      return null;
    }

    const associations = await this.getTagAssociations(id);
    const reverseAssociations = await this.getReverseTagAssociations(id);
    const usageStats = await this.getTagUsageStats(id);

    return {
      ...tag,
      associations,
      reverse_associations: reverseAssociations,
      usage_count: usageStats.usageCount
    };
  }

  /**
   * Get tag usage statistics
   */
  async getTagUsageStats(tagId: string): Promise<TagUsageStats> {
    const usageResult = await this.db.queryFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM log_tag_associations WHERE tag_id = ?',
      [tagId]
    );
    
    const lastUsedResult = await this.db.queryFirst<{ last_used: string }>(
      `SELECT l.created_at as last_used 
       FROM log_tag_associations lta 
       JOIN logs l ON l.id = lta.log_id 
       WHERE lta.tag_id = ? 
       ORDER BY l.created_at DESC 
       LIMIT 1`,
      [tagId]
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
    const rows = await this.db.query(
      `SELECT t.id, t.name, t.description, t.metadata, t.created_by, t.created_at, t.updated_at,
              COUNT(lta.tag_id) as usage_count
       FROM tags t
       LEFT JOIN log_tag_associations lta ON t.id = lta.tag_id
       GROUP BY t.id
       ORDER BY usage_count DESC, t.name ASC
       LIMIT ?`,
      [limit]
    );
    
    return rows.map(row => TagModel.fromRow(row));
  }

  /**
   * Get recently used tags for a user
   */
  async getRecentTagsForUser(userId: string, limit = 10): Promise<Tag[]> {
    const rows = await this.db.query(
      `SELECT DISTINCT t.id, t.name, t.description, t.metadata, t.created_by, t.created_at, t.updated_at,
              MAX(l.created_at) as last_used
       FROM tags t
       JOIN log_tag_associations lta ON t.id = lta.tag_id
       JOIN logs l ON l.id = lta.log_id
       WHERE l.user_id = ?
       GROUP BY t.id
       ORDER BY last_used DESC
       LIMIT ?`,
      [userId, limit]
    );
    
    return rows.map(row => TagModel.fromRow(row));
  }

  /**
   * Get tag suggestions based on input
   */
  async getTagSuggestions(query: string, limit = 5): Promise<Tag[]> {
    const searchPattern = `%${query}%`;
    const rows = await this.db.query(
      `SELECT t.id, t.name, t.description, t.metadata, t.created_by, t.created_at, t.updated_at,
              COUNT(lta.tag_id) as usage_count
       FROM tags t
       LEFT JOIN log_tag_associations lta ON t.id = lta.tag_id
       WHERE t.name LIKE ? OR t.description LIKE ?
       GROUP BY t.id
       ORDER BY usage_count DESC, t.name ASC
       LIMIT ?`,
      [searchPattern, searchPattern, limit]
    );
    
    return rows.map(row => TagModel.fromRow(row));
  }

  /**
   * Delete a tag
   */
  async deleteTag(tagId: string): Promise<void> {
    // Remove log associations
    await this.db.prepare('DELETE FROM log_tag_associations WHERE tag_id = ?').run([tagId]);

    // Remove tag associations in both directions
    await this.db
      .prepare('DELETE FROM tag_associations WHERE tag_id = ? OR associated_tag_id = ?')
      .run([tagId, tagId]);

    // Finally remove the tag
    await this.db.prepare('DELETE FROM tags WHERE id = ?').run([tagId]);
  }

  /**
   * Create tag-to-tag association (for tag hierarchies)
   */
  async createTagAssociation(tagId: string, associatedTagId: string): Promise<void> {
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

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO tag_associations (tag_id, associated_tag_id, created_at)
      VALUES (?, ?, ?)
    `);

    await stmt.run([tagId, associatedTagId, new Date().toISOString()]);
  }

  /**
   * Get tag associations for a tag
   */
  async getTagAssociations(tagId: string): Promise<Tag[]> {
    const rows = await this.db.query(
      `SELECT t.id, t.name, t.description, t.metadata, t.created_by, t.created_at, t.updated_at
       FROM tags t
       WHERE t.id IN (
         SELECT associated_tag_id FROM tag_associations WHERE tag_id = ?
         UNION
         SELECT tag_id FROM tag_associations WHERE associated_tag_id = ?
       )
       ORDER BY t.name ASC`,
      [tagId, tagId]
    );

    return rows.map(row => TagModel.fromRow(row));
  }

  /**
   * Get tags that reference this tag (reverse associations) ordered by recency
   */
  async getReverseTagAssociations(tagId: string, limit = 10): Promise<Tag[]> {
    const rows = await this.db.query(
      `SELECT t.id, t.name, t.description, t.metadata, t.created_by, t.created_at, t.updated_at
       FROM tags t
       JOIN tag_associations ta ON t.id = ta.tag_id
       WHERE ta.associated_tag_id = ?
       ORDER BY ta.created_at DESC
       LIMIT ?`,
      [tagId, limit]
    );

    return rows.map(row => TagModel.fromRow(row));
  }

  /**
   * Remove tag association
   */
  async removeTagAssociation(tagId: string, associatedTagId: string): Promise<void> {
    const stmt = this.db.prepare(
      'DELETE FROM tag_associations WHERE tag_id = ? AND associated_tag_id = ?'
    );

    await stmt.run([tagId, associatedTagId]);
  }

  /**
   * Extract hashtag patterns from content (#{tagName} and #tagName formats)
   */
  private extractHashtagsFromContent(content: string): string[] {
    const matches: string[] = [];
    
    // Pattern 1: #{tagName} - extended format (for tags with whitespace)
    const extendedPattern = /#\{([^}]+)\}/g;
    let match;
    
    while ((match = extendedPattern.exec(content)) !== null) {
      const tagName = match[1].trim();
      if (tagName && !matches.includes(tagName)) {
        matches.push(tagName);
      }
    }
    
    // Pattern 2: #tagName - simple format (no whitespace)
    const simplePattern = /#([a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF_-]+)/g;
    
    while ((match = simplePattern.exec(content)) !== null) {
      const tagName = match[1].trim();
      if (tagName && !matches.includes(tagName)) {
        matches.push(tagName);
      }
    }
    
    return matches;
  }

  /**
   * Process hashtag patterns in tag description and create associations
   */
  async processTagAssociations(tagId: string, description: string, userId: string): Promise<void> {
    if (!description) return;
    
    const hashtagNames = this.extractHashtagsFromContent(description);
    if (hashtagNames.length === 0) return;

    for (const tagName of hashtagNames) {
      // Try to find existing tag by name
      const existingTag = await this.db.queryFirst(
        'SELECT id FROM tags WHERE name = ?',
        [tagName]
      );

      let associatedTagId: string;

      if (existingTag) {
        // Tag exists, use its ID
        associatedTagId = existingTag.id;
      } else {
        // Tag doesn't exist, create it with empty description and metadata
        const now = new Date().toISOString();
        associatedTagId = `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const createTagStmt = this.db.prepare(`
          INSERT INTO tags (id, name, description, metadata, created_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        await createTagStmt.run([
          associatedTagId,
          tagName,
          '', // empty description as specified
          '{}', // empty metadata as specified
          userId,
          now,
          now
        ]);
      }

      // Create association if it doesn't already exist and avoid self-association
      if (associatedTagId !== tagId) {
        try {
          await this.createTagAssociation(tagId, associatedTagId);
        } catch (error) {
          // Ignore errors from duplicate associations or other minor issues
          console.warn('Failed to create tag association:', { tagId, associatedTagId, error });
        }
      }
    }
  }
}