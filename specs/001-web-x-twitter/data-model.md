# Data Model: Hobby Content Log Service

## Core Entities

### User
**Purpose**: Represents authenticated users from Twitter OAuth
**Attributes**:
- `id`: Primary key (Twitter user ID, unique, required)
- `twitter_username`: Twitter handle (required)
- `display_name`: User's display name from Twitter
- `avatar_url`: Twitter profile image URL
- `created_at`: Account creation timestamp
- `updated_at`: Last profile update timestamp
- `is_active`: Account status flag

**Relationships**:
- One-to-many with Log (user creates logs)
- One-to-many with UserTagProgress (tracking tag consumption)
- One-to-many with Tag (user creates tags)

**Validation Rules**:
- twitter_id must be unique and non-null
- twitter_username must be valid Twitter handle format
- display_name max 50 characters
- is_active defaults to true

### Tag
**Purpose**: Unified entity for flexible tagging system
**Attributes**:
- `id`: Primary key (UUID)
- `name`: Tag name (required)
- `description`: Brief description
- `metadata`: JSON field for flexible data storage
- `created_by`: Foreign key to User who created this tag
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

**Relationships**:
- Many-to-many with Tag through TagAssociation (tag-to-tag relationships)
- Many-to-many with Log through LogTagAssociation
- One-to-many with UserTagProgress (user progress tracking)
- Many-to-one with User (created by user)

**Validation Rules**:
- name required, max 200 characters
- created_by must reference existing User

### Log
**Purpose**: User-generated personal logs and impressions associated with multiple tags
**Attributes**:
- `id`: Primary key (UUID)
- `user_id`: Foreign key to User (required)
- `title`: Log title
- `content_md`: Log content in Markdown (required)
- `is_public`: Privacy flag (default false)
- `created_at`: Log creation timestamp
- `updated_at`: Last edit timestamp

**Relationships**:
- Many-to-one with User (user creates log)
- Many-to-many with Tag through LogTagAssociation (log associated with multiple tags)

**Validation Rules**:
- user_id must reference existing User
- content_md required, max 10000 characters
- title max 200 characters
- Must have at least one associated tag through LogTagAssociation

### TagAssociation
**Purpose**: Links tags with other tags in bidirectional relationships
**Attributes**:
- `id`: Primary key (UUID)
- `tag_id_1`: Foreign key to first Tag (required)
- `tag_id_2`: Foreign key to second Tag (required)
- `created_by`: Foreign key to User who created this association
- `created_at`: Association creation timestamp

**Relationships**:
- Many-to-one with Tag (first tag)
- Many-to-one with Tag (second tag)
- Many-to-one with User (created by user)

**Validation Rules**:
- tag_id_1 and tag_id_2 must reference existing Tags
- tag_id_1 and tag_id_2 must be different
- Unique constraint on (tag_id_1, tag_id_2) and (tag_id_2, tag_id_1) to prevent duplicates
- created_by must reference existing User

### LogTagAssociation
**Purpose**: Links logs with multiple associated tags
**Attributes**:
- `id`: Primary key (UUID)
- `log_id`: Foreign key to Log (required)
- `tag_id`: Foreign key to Tag (required)
- `created_at`: Association creation timestamp

**Relationships**:
- Many-to-one with Log (association belongs to log)
- Many-to-one with Tag (association references tag)

**Validation Rules**:
- log_id must reference existing Log
- tag_id must reference existing Tag
- Unique constraint on (log_id, tag_id)

### UserTagProgress
**Purpose**: Tracks user's consumption progress through serialized content tags
**Attributes**:
- `id`: Primary key (UUID)
- `user_id`: Foreign key to User (required)
- `content_tag_id`: Foreign key to Tag (type='content', required)
- `current_episode_number`: Current episode/chapter number (integer)
- `status`: Enum (watching, completed, dropped, on_hold, plan_to_watch)
- `started_at`: When user started consuming content
- `completed_at`: When user completed content (if applicable)
- `updated_at`: Last progress update

**Relationships**:
- Many-to-one with User (user's progress)
- Many-to-one with Tag (progress on content tag)

**Validation Rules**:
- Unique constraint on (user_id, content_tag_id)
- content_tag_id must reference Tag with type='content'
- current_episode_number must be positive integer
- status must be valid enum value
- completed_at only valid when status is 'completed'

### Session
**Purpose**: User authentication sessions
**Attributes**:
- `id`: Primary key (session token)
- `user_id`: Foreign key to User (required)
- `created_at`: Session creation timestamp
- `expires_at`: Session expiration timestamp
- `is_active`: Session status

**Storage**: Cloudflare KV store for fast access
**TTL**: 30 days, auto-cleanup

## Relationships Summary

```
User (1) ─── (∞) Log
User (1) ─── (∞) UserTagProgress  
User (1) ─── (∞) Tag (created_by)
User (1) ─── (∞) Session

Tag (1) ─── (∞) Tag (parent-child hierarchy)
Tag (1) ─── (∞) LogTagAssociation
Tag (1) ─── (∞) UserTagProgress

Log (∞) ─── (1) User
Log (1) ─── (∞) LogTagAssociation

LogTagAssociation (∞) ─── (1) Log
LogTagAssociation (∞) ─── (1) Tag

UserTagProgress (∞) ─── (1) User
UserTagProgress (∞) ─── (1) Tag (content_tag)
```

## Database Schema (SQLite/D1)

```sql
-- Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    twitter_id TEXT UNIQUE NOT NULL,
    twitter_username TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tags table (unified tagging system)
CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK (LENGTH(name) <= 200),
    description TEXT,
    metadata TEXT, -- JSON for flexible data storage
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Tag Association table (tag-to-tag relationships)
CREATE TABLE tag_associations (
    id TEXT PRIMARY KEY,
    tag_id_1 TEXT NOT NULL,
    tag_id_2 TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tag_id_1) REFERENCES tags(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id_2) REFERENCES tags(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    CHECK (tag_id_1 != tag_id_2),
    UNIQUE(tag_id_1, tag_id_2)
);

-- Logs table
CREATE TABLE logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT CHECK (LENGTH(title) <= 200),
    content_md TEXT NOT NULL CHECK (LENGTH(content_md) <= 10000),
    is_public BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Log Tag Association table (many-to-many)
CREATE TABLE log_tag_associations (
    id TEXT PRIMARY KEY,
    log_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (log_id) REFERENCES logs(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(log_id, tag_id)
);

-- User Tag Progress table
CREATE TABLE user_tag_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    content_tag_id TEXT NOT NULL,
    current_episode_number INTEGER DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('watching', 'completed', 'dropped', 'on_hold', 'plan_to_watch')),
    started_at DATETIME,
    completed_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (content_tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(user_id, content_tag_id)
);

-- Initial Tags (seeded data)
INSERT INTO tags (id, name, description, metadata, created_by) VALUES
('tag_anime', 'Anime', 'Japanese animated series and films', '{"supports_episodes": true}', 'system'),
('tag_manga', 'Manga', 'Japanese comics and graphic novels', '{"supports_episodes": true}', 'system'),
('tag_game', 'Game', 'Video games and interactive entertainment', '{"supports_episodes": false}', 'system'),
('tag_movie', 'Movie', 'Films and motion pictures', '{"supports_episodes": false}', 'system'),
('tag_book', 'Book', 'Books, novels, and literature', '{"supports_episodes": true}', 'system'),
('tag_music', 'Music', 'Music albums, songs, and audio content', '{"supports_episodes": true}', 'system'),
('tag_theater', 'Theater', 'Stage performances and live entertainment', '{"supports_episodes": false}', 'system'),
('tag_figure', 'Figure', 'Collectible figures and statues', '{"supports_episodes": false}', 'system'),
('tag_model', 'Model Kit', 'Model kits and building sets', '{"supports_episodes": false}', 'system'),
('tag_merchandise', 'Merchandise', 'General merchandise and collectibles', '{"supports_episodes": false}', 'system');

-- Indexes for performance
CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_public ON logs(is_public);
CREATE INDEX idx_logs_created_at ON logs(created_at);
CREATE INDEX idx_log_tag_associations_log_id ON log_tag_associations(log_id);
CREATE INDEX idx_log_tag_associations_tag_id ON log_tag_associations(tag_id);

CREATE INDEX idx_tags_created_by ON tags(created_by);
CREATE INDEX idx_user_tag_progress_user_id ON user_tag_progress(user_id);
CREATE INDEX idx_user_tag_progress_tag_id ON user_tag_progress(content_tag_id);
CREATE INDEX idx_tag_associations_tag1 ON tag_associations(tag_id_1);
CREATE INDEX idx_tag_associations_tag2 ON tag_associations(tag_id_2);




```

## State Transitions

### Log Privacy States
- `private` → `public`: User chooses to share log
- `public` → `private`: User makes log private again
- No restrictions on transitions

### Tag Progress States
- `plan_to_watch` → `watching`: User starts consuming content tag
- `watching` → `completed`: User finishes content tag
- `watching` → `dropped`: User stops consuming content tag
- `watching` → `on_hold`: User pauses consumption
- `on_hold` → `watching`: User resumes consumption
- `on_hold` → `dropped`: User abandons content tag
- `dropped` → `watching`: User resumes dropped content tag
- `completed` → `watching`: User rewatches/rereads content tag

### Session States
- `active` → `expired`: Automatic expiration after TTL
- `active` → `revoked`: Manual logout or security action