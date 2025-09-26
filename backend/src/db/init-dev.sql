-- Development Database Initialization Script
-- Minimal D1 development setup with deterministic fixtures

PRAGMA foreign_keys = ON;

-- Insert deterministic test user
INSERT OR IGNORE INTO users (id, twitter_username, display_name, avatar_url, created_at)
VALUES ('user_log_owner', 'testuser', 'Test User', 'https://example.com/avatar.jpg', '2023-01-01T00:00:00Z');

-- Insert test tags
INSERT OR IGNORE INTO tags (id, name, description, metadata, created_by, created_at, updated_at)
VALUES 
  ('tag_anime', 'anime', 'Japanese animation', '{"category": "media"}', 'user_log_owner', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z'),
  ('tag_gaming', 'gaming', 'Video games', '{"category": "media"}', 'user_log_owner', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z');

-- Insert test logs
INSERT OR IGNORE INTO logs (id, user_id, title, content_md, is_public, created_at, updated_at)
VALUES 
  ('log_public_1', 'user_log_owner', 'My anime journey', 'Started watching **Attack on Titan** today. Great animation!', 1, '2023-01-02T00:00:00Z', '2023-01-02T00:00:00Z'),
  ('log_public_2', 'user_log_owner', 'Gaming progress', 'Completed the first level of my new game.', 1, '2023-01-03T00:00:00Z', '2023-01-03T00:00:00Z');

-- Insert tag associations
INSERT OR IGNORE INTO tag_associations (tag_id, associated_tag_id, created_at)
VALUES ('tag_anime', 'tag_gaming', '2023-01-01T00:00:00Z');

-- Insert log-tag associations
INSERT OR IGNORE INTO log_tag_associations (log_id, tag_id)
VALUES 
  ('log_public_1', 'tag_anime'),
  ('log_public_2', 'tag_gaming');

-- Create a test session for development
INSERT OR IGNORE INTO sessions (token, user_id, created_at, expires_at)
VALUES ('valid_session_token', 'user_log_owner', '2023-01-01T00:00:00Z', '2024-01-01T00:00:00Z');