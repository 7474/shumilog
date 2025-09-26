/**
 * LogTagAssociation model aligned with minimal data model blueprint
 */

export interface LogTagAssociation {
  log_id: string;
  tag_id: string;
}

export interface CreateLogTagAssociationData {
  log_id: string;
  tag_id: string;
}

export const LOG_TAG_ASSOCIATION_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS log_tag_associations (
    log_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    
    PRIMARY KEY (log_id, tag_id),
    FOREIGN KEY (log_id) REFERENCES logs(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );
  
  CREATE INDEX IF NOT EXISTS idx_log_tag_assoc_tag_id ON log_tag_associations(tag_id);
`;

export class LogTagAssociationModel {
  static fromRow(row: any): LogTagAssociation {
    return {
      log_id: row.log_id,
      tag_id: row.tag_id
    };
  }
}

