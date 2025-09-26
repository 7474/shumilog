-- Development Database Initialization Script
-- This script sets up the database with development-specific configurations

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 1000;
PRAGMA temp_store = memory;

-- Create development-specific tables if they don't exist
-- (Note: Main tables are created by schema.sql.ts)

-- Development logging table for debugging
CREATE TABLE IF NOT EXISTS dev_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  service TEXT NOT NULL CHECK (service IN ('backend', 'frontend', 'database')),
  message TEXT NOT NULL,
  metadata TEXT, -- JSON string for additional data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Development configuration table
CREATE TABLE IF NOT EXISTS dev_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default development configuration
INSERT OR IGNORE INTO dev_config (key, value, description) VALUES
  ('hot_reload_enabled', 'true', 'Enable hot reload for development'),
  ('debug_mode', 'true', 'Enable debug logging and endpoints'),
  ('mock_external_apis', 'true', 'Use mock responses for external APIs'),
  ('dev_endpoints_enabled', 'true', 'Enable development-only endpoints'),
  ('startup_time', datetime('now'), 'Last development environment startup'),
  ('database_version', '1.0.0', 'Development database schema version');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dev_logs_timestamp ON dev_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_dev_logs_level ON dev_logs(level);
CREATE INDEX IF NOT EXISTS idx_dev_logs_service ON dev_logs(service);
CREATE INDEX IF NOT EXISTS idx_dev_config_key ON dev_config(key);

-- Insert some sample log entries for testing
INSERT OR IGNORE INTO dev_logs (level, service, message, metadata) VALUES
  ('info', 'database', 'Development database initialized', '{"version": "1.0.0", "mode": "development"}'),
  ('info', 'backend', 'Development server starting', '{"port": 8787, "hot_reload": true}'),
  ('debug', 'backend', 'Health check endpoint registered', '{"endpoint": "/health"}'),
  ('debug', 'backend', 'Development endpoints registered', '{"endpoints": ["/dev/config", "/dev/logs", "/dev/reload"]}');

-- Create a view for recent development activity
CREATE VIEW IF NOT EXISTS dev_recent_activity AS
SELECT 
  timestamp,
  level,
  service,
  message,
  metadata
FROM dev_logs 
WHERE timestamp >= datetime('now', '-1 hour')
ORDER BY timestamp DESC
LIMIT 50;

-- Update startup time
UPDATE dev_config SET value = datetime('now'), updated_at = datetime('now') WHERE key = 'startup_time';

-- Log the initialization
INSERT INTO dev_logs (level, service, message, metadata) 
VALUES ('info', 'database', 'Development initialization script completed', 
        '{"timestamp": "' || datetime('now') || '", "script": "init-dev.sql"}');