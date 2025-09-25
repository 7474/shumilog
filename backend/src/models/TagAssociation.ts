/**
 * TagAssociation model for tag-to-tag relationships
 * 
 * Represents hierarchical and associative relationships between tags
 */

export interface TagAssociation {
  id: number;
  parent_tag_id: number;
  child_tag_id: number;
  relationship_type: TagRelationshipType;
  created_at: string;
  weight: number; // For relationship strength/relevance
  metadata: TagAssociationMetadata;
}

export type TagRelationshipType =
  | 'parent-child' // Hierarchical: anime -> attack-on-titan
  | 'related' // Related content: attack-on-titan -> eren-yeager  
  | 'synonym' // Same thing, different names: aot -> attack-on-titan
  | 'sequel' // Story continuation: attack-on-titan-s1 -> attack-on-titan-s2
  | 'prequel' // Story predecessor
  | 'spinoff' // Related story branch
  | 'adaptation' // Cross-media: attack-on-titan-manga -> attack-on-titan-anime
  | 'character' // Character appears in series
  | 'creator' // Creator worked on series
  | 'studio' // Studio produced series
  | 'genre' // Series belongs to genre
  | 'custom'; // User-defined relationship

export interface TagAssociationMetadata {
  // Relationship context
  description?: string;
  confidence_score?: number; // 0.0 - 1.0 for auto-generated associations
  
  // User who created this association
  created_by_user_id?: number;
  
  // Auto-generated vs manual
  source: 'manual' | 'auto' | 'external';
  
  // External source info
  external_source?: string;
  external_id?: string;
  
  // Relationship strength indicators
  co_occurrence_count?: number; // How often these tags appear together
  user_association_count?: number; // How many users have used both tags
  
  // Custom metadata
  [key: string]: any;
}

export interface CreateTagAssociationData {
  parent_tag_id: number;
  child_tag_id: number;
  relationship_type: TagRelationshipType;
  weight?: number;
  metadata?: Partial<TagAssociationMetadata>;
}

export interface TagAssociationSearchParams {
  parent_tag_id?: number;
  child_tag_id?: number;
  relationship_type?: TagRelationshipType;
  min_weight?: number;
  source?: 'manual' | 'auto' | 'external';
  limit?: number;
  offset?: number;
}

/**
 * Database schema for tag_associations table
 */
export const TAG_ASSOCIATION_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS tag_associations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_tag_id INTEGER NOT NULL,
    child_tag_id INTEGER NOT NULL,
    relationship_type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    weight REAL DEFAULT 1.0,
    metadata TEXT DEFAULT '{}', -- JSON string
    UNIQUE(parent_tag_id, child_tag_id, relationship_type),
    FOREIGN KEY (parent_tag_id) REFERENCES tags(id),
    FOREIGN KEY (child_tag_id) REFERENCES tags(id)
  );

  CREATE INDEX IF NOT EXISTS idx_tag_associations_parent ON tag_associations(parent_tag_id);
  CREATE INDEX IF NOT EXISTS idx_tag_associations_child ON tag_associations(child_tag_id);
  CREATE INDEX IF NOT EXISTS idx_tag_associations_type ON tag_associations(relationship_type);
  CREATE INDEX IF NOT EXISTS idx_tag_associations_weight ON tag_associations(weight DESC);
  CREATE INDEX IF NOT EXISTS idx_tag_associations_created_at ON tag_associations(created_at);
`;

/**
 * Utility functions for TagAssociation model
 */
export class TagAssociationModel {
  /**
   * Parse tag association metadata from JSON string
   */
  static parseMetadata(metadataJson: string): TagAssociationMetadata {
    try {
      const parsed = JSON.parse(metadataJson);
      return { source: 'manual', ...parsed };
    } catch {
      return { source: 'manual' };
    }
  }

  /**
   * Serialize tag association metadata to JSON string
   */
  static serializeMetadata(metadata: Partial<TagAssociationMetadata>): string {
    return JSON.stringify(metadata || { source: 'manual' });
  }

  /**
   * Validate relationship type compatibility
   */
  static isValidRelationship(parentTagId: number, childTagId: number, type: TagRelationshipType): boolean {
    // Can't relate a tag to itself
    if (parentTagId === childTagId) {
      return false;
    }

    // All relationship types are valid between different tags
    return true;
  }

  /**
   * Get inverse relationship type
   */
  static getInverseRelationshipType(type: TagRelationshipType): TagRelationshipType | null {
    const inverseMap: Record<TagRelationshipType, TagRelationshipType | null> = {
      'parent-child': null, // Hierarchical relationships don't have inverses
      'related': 'related', // Related is bidirectional
      'synonym': 'synonym', // Synonym is bidirectional
      'sequel': 'prequel',
      'prequel': 'sequel',
      'spinoff': null, // Spinoffs don't have automatic inverses
      'adaptation': null, // Adaptations are directional
      'character': null, // Character-in-series is directional
      'creator': null, // Creator-of-series is directional
      'studio': null, // Studio-produced-series is directional
      'genre': null, // Series-in-genre is directional
      'custom': null, // Custom relationships are case-specific
    };

    return inverseMap[type];
  }

  /**
   * Calculate relationship weight based on co-occurrence
   */
  static calculateWeight(coOccurrenceCount: number, totalOccurrences: number): number {
    if (totalOccurrences === 0) return 0;
    const weight = coOccurrenceCount / totalOccurrences;
    return Math.min(Math.max(weight, 0), 1); // Clamp between 0 and 1
  }

  /**
   * Find related tags for a given tag
   */
  static buildRelatedTagsQuery(tagId: number, relationshipTypes?: TagRelationshipType[]): string {
    const typeCondition = relationshipTypes && relationshipTypes.length > 0
      ? `AND relationship_type IN (${relationshipTypes.map(() => '?').join(', ')})`
      : '';

    return `
      SELECT 
        ta.*,
        t1.name as parent_tag_name,
        t1.category as parent_tag_category,
        t2.name as child_tag_name,
        t2.category as child_tag_category
      FROM tag_associations ta
      JOIN tags t1 ON ta.parent_tag_id = t1.id
      JOIN tags t2 ON ta.child_tag_id = t2.id
      WHERE (ta.parent_tag_id = ? OR ta.child_tag_id = ?)
        ${typeCondition}
        AND t1.is_active = 1 
        AND t2.is_active = 1
      ORDER BY ta.weight DESC, ta.created_at DESC
    `;
  }

  /**
   * Detect potential tag associations from usage patterns
   */
  static buildCoOccurrenceAnalysisQuery(minCoOccurrence = 3): string {
    return `
      WITH tag_pairs AS (
        SELECT 
          lt1.tag_id as tag1_id,
          lt2.tag_id as tag2_id,
          COUNT(*) as co_occurrence_count
        FROM log_tag_associations lt1
        JOIN log_tag_associations lt2 ON lt1.log_id = lt2.log_id
        WHERE lt1.tag_id < lt2.tag_id  -- Avoid duplicates and self-pairs
        GROUP BY lt1.tag_id, lt2.tag_id
        HAVING COUNT(*) >= ?
      ),
      tag_totals AS (
        SELECT 
          tag_id,
          COUNT(*) as total_usage
        FROM log_tag_associations
        GROUP BY tag_id
      )
      SELECT 
        tp.tag1_id,
        tp.tag2_id,
        tp.co_occurrence_count,
        tt1.total_usage as tag1_total,
        tt2.total_usage as tag2_total,
        CAST(tp.co_occurrence_count AS REAL) / CAST(LEAST(tt1.total_usage, tt2.total_usage) AS REAL) as association_strength
      FROM tag_pairs tp
      JOIN tag_totals tt1 ON tp.tag1_id = tt1.tag_id
      JOIN tag_totals tt2 ON tp.tag2_id = tt2.tag_id
      ORDER BY association_strength DESC, tp.co_occurrence_count DESC
    `;
  }

  /**
   * Check for circular relationships (prevent infinite loops)
   */
  static buildCircularRelationshipCheckQuery(parentTagId: number, childTagId: number): string {
    return `
      WITH RECURSIVE relationship_path AS (
        SELECT parent_tag_id, child_tag_id, 1 as depth
        FROM tag_associations 
        WHERE parent_tag_id = ? AND relationship_type = 'parent-child'
        
        UNION ALL
        
        SELECT ta.parent_tag_id, ta.child_tag_id, rp.depth + 1
        FROM tag_associations ta
        JOIN relationship_path rp ON ta.parent_tag_id = rp.child_tag_id
        WHERE ta.relationship_type = 'parent-child' AND rp.depth < 10
      )
      SELECT COUNT(*) as circular_count
      FROM relationship_path
      WHERE child_tag_id = ?
    `;
  }

  /**
   * Get tag hierarchy depth
   */
  static buildHierarchyDepthQuery(tagId: number): string {
    return `
      WITH RECURSIVE tag_hierarchy AS (
        SELECT ?, 0 as depth
        
        UNION ALL
        
        SELECT ta.parent_tag_id, th.depth + 1
        FROM tag_associations ta
        JOIN tag_hierarchy th ON ta.child_tag_id = th.tag_id
        WHERE ta.relationship_type = 'parent-child' AND th.depth < 10
      )
      SELECT MAX(depth) as max_depth
      FROM tag_hierarchy
    `;
  }
}