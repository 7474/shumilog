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
    association_order INTEGER NOT NULL DEFAULT 0,
    
    PRIMARY KEY (tag_id, associated_tag_id),
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    FOREIGN KEY (associated_tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    CHECK (tag_id != associated_tag_id)
  );

  CREATE INDEX idx_tag_assoc_associated_tag_id ON tag_associations(associated_tag_id);`,

  `-- Tag revisions table (tag edit history)
  CREATE TABLE IF NOT EXISTS tag_revisions (
    id TEXT PRIMARY KEY,
    tag_id TEXT NOT NULL,
    revision_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL,
    
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (tag_id, revision_number)
  );

  CREATE INDEX IF NOT EXISTS idx_tag_revisions_tag_id ON tag_revisions(tag_id);
  CREATE INDEX IF NOT EXISTS idx_tag_revisions_created_at ON tag_revisions(created_at);`,

  `-- Logs table (minimal with markdown limits)
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
  CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_logs_user_created ON logs(user_id, created_at DESC);`,

  `-- Log-tag associations (simplified)
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
  CREATE INDEX IF NOT EXISTS idx_log_tag_assoc_tag_log ON log_tag_associations(tag_id, log_id);`,

  `-- FTS5 full-text search for logs
  CREATE VIRTUAL TABLE IF NOT EXISTS logs_fts USING fts5(
    log_id UNINDEXED,
    title,
    content_md,
    tokenize='trigram'
  );`,

  `-- FTS triggers to keep logs_fts in sync
  CREATE TRIGGER IF NOT EXISTS logs_fts_insert AFTER INSERT ON logs
  BEGIN
    INSERT INTO logs_fts(log_id, title, content_md)
    VALUES (NEW.id, COALESCE(NEW.title, ''), NEW.content_md);
  END;`,

  `CREATE TRIGGER IF NOT EXISTS logs_fts_update AFTER UPDATE ON logs
  BEGIN
    UPDATE logs_fts SET title = COALESCE(NEW.title, ''), content_md = NEW.content_md
    WHERE log_id = NEW.id;
  END;`,

  `CREATE TRIGGER IF NOT EXISTS logs_fts_delete AFTER DELETE ON logs
  BEGIN
    DELETE FROM logs_fts WHERE log_id = OLD.id;
  END;`,

  `-- FTS5 full-text search for tags
  CREATE VIRTUAL TABLE IF NOT EXISTS tags_fts USING fts5(
    tag_id UNINDEXED,
    name,
    description,
    tokenize='trigram'
  );`,

  `-- Tags FTS triggers
  CREATE TRIGGER IF NOT EXISTS tags_fts_insert AFTER INSERT ON tags
  BEGIN
    INSERT INTO tags_fts(tag_id, name, description)
    VALUES (NEW.id, NEW.name, COALESCE(NEW.description, ''));
  END;`,

  `CREATE TRIGGER IF NOT EXISTS tags_fts_update AFTER UPDATE ON tags
  BEGIN
    UPDATE tags_fts SET name = NEW.name, description = COALESCE(NEW.description, '')
    WHERE tag_id = NEW.id;
  END;`,

  `CREATE TRIGGER IF NOT EXISTS tags_fts_delete AFTER DELETE ON tags
  BEGIN
    DELETE FROM tags_fts WHERE tag_id = OLD.id;
  END;`,

  `-- Images table (owned by users)
  CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    file_name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    width INTEGER,
    height INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_images_user_id ON images(user_id);`,

  `-- Log-image associations
  CREATE TABLE IF NOT EXISTS log_image_associations (
    log_id TEXT NOT NULL,
    image_id TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (log_id, image_id),
    FOREIGN KEY (log_id) REFERENCES logs(id) ON DELETE CASCADE,
    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_log_image_assoc_image_id ON log_image_associations(image_id);
  CREATE INDEX IF NOT EXISTS idx_log_image_assoc_display_order ON log_image_associations(log_id, display_order);`,

  `-- Schema migrations tracking
  CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
    description TEXT
  );`
];