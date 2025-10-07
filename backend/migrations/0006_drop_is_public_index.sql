-- Drop idx_logs_is_public index as it's not needed
-- The is_public field has low selectivity (most logs are public)
-- and the index provides minimal performance benefit

DROP INDEX IF EXISTS idx_logs_is_public;
