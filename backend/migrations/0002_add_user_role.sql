-- Migration: 0002_add_user_role
-- Add role column to users table for privilege management

-- Add role column with default value 'user'
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Record migration
INSERT INTO schema_migrations (version, description) 
VALUES (2, 'Add role column to users table');
