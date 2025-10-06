-- Add table for storing image metadata associated with logs
CREATE TABLE log_images (
  id TEXT PRIMARY KEY,
  log_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (log_id) REFERENCES logs(id) ON DELETE CASCADE
);

CREATE INDEX idx_log_images_log_id ON log_images(log_id);
CREATE INDEX idx_log_images_display_order ON log_images(log_id, display_order);
