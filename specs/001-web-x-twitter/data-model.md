# Data Model: Hobby Content Review Logging Service

## Core Entities

### User
**Purpose**: Represents authenticated users from Twitter OAuth
**Attributes**:
- `id`: Primary key (-- Reviews table
CREATE TABLE reviews (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT CHECK (LENGTH(title) <= 200),
    content_md TEXT NOT NULL CHECK (LENGTH(content_md) <= 10000),
    content_html TEXT NOT NULL,
    is_public BOOLEAN DEFAULT 0,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    user_tags TEXT, -- JSON array for user-defined tags
    posted_to_twitter BOOLEAN DEFAULT 0,
    twitter_post_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Review Tag Association table (many-to-many)
CREATE TABLE review_tag_associations (
    id TEXT PRIMARY KEY,
    review_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(review_id, tag_id)
);: Twitter user ID (unique, required)
- `twitter_username`: Twitter handle (required)
- `display_name`: User's display name from Twitter
- `avatar_url`: Twitter profile image URL
- `created_at`: Account creation timestamp
- `updated_at`: Last profile update timestamp
- `is_active`: Account status flag

**Relationships**:
- One-to-many with Review (user creates reviews)
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
- `title`: Tag title (required)
- `description`: Brief description
- `metadata`: JSON field for flexible data storage
- `created_by`: Foreign key to User who created this tag
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

**Relationships**:
- Many-to-many with Tag through TagAssociation (tag-to-tag relationships)
- Many-to-many with Review through ReviewTagAssociation
- One-to-many with UserTagProgress (user progress tracking)
- Many-to-one with User (created by user)

**Validation Rules**:
- title required, max 200 characters
- created_by must reference existing User

### Review
**Purpose**: User-generated reviews and impressions associated with multiple tags
**Attributes**:
- `id`: Primary key (UUID)
- `user_id`: Foreign key to User (required)
- `title`: Review title
- `content_md`: Review content in Markdown (required)
- `content_html`: Rendered HTML from markdown
- `rating`: Optional 1-5 star rating
- `user_tags`: JSON array of user-defined tags for categorization
- `is_public`: Privacy flag (default false)
- `posted_to_twitter`: Whether review was shared to Twitter
- `twitter_post_id`: Twitter post ID if shared
- `created_at`: Review creation timestamp
- `updated_at`: Last edit timestamp

**Relationships**:
- Many-to-one with User (user creates review)
- Many-to-many with Tag through ReviewTagAssociation (review associated with multiple tags)

**Validation Rules**:
- user_id must reference existing User
- content_md required, max 10000 characters
- rating must be 1-5 if provided
- title max 200 characters
- Must have at least one associated tag through ReviewTagAssociation

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

### ReviewTagAssociation
**Purpose**: Links reviews with multiple associated tags
**Attributes**:
- `id`: Primary key (UUID)
- `review_id`: Foreign key to Review (required)
- `tag_id`: Foreign key to Tag (required)
- `created_at`: Association creation timestamp

**Relationships**:
- Many-to-one with Review (association belongs to review)
- Many-to-one with Tag (association references tag)

**Validation Rules**:
- review_id must reference existing Review
- tag_id must reference existing Tag
- Unique constraint on (review_id, tag_id)

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
User (1) ─── (∞) Review
User (1) ─── (∞) UserTagProgress  
User (1) ─── (∞) Tag (created_by)
User (1) ─── (∞) Session

Tag (1) ─── (∞) Tag (parent-child hierarchy)
Tag (1) ─── (∞) ReviewTagAssociation
Tag (1) ─── (∞) UserTagProgress

Review (∞) ─── (1) User
Review (1) ─── (∞) ReviewTagAssociation

ReviewTagAssociation (∞) ─── (1) Review
ReviewTagAssociation (∞) ─── (1) Tag

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
    title TEXT NOT NULL CHECK (LENGTH(title) <= 200),
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

-- Reviews table
CREATE TABLE reviews (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    content_tag_id TEXT NOT NULL,
    episode_tag_id TEXT,
    title TEXT CHECK (LENGTH(title) <= 200),
    content_md TEXT NOT NULL CHECK (LENGTH(content_md) <= 10000),
    content_html TEXT NOT NULL,
    is_public BOOLEAN DEFAULT 0,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    tags TEXT, -- JSON array
    posted_to_twitter BOOLEAN DEFAULT 0,
    twitter_post_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
    FOREIGN KEY (subcontent_id) REFERENCES subcontent(id) ON DELETE SET NULL
);

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (content_tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    FOREIGN KEY (episode_tag_id) REFERENCES tags(id) ON DELETE CASCADE
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
INSERT INTO tags (id, title, description, metadata, created_by) VALUES
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
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_public ON reviews(is_public);
CREATE INDEX idx_reviews_created_at ON reviews(created_at);
CREATE INDEX idx_review_tag_associations_review_id ON review_tag_associations(review_id);
CREATE INDEX idx_review_tag_associations_tag_id ON review_tag_associations(tag_id);

CREATE INDEX idx_tags_parent_id ON tags(parent_id);
CREATE INDEX idx_tags_created_by ON tags(created_by);
CREATE INDEX idx_user_tag_progress_user_id ON user_tag_progress(user_id);
CREATE INDEX idx_user_tag_progress_tag_id ON user_tag_progress(content_tag_id);

-- Insert default content types
INSERT INTO content_types (id, name, display_name, category, supports_episodes, description) VALUES
('ct_anime', 'anime', 'Anime', 'media', 1, 'Japanese animated series and movies'),
('ct_manga', 'manga', 'Manga', 'media', 1, 'Japanese comics and graphic novels'),
('ct_game', 'game', 'Game', 'media', 0, 'Video games and interactive entertainment'),
('ct_movie', 'movie', 'Movie', 'media', 0, 'Films and motion pictures'),
('ct_book', 'book', 'Book', 'media', 1, 'Books, novels, and literature'),
('ct_music', 'music', 'Music', 'media', 1, 'Music albums, songs, and audio content'),
('ct_theater', 'theater', 'Theater', 'media', 0, 'Stage performances and live entertainment'),
('ct_figure', 'figure', 'Figure', 'product', 0, 'Collectible figures and statues'),
('ct_model', 'model', 'Model Kit', 'product', 0, 'Model kits and building sets'),
('ct_merchandise', 'merchandise', 'Merchandise', 'product', 0, 'General merchandise and collectibles');

-- Indexes for performance
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_content_id ON reviews(content_id);
CREATE INDEX idx_reviews_public ON reviews(is_public);
CREATE INDEX idx_reviews_created_at ON reviews(created_at);
CREATE INDEX idx_content_type_id ON content(content_type_id);
CREATE INDEX idx_content_types_name ON content_types(name);
CREATE INDEX idx_content_types_category ON content_types(category);
CREATE INDEX idx_content_types_active ON content_types(is_active);
CREATE INDEX idx_subcontent_content_id ON subcontent(content_id);
CREATE INDEX idx_progress_user_id ON user_content_progress(user_id);
```

## State Transitions

### Review Privacy States
- `private` → `public`: User chooses to share review
- `public` → `private`: User makes review private again
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