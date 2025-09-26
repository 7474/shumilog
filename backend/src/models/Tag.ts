/**
 * Tag model matching API specification
 */

export interface Tag {
  id: string;
  name: string;
  description?: string;
  metadata: object;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTagData {
  name: string;
  description?: string;
  metadata?: object;
}

export interface UpdateTagData {
  name?: string;
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
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    metadata TEXT NOT NULL DEFAULT '{}',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
  );
  
  CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
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

  static isValidName(name: string): boolean {
    return name.length > 0 && name.length <= 100;
  }

  static isValidDescription(description?: string): boolean {
    return !description || description.length <= 500;
  }

  static fromRow(row: any): Tag {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      metadata: TagModel.parseMetadata(row.metadata),
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
