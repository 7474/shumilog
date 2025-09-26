-- Migration: 0001_initial_schema
-- Create initial database schema for Shumilog

-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  twitter_id TEXT UNIQUE NOT NULL,
  twitter_username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_users_twitter_id ON users(twitter_id);
CREATE INDEX idx_users_twitter_username ON users(twitter_username);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Tags table
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT,
  description TEXT,
  created_by TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_category ON tags(category);
CREATE INDEX idx_tags_created_by ON tags(created_by);
CREATE INDEX idx_tags_usage_count ON tags(usage_count DESC);

-- Logs table
CREATE TABLE logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  privacy TEXT CHECK (privacy IN ('public', 'private')) DEFAULT 'private',
  status TEXT CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'draft',
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_status ON logs(status);
CREATE INDEX idx_logs_privacy ON logs(privacy);
CREATE INDEX idx_logs_published_at ON logs(published_at);

-- Tag associations (parent-child relationships)
CREATE TABLE tag_associations (
  id TEXT PRIMARY KEY,
  parent_tag_id TEXT NOT NULL,
  child_tag_id TEXT NOT NULL,
  association_type TEXT DEFAULT 'general',
  created_at TEXT NOT NULL,
  FOREIGN KEY (parent_tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  FOREIGN KEY (child_tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(parent_tag_id, child_tag_id)
);

CREATE INDEX idx_tag_associations_parent ON tag_associations(parent_tag_id);
CREATE INDEX idx_tag_associations_child ON tag_associations(child_tag_id);

-- Log-tag associations (many-to-many)
CREATE TABLE log_tag_associations (
  id TEXT PRIMARY KEY,
  log_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (log_id) REFERENCES logs(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(log_id, tag_id)
);

CREATE INDEX idx_log_tag_associations_log ON log_tag_associations(log_id);
CREATE INDEX idx_log_tag_associations_tag ON log_tag_associations(tag_id);

-- User tag progress
CREATE TABLE user_tag_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  status TEXT CHECK (status IN ('learning', 'completed', 'paused')) DEFAULT 'learning',
  progress_notes TEXT,
  last_updated TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(user_id, tag_id)
);

CREATE INDEX idx_user_tag_progress_user ON user_tag_progress(user_id);
CREATE INDEX idx_user_tag_progress_tag ON user_tag_progress(tag_id);
CREATE INDEX idx_user_tag_progress_status ON user_tag_progress(status);

-- Performance indexes for common queries
CREATE INDEX idx_logs_user_privacy_status ON logs(user_id, privacy, status);
CREATE INDEX idx_logs_privacy_status_published ON logs(privacy, status, published_at DESC);
CREATE INDEX idx_tags_category_usage_name ON tags(category, usage_count DESC, name);
CREATE INDEX idx_user_tag_progress_user_status_updated ON user_tag_progress(user_id, status, last_updated DESC);

-- Full-text search table for logs
CREATE VIRTUAL TABLE logs_fts USING fts5(
  title, 
  content,
  content_id UNINDEXED
);

-- Triggers to keep FTS table in sync
CREATE TRIGGER logs_fts_insert 
AFTER INSERT ON logs BEGIN
  INSERT INTO logs_fts(title, content, content_id) 
  VALUES (new.title, new.content, new.id);
END;

CREATE TRIGGER logs_fts_update 
AFTER UPDATE ON logs BEGIN
  UPDATE logs_fts 
  SET title = new.title, content = new.content 
  WHERE content_id = new.id;
END;

CREATE TRIGGER logs_fts_delete 
AFTER DELETE ON logs BEGIN
  DELETE FROM logs_fts WHERE content_id = old.id;
END;

-- Schema migrations tracking
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT DEFAULT (datetime('now')),
  description TEXT
);

INSERT INTO schema_migrations (version, description) 
VALUES (1, 'Initial schema creation');