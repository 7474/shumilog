// Database schema definitions for Cloudflare D1
// Used by test helpers to set up test database

export const DATABASE_SCHEMAS = [
  `-- Users table (minimal fields)
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    twitter_username TEXT,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX idx_users_twitter_username ON users(twitter_username);`,

  `-- Sessions table for Worker cookies
  CREATE TABLE sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);`,

  `-- Tags table
  CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    metadata TEXT NOT NULL DEFAULT '{}',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX idx_tags_name ON tags(name);`,

  `-- Tag associations (simplified)
  CREATE TABLE tag_associations (
    tag_id TEXT NOT NULL,
    associated_tag_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (tag_id, associated_tag_id),
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    FOREIGN KEY (associated_tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    CHECK (tag_id != associated_tag_id)
  );

  CREATE INDEX idx_tag_assoc_associated_tag_id ON tag_associations(associated_tag_id);`,

  `-- Logs table (minimal with markdown limits)
  CREATE TABLE logs (
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

  CREATE INDEX idx_logs_user_id ON logs(user_id);
  CREATE INDEX idx_logs_is_public ON logs(is_public);`,

  `-- Log-tag associations (simplified)
  CREATE TABLE log_tag_associations (
    log_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    
    PRIMARY KEY (log_id, tag_id),
    FOREIGN KEY (log_id) REFERENCES logs(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE INDEX idx_log_tag_assoc_tag_id ON log_tag_associations(tag_id);`,

  `-- Schema migrations tracking
  CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
    description TEXT
  );`
];