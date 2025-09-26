import { Tag, TagModel, CreateTagData, UpdateTagData, TagSearchParams } from '../models/Tag.js';
import { Database } from '../db/database.js';

export interface TagUsageStats {
  tagId: string;
  usageCount: number;
  lastUsed: string;
}

export class TagService {
  constructor(private db: Database) {}

  /**
   * Create a new tag
   */
  async createTag(data: CreateTagData, createdBy: string): Promise<Tag> {
    const now = new Date().toISOString();
    const tagId = `tag_${Date.now()}`;
    
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

    return {
      id: tagId,
      name: data.name,
      description: data.description,
      metadata: data.metadata || {},
      created_by: createdBy,
      created_at: now,
      updated_at: now
    };
  }

  /**
   * Update a tag
   */
  async updateTag(tagId: string, data: UpdateTagData): Promise<Tag> {
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
    
    return updatedTag;
  }

  /**
   * Get tag by ID
   */
  async getTagById(id: string): Promise<Tag | null> {
    const row = await this.db.queryFirst(
      'SELECT id, name, description, metadata, created_by, created_at, updated_at FROM tags WHERE id = ?',
      [id]
    );
    
    return row ? TagModel.fromRow(row) : null;
  }

  /**
   * Search tags
   */
  async searchTags(options: TagSearchParams = {}): Promise<Tag[]> {
    const { search, limit = 20, offset = 0 } = options;
    
    let sql = 'SELECT id, name, description, metadata, created_by, created_at, updated_at FROM tags';
    const params: any[] = [];
    
    if (search) {
      sql += ' WHERE name LIKE ? OR description LIKE ?';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }
    
    sql += ' ORDER BY name ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const rows = await this.db.query(sql, params);
    return rows.map(row => TagModel.fromRow(row));
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
      lastUsed: lastUsedResult?.last_used || new Date().toISOString()
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
    // Start transaction - delete associations first, then tag
    const deleteAssociationsStmt = this.db.prepare(
      'DELETE FROM log_tag_associations WHERE tag_id = ?'
    );
    await deleteAssociationsStmt.run([tagId]);
    
    const deleteTagStmt = this.db.prepare(
      'DELETE FROM tags WHERE id = ?'
    );
    await deleteTagStmt.run([tagId]);
  }

  /**
   * Create tag-to-tag association (for tag hierarchies)
   */
  async createTagAssociation(parentTagId: string, childTagId: string, associationType: string = 'parent'): Promise<void> {
    // Prevent self-association
    if (parentTagId === childTagId) {
      throw new Error('Cannot create self-association');
    }

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO tag_associations (parent_tag_id, child_tag_id, association_type, created_at)
      VALUES (?, ?, ?, ?)
    `);
    
    await stmt.run([parentTagId, childTagId, associationType, new Date().toISOString()]);
  }

  /**
   * Get tag associations for a tag
   */
  async getTagAssociations(tagId: string): Promise<{
    parents: Tag[];
    children: Tag[];
  }> {
    // Get parent tags
    const parentRows = await this.db.query(
      `SELECT t.id, t.name, t.description, t.metadata, t.created_by, t.created_at, t.updated_at
       FROM tags t
       JOIN tag_associations ta ON t.id = ta.parent_tag_id
       WHERE ta.child_tag_id = ?`,
      [tagId]
    );

    // Get child tags
    const childRows = await this.db.query(
      `SELECT t.id, t.name, t.description, t.metadata, t.created_by, t.created_at, t.updated_at
       FROM tags t
       JOIN tag_associations ta ON t.id = ta.child_tag_id
       WHERE ta.parent_tag_id = ?`,
      [tagId]
    );

    return {
      parents: parentRows.map(row => TagModel.fromRow(row)),
      children: childRows.map(row => TagModel.fromRow(row))
    };
  }

  /**
   * Remove tag association
   */
  async removeTagAssociation(parentTagId: string, childTagId: string): Promise<void> {
    const stmt = this.db.prepare(
      'DELETE FROM tag_associations WHERE parent_tag_id = ? AND child_tag_id = ?'
    );
    
    await stmt.run([parentTagId, childTagId]);
  }
}