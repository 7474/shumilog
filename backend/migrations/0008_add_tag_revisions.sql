-- Migration: 0008_add_tag_revisions
-- Add tag revision history tracking

-- Tag revisions table to store historical versions of tags
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

-- Index for efficient revision queries
CREATE INDEX IF NOT EXISTS idx_tag_revisions_tag_id ON tag_revisions(tag_id);
CREATE INDEX IF NOT EXISTS idx_tag_revisions_created_at ON tag_revisions(created_at);

-- Insert migration record
INSERT INTO schema_migrations (version, description) 
VALUES (8, 'Add tag revision history tracking');
