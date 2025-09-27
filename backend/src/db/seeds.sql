-- Deterministic seed data for local development and testing
BEGIN TRANSACTION;

INSERT OR IGNORE INTO users (id, twitter_username, display_name, avatar_url, created_at)
VALUES ('user_log_owner', 'testuser', 'Test User', 'https://example.com/avatar.jpg', '2023-01-01T00:00:00Z');

INSERT OR IGNORE INTO tags (id, name, description, metadata, created_by, created_at, updated_at)
VALUES ('tag_anime', 'anime', 'Japanese animation', '{"category": "media"}', 'user_log_owner', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z');

INSERT OR IGNORE INTO tags (id, name, description, metadata, created_by, created_at, updated_at)
VALUES ('tag_gaming', 'gaming', 'Video games', '{"category": "media"}', 'user_log_owner', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z');

INSERT OR IGNORE INTO logs (id, user_id, title, content_md, is_public, created_at, updated_at)
VALUES ('log_public_1', 'user_log_owner', 'My anime journey', 'Started watching **Attack on Titan** today. Great animation!', 1, '2023-01-02T00:00:00Z', '2023-01-02T00:00:00Z');

INSERT OR IGNORE INTO logs (id, user_id, title, content_md, is_public, created_at, updated_at)
VALUES ('log_public_2', 'user_log_owner', 'Gaming progress', 'Completed the first level of my new game.', 1, '2023-01-03T00:00:00Z', '2023-01-03T00:00:00Z');

INSERT OR IGNORE INTO tag_associations (tag_id, associated_tag_id, created_at)
VALUES ('tag_anime', 'tag_gaming', '2023-01-01T00:00:00Z');

INSERT OR IGNORE INTO log_tag_associations (log_id, tag_id)
VALUES ('log_public_1', 'tag_anime');

INSERT OR IGNORE INTO log_tag_associations (log_id, tag_id)
VALUES ('log_public_2', 'tag_gaming');

COMMIT;
