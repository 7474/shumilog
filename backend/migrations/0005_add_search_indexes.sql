-- Add composite indexes for search optimization
-- Based on api-performance-optimization-plan.md section 2.1

-- Index for logs sorted by created_at (most common query pattern)
-- Covers: SELECT ... FROM logs ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);

-- Composite index for user's logs sorted by creation date
-- Covers: SELECT ... FROM logs WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_logs_user_created ON logs(user_id, created_at DESC);

-- Composite index for tag-based log search
-- Covers: JOIN log_tag_associations WHERE tag_id IN (...) queries
-- Also helps with getting all logs for a specific tag
CREATE INDEX IF NOT EXISTS idx_log_tag_assoc_tag_log ON log_tag_associations(tag_id, log_id);
