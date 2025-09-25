/**
 * LogTagAssociation model for log-tag relationships
 * 
 * Represents the many-to-many relationship between logs and tags
 */

export interface LogTagAssociation {
  id: number;
  log_id: number;
  tag_id: number;
  created_at: string;
  relevance_score: number; // 0.0 - 1.0 for how relevant this tag is to the log
  auto_generated: boolean; // Whether this association was auto-generated or manual
  metadata: LogTagAssociationMetadata;
}

export interface LogTagAssociationMetadata {
  // How this association was created
  source: 'manual' | 'auto' | 'hashtag' | 'content_analysis';
  
  // Confidence score for auto-generated associations
  confidence?: number; // 0.0 - 1.0
  
  // Context within the log where this tag is relevant
  context?: {
    mentioned_in_title?: boolean;
    mentioned_in_content?: boolean;
    hashtag_positions?: number[]; // Character positions of hashtags
    content_sections?: string[]; // Which sections mention this tag
  };
  
  // User who added this tag (if manually added)
  added_by_user_id?: number;
  
  // External source information
  external_source?: string;
  external_confidence?: number;
  
  // Custom metadata
  [key: string]: any;
}

export interface CreateLogTagAssociationData {
  log_id: number;
  tag_id: number;
  relevance_score?: number;
  auto_generated?: boolean;
  metadata?: Partial<LogTagAssociationMetadata>;
}

export interface LogTagAssociationSearchParams {
  log_id?: number;
  tag_id?: number;
  min_relevance_score?: number;
  auto_generated?: boolean;
  source?: 'manual' | 'auto' | 'hashtag' | 'content_analysis';
  limit?: number;
  offset?: number;
}

/**
 * Database schema for log_tag_associations table
 */
export const LOG_TAG_ASSOCIATION_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS log_tag_associations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    relevance_score REAL DEFAULT 1.0,
    auto_generated BOOLEAN DEFAULT 0,
    metadata TEXT DEFAULT '{}', -- JSON string
    UNIQUE(log_id, tag_id),
    FOREIGN KEY (log_id) REFERENCES logs(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_log_tag_associations_log_id ON log_tag_associations(log_id);
  CREATE INDEX IF NOT EXISTS idx_log_tag_associations_tag_id ON log_tag_associations(tag_id);
  CREATE INDEX IF NOT EXISTS idx_log_tag_associations_relevance ON log_tag_associations(relevance_score DESC);
  CREATE INDEX IF NOT EXISTS idx_log_tag_associations_auto ON log_tag_associations(auto_generated);
  CREATE INDEX IF NOT EXISTS idx_log_tag_associations_created_at ON log_tag_associations(created_at);
`;

/**
 * Utility functions for LogTagAssociation model
 */
export class LogTagAssociationModel {
  /**
   * Parse log-tag association metadata from JSON string
   */
  static parseMetadata(metadataJson: string): LogTagAssociationMetadata {
    try {
      const parsed = JSON.parse(metadataJson);
      return { source: 'manual', ...parsed };
    } catch {
      return { source: 'manual' };
    }
  }

  /**
   * Serialize log-tag association metadata to JSON string
   */
  static serializeMetadata(metadata: Partial<LogTagAssociationMetadata>): string {
    return JSON.stringify(metadata || { source: 'manual' });
  }

  /**
   * Calculate relevance score based on context
   */
  static calculateRelevanceScore(
    titleMentioned: boolean,
    contentMentions: number,
    isHashtag: boolean,
    contentLength: number
  ): number {
    let score = 0;

    // Base score for any mention
    score += 0.3;

    // Title mentions are highly relevant
    if (titleMentioned) {
      score += 0.4;
    }

    // Content mentions (normalized by content length)
    const mentionDensity = Math.min(contentMentions / (contentLength / 100), 1);
    score += mentionDensity * 0.3;

    // Hashtags indicate intentional tagging
    if (isHashtag) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Get logs by tag with relevance sorting
   */
  static buildLogsByTagQuery(tagId: number, privacy?: 'public' | 'private'): string {
    const privacyCondition = privacy ? 'AND l.privacy = ?' : '';
    
    return `
      SELECT 
        l.*,
        lta.relevance_score,
        lta.auto_generated,
        lta.metadata as association_metadata
      FROM logs l
      JOIN log_tag_associations lta ON l.id = lta.log_id
      WHERE lta.tag_id = ?
        AND l.status = 'published'
        ${privacyCondition}
      ORDER BY lta.relevance_score DESC, l.created_at DESC
    `;
  }

  /**
   * Get tags by log with relevance sorting
   */
  static buildTagsByLogQuery(logId: number): string {
    return `
      SELECT 
        t.*,
        lta.relevance_score,
        lta.auto_generated,
        lta.metadata as association_metadata
      FROM tags t
      JOIN log_tag_associations lta ON t.id = lta.tag_id
      WHERE lta.log_id = ?
        AND t.is_active = 1
      ORDER BY lta.relevance_score DESC, t.usage_count DESC
    `;
  }

  /**
   * Find similar logs based on tag overlap
   */
  static buildSimilarLogsQuery(logId: number, minSharedTags = 2): string {
    return `
      WITH log_tags AS (
        SELECT tag_id, relevance_score
        FROM log_tag_associations
        WHERE log_id = ?
      ),
      similar_logs AS (
        SELECT 
          lta.log_id,
          COUNT(*) as shared_tags,
          AVG(lta.relevance_score * lt.relevance_score) as similarity_score
        FROM log_tag_associations lta
        JOIN log_tags lt ON lta.tag_id = lt.tag_id
        WHERE lta.log_id != ?
        GROUP BY lta.log_id
        HAVING COUNT(*) >= ?
      )
      SELECT 
        l.*,
        sl.shared_tags,
        sl.similarity_score
      FROM logs l
      JOIN similar_logs sl ON l.id = sl.log_id
      WHERE l.privacy = 'public' 
        AND l.status = 'published'
      ORDER BY sl.similarity_score DESC, sl.shared_tags DESC
    `;
  }

  /**
   * Get tag usage statistics
   */
  static buildTagUsageStatsQuery(tagId: number): string {
    return `
      SELECT 
        COUNT(*) as total_usage,
        COUNT(DISTINCT l.user_id) as unique_users,
        AVG(lta.relevance_score) as avg_relevance,
        COUNT(CASE WHEN lta.auto_generated = 1 THEN 1 END) as auto_generated_count,
        COUNT(CASE WHEN lta.auto_generated = 0 THEN 1 END) as manual_count,
        MIN(lta.created_at) as first_used,
        MAX(lta.created_at) as last_used
      FROM log_tag_associations lta
      JOIN logs l ON lta.log_id = l.id
      WHERE lta.tag_id = ?
        AND l.status = 'published'
    `;
  }

  /**
   * Get trending tags (most used recently)
   */
  static buildTrendingTagsQuery(days = 7): string {
    return `
      SELECT 
        t.*,
        COUNT(lta.id) as recent_usage,
        COUNT(DISTINCT l.user_id) as unique_users,
        AVG(lta.relevance_score) as avg_relevance
      FROM tags t
      JOIN log_tag_associations lta ON t.id = lta.tag_id
      JOIN logs l ON lta.log_id = l.id
      WHERE lta.created_at >= datetime('now', '-${days} days')
        AND l.privacy = 'public'
        AND l.status = 'published'
        AND t.is_active = 1
      GROUP BY t.id
      ORDER BY recent_usage DESC, unique_users DESC
    `;
  }

  /**
   * Clean up orphaned associations
   */
  static buildCleanupOrphanedAssociationsQuery(): string {
    return `
      DELETE FROM log_tag_associations 
      WHERE log_id NOT IN (SELECT id FROM logs)
         OR tag_id NOT IN (SELECT id FROM tags WHERE is_active = 1)
    `;
  }

  /**
   * Update tag usage counts based on associations
   */
  static buildUpdateTagUsageCountsQuery(): string {
    return `
      UPDATE tags 
      SET usage_count = (
        SELECT COUNT(*)
        FROM log_tag_associations lta
        JOIN logs l ON lta.log_id = l.id
        WHERE lta.tag_id = tags.id
          AND l.status = 'published'
      )
      WHERE is_active = 1
    `;
  }

  /**
   * Bulk create associations for log
   */
  static buildBulkCreateQuery(associations: CreateLogTagAssociationData[]): string {
    if (associations.length === 0) return '';

    const values = associations.map(() => '(?, ?, ?, ?, ?)').join(', ');
    
    return `
      INSERT OR IGNORE INTO log_tag_associations 
      (log_id, tag_id, relevance_score, auto_generated, metadata)
      VALUES ${values}
    `;
  }

  /**
   * Find potential auto-tagging suggestions
   */
  static buildAutoTagSuggestionsQuery(logId: number, contentKeywords: string[]): string {
    if (contentKeywords.length === 0) return '';

    const keywordConditions = contentKeywords.map(() => 't.name LIKE ?').join(' OR ');
    
    return `
      SELECT 
        t.*,
        COUNT(lta.id) as usage_frequency,
        AVG(lta.relevance_score) as avg_relevance
      FROM tags t
      LEFT JOIN log_tag_associations lta ON t.id = lta.tag_id
      WHERE t.is_active = 1
        AND (${keywordConditions})
        AND t.id NOT IN (
          SELECT tag_id 
          FROM log_tag_associations 
          WHERE log_id = ?
        )
      GROUP BY t.id
      ORDER BY usage_frequency DESC, avg_relevance DESC
      LIMIT 10
    `;
  }
}