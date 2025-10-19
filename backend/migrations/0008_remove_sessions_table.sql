-- Migration 0008: Remove sessions table
-- Sessions have been migrated to Cloudflare KV for improved performance
-- KV provides:
-- - Faster access times (edge-cached)
-- - Automatic TTL-based expiration
-- - Lower latency for authentication checks

DROP TABLE IF EXISTS sessions;
