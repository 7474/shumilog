/**
 * Log model aligned with minimal data model blueprint
 */

export interface User {
  id: string;
  twitter_username?: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  description?: string;
  metadata: object;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Log {
  id: string;
  user_id: string;
  user: User;
  associated_tags: Tag[];
  title?: string;
  content_md: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface LogDetail extends Log {}

export interface CreateLogData {
  tag_ids?: string[];
  tag_names?: string[];
  title?: string;
  content_md: string;
  is_public?: boolean;
}

export interface UpdateLogData {
  tag_ids?: string[];
  tag_names?: string[];
  title?: string;
  content_md?: string;
  is_public?: boolean;
}

export interface LogSearchParams {
  tag_ids?: string[];
  user_id?: string;
  is_public?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

// Import Tag interface (will be available after Tag model is fixed)

export const LOG_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT,
    content_md TEXT NOT NULL,
    is_public INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (length(title) <= 200),
    CHECK (length(content_md) <= 10000)
  );
  
  CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_logs_is_public ON logs(is_public);
`;

export class LogModel {
  static isValidTitle(title?: string): boolean {
    return !title || (title.length > 0 && title.length <= 200);
  }

  static isValidContent(content: string): boolean {
    return content.length > 0 && content.length <= 10000;
  }

  static fromRow(row: any, user: User, tags: Tag[]): Log {
    return {
      id: row.id,
      user_id: row.user_id,
      user,
      associated_tags: tags,
      title: row.title,
      content_md: row.content_md,
      is_public: Boolean(row.is_public),
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  static fromRowWithVisibility(row: any, user: User, tags: Tag[]): LogDetail {
    return LogModel.fromRow(row, user, tags);
  }
}
