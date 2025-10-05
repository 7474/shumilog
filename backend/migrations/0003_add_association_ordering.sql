-- Migration: 0003_add_association_ordering
-- Add ordering fields to tag and log associations

-- Add association_order to tag_associations
-- This represents the order of appearance in the tag description
ALTER TABLE tag_associations ADD COLUMN association_order INTEGER NOT NULL DEFAULT 0;

-- Add association_order and created_at to log_tag_associations
-- association_order: order of appearance in the log content
-- created_at: timestamp for sorting reverse references
ALTER TABLE log_tag_associations ADD COLUMN association_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE log_tag_associations ADD COLUMN created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update schema migrations
INSERT INTO schema_migrations (version, description) 
VALUES (3, 'Add association ordering fields');
