/**
 * Tag model matching API specification
 */

export interface Tag {
  id: string;
  title: string;
  description?: string;
  metadata: object;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTagData {
  title: string;
  description?: string;
  metadata?: object;
}

export interface UpdateTagData {
  title?: string;
  description?: string;
  metadata?: object;
}

export interface TagSearchParams {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TagDetail extends Tag {
  log_count: number;
  recent_logs: any[];
  associated_tags: Tag[];
}

export const TAG_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    metadata TEXT NOT NULL DEFAULT '{}',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    
    FOREIGN KEY (created_by) REFERENCES users(id)
  );
  
  CREATE INDEX IF NOT EXISTS idx_tags_title ON tags(title);
  CREATE INDEX IF NOT EXISTS idx_tags_created_by ON tags(created_by);
  CREATE INDEX IF NOT EXISTS idx_tags_created_at ON tags(created_at);
`;

export class TagModel {
  static parseMetadata(metadataJson: string): object {
    try {
      return JSON.parse(metadataJson);
    } catch {
      return {};
    }
  }

  static serializeMetadata(metadata: object): string {
    return JSON.stringify(metadata || {});
  }

  static isValidTitle(title: string): boolean {
    return title.length > 0 && title.length <= 200;
  }

  static fromRow(row: any): Tag {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      metadata: TagModel.parseMetadata(row.metadata),
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
