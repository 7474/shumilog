-- Migration: 0007_add_fts5_search
-- Add FTS5 full-text search for logs and tags with trigram tokenizer for better Japanese support

-- Create FTS5 virtual table for logs
-- Using trigram tokenizer for better CJK (Japanese) text search
-- This allows substring matching without word boundaries
CREATE VIRTUAL TABLE IF NOT EXISTS logs_fts USING fts5(
  log_id UNINDEXED,
  title,
  content_md,
  tokenize='trigram'
);

-- Populate FTS table with existing logs
INSERT INTO logs_fts(log_id, title, content_md)
SELECT id, COALESCE(title, ''), content_md FROM logs;

-- Create triggers to keep FTS table in sync with logs table
-- Trigger for INSERT
CREATE TRIGGER IF NOT EXISTS logs_fts_insert AFTER INSERT ON logs
BEGIN
  INSERT INTO logs_fts(log_id, title, content_md)
  VALUES (NEW.id, COALESCE(NEW.title, ''), NEW.content_md);
END;

-- Trigger for UPDATE
CREATE TRIGGER IF NOT EXISTS logs_fts_update AFTER UPDATE ON logs
BEGIN
  UPDATE logs_fts SET title = COALESCE(NEW.title, ''), content_md = NEW.content_md
  WHERE log_id = NEW.id;
END;

-- Trigger for DELETE
CREATE TRIGGER IF NOT EXISTS logs_fts_delete AFTER DELETE ON logs
BEGIN
  DELETE FROM logs_fts WHERE log_id = OLD.id;
END;

-- Create FTS5 virtual table for tags
CREATE VIRTUAL TABLE IF NOT EXISTS tags_fts USING fts5(
  tag_id UNINDEXED,
  name,
  description,
  tokenize='trigram'
);

-- Populate FTS table with existing tags
INSERT INTO tags_fts(tag_id, name, description)
SELECT id, name, COALESCE(description, '') FROM tags;

-- Create triggers to keep tags FTS table in sync
CREATE TRIGGER IF NOT EXISTS tags_fts_insert AFTER INSERT ON tags
BEGIN
  INSERT INTO tags_fts(tag_id, name, description)
  VALUES (NEW.id, NEW.name, COALESCE(NEW.description, ''));
END;

CREATE TRIGGER IF NOT EXISTS tags_fts_update AFTER UPDATE ON tags
BEGIN
  UPDATE tags_fts SET name = NEW.name, description = COALESCE(NEW.description, '')
  WHERE tag_id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS tags_fts_delete AFTER DELETE ON tags
BEGIN
  DELETE FROM tags_fts WHERE tag_id = OLD.id;
END;
