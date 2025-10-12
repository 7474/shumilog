/**
 * TagAssociation model aligned with minimal data model blueprint
 */

export interface TagAssociation {
  tag_id: string;
  associated_tag_id: string;
  created_at: string;
  association_order: number;
}

export interface CreateTagAssociationData {
  tag_id: string;
  associated_tag_id: string;
  association_order?: number;
}

export const TAG_ASSOCIATION_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS tag_associations (
    tag_id TEXT NOT NULL,
    associated_tag_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    association_order INTEGER NOT NULL DEFAULT 0,
    
    PRIMARY KEY (tag_id, associated_tag_id),
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    FOREIGN KEY (associated_tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    CHECK (tag_id != associated_tag_id)
  );
  
  CREATE INDEX IF NOT EXISTS idx_tag_assoc_associated_tag_id ON tag_associations(associated_tag_id);
`;

export class TagAssociationModel {
  static isValidAssociation(tagId: string, associatedTagId: string): boolean {
    // Enforce self-association guard
    return tagId !== associatedTagId;
  }

  static fromRow(row: any): TagAssociation {
    return {
      tag_id: row.tag_id,
      associated_tag_id: row.associated_tag_id,
      created_at: row.created_at,
      association_order: row.association_order || 0
    };
  }
}