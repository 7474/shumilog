/**
 * LogTagAssociation model aligned with minimal data model blueprint
 */

export interface LogTagAssociation {
  log_id: string;
  tag_id: string;
  association_order: number;
  created_at: string;
}

export interface CreateLogTagAssociationData {
  log_id: string;
  tag_id: string;
  association_order?: number;
}

export const LOG_TAG_ASSOCIATION_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS log_tag_associations (
    log_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    association_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (log_id, tag_id),
    FOREIGN KEY (log_id) REFERENCES logs(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );
  
  CREATE INDEX IF NOT EXISTS idx_log_tag_assoc_tag_id ON log_tag_associations(tag_id);
  CREATE INDEX IF NOT EXISTS idx_log_tag_assoc_tag_log ON log_tag_associations(tag_id, log_id);
`;

export class LogTagAssociationModel {
  static fromRow(row: any): LogTagAssociation {
    return {
      log_id: row.log_id,
      tag_id: row.tag_id,
      association_order: row.association_order || 0,
      created_at: row.created_at
    };
  }
}

