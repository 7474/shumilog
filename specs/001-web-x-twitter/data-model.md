# Data Model: Hobby Content Review Logging Service

## Core Entities

### User
**Purpose**: Represents authenticated users from Twitter OAuth
**Attributes**:
- `id`: Primary key (UUID)
- `twitter_id`: Twitter user ID (unique, required)
- `twitter_username`: Twitter handle (required)
- `display_name`: User's display name from Twitter
- `avatar_url`: Twitter profile image URL
- `created_at`: Account creation timestamp
- `updated_at`: Last profile update timestamp
- `is_active`: Account status flag

**Relationships**:
- One-to-many with Review (user creates reviews)
- One-to-many with UserContentProgress (tracking content consumption)

**Validation Rules**:
- twitter_id must be unique and non-null
- twitter_username must be valid Twitter handle format
- display_name max 50 characters
- is_active defaults to true

### Content
**Purpose**: Represents media items (anime, manga, games, movies, books, music, theater)
**Attributes**:
- `id`: Primary key (UUID)
- `title`: Content title (required)
- `content_type`: Enum (anime, manga, game, movie, book, music, theater, figure, model, merchandise)
- `description`: Brief description
- `wikipedia_url`: Wikipedia page URL
- `official_url`: Official website URL
- `metadata`: JSON field for type-specific data (year, studio, author, etc.)
- `has_episodes`: Boolean flag for serialized content
- `episode_count`: Total episodes/chapters (if applicable)
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

**Relationships**:
- One-to-many with Review (content receives reviews)
- One-to-many with SubContent (episodes, chapters)
- One-to-many with UserContentProgress (user progress tracking)

**Validation Rules**:
- title required, max 200 characters
- content_type must be valid enum value
- wikipedia_url and official_url must be valid URLs if provided
- episode_count must be positive integer if has_episodes is true

### SubContent
**Purpose**: Represents episodes, chapters, or other sub-units of serialized content
**Attributes**:
- `id`: Primary key (UUID)
- `content_id`: Foreign key to Content (required)
- `number`: Episode/chapter number (required)
- `title`: Sub-content title
- `description`: Brief description
- `release_date`: Release date (if known)
- `created_at`: Record creation timestamp

**Relationships**:
- Many-to-one with Content (belongs to parent content)
- One-to-many with Review (can be reviewed individually)

**Validation Rules**:
- content_id must reference existing Content
- number must be positive integer
- title max 200 characters
- Unique constraint on (content_id, number)

### Review
**Purpose**: User-generated reviews and impressions
**Attributes**:
- `id`: Primary key (UUID)
- `user_id`: Foreign key to User (required)
- `content_id`: Foreign key to Content (required)
- `subcontent_id`: Foreign key to SubContent (optional)
- `title`: Review title
- `content_md`: Review content in Markdown (required)
- `content_html`: Rendered HTML (derived)
- `is_public`: Privacy flag (default false)
- `rating`: Optional 1-5 star rating
- `tags`: JSON array of user-defined tags
- `posted_to_twitter`: Boolean flag
- `twitter_post_id`: Twitter post ID if shared
- `created_at`: Review creation timestamp
- `updated_at`: Last edit timestamp

**Relationships**:
- Many-to-one with User (user creates review)
- Many-to-one with Content (review about content)
- Many-to-one with SubContent (optional, for episode-specific reviews)

**Validation Rules**:
- user_id and content_id required
- content_md required, max 10,000 characters
- title max 200 characters
- rating must be 1-5 if provided
- subcontent_id must belong to specified content_id if provided

### UserContentProgress
**Purpose**: Tracks user's progress through serialized content
**Attributes**:
- `id`: Primary key (UUID)
- `user_id`: Foreign key to User (required)
- `content_id`: Foreign key to Content (required)
- `current_episode`: Last consumed episode/chapter number
- `status`: Enum (watching, completed, dropped, on_hold, plan_to_watch)
- `started_at`: When user started consuming content
- `completed_at`: When user completed content (if applicable)
- `updated_at`: Last progress update

**Relationships**:
- Many-to-one with User (user's progress)
- Many-to-one with Content (progress on content)

**Validation Rules**:
- Unique constraint on (user_id, content_id)
- current_episode must be <= content.episode_count
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
User (1) ─── (∞) UserContentProgress
User (1) ─── (∞) Session

Content (1) ─── (∞) Review
Content (1) ─── (∞) SubContent
Content (1) ─── (∞) UserContentProgress

SubContent (∞) ─── (1) Content
SubContent (1) ─── (∞) Review

Review (∞) ─── (1) User
Review (∞) ─── (1) Content
Review (∞) ─── (1) SubContent [optional]
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

-- Content table
CREATE TABLE content (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('anime', 'manga', 'game', 'movie', 'book', 'music', 'theater', 'figure', 'model', 'merchandise')),
    description TEXT,
    wikipedia_url TEXT,
    official_url TEXT,
    metadata TEXT, -- JSON
    has_episodes BOOLEAN DEFAULT 0,
    episode_count INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- SubContent table
CREATE TABLE subcontent (
    id TEXT PRIMARY KEY,
    content_id TEXT NOT NULL,
    number INTEGER NOT NULL,
    title TEXT,
    description TEXT,
    release_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
    UNIQUE(content_id, number)
);

-- Reviews table
CREATE TABLE reviews (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    content_id TEXT NOT NULL,
    subcontent_id TEXT,
    title TEXT,
    content_md TEXT NOT NULL,
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

-- User content progress table
CREATE TABLE user_content_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    content_id TEXT NOT NULL,
    current_episode INTEGER DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('watching', 'completed', 'dropped', 'on_hold', 'plan_to_watch')),
    started_at DATETIME,
    completed_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
    UNIQUE(user_id, content_id)
);

-- Indexes for performance
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_content_id ON reviews(content_id);
CREATE INDEX idx_reviews_public ON reviews(is_public);
CREATE INDEX idx_reviews_created_at ON reviews(created_at);
CREATE INDEX idx_content_type ON content(content_type);
CREATE INDEX idx_subcontent_content_id ON subcontent(content_id);
CREATE INDEX idx_progress_user_id ON user_content_progress(user_id);
```

## State Transitions

### Review Privacy States
- `private` → `public`: User chooses to share review
- `public` → `private`: User makes review private again
- No restrictions on transitions

### Content Progress States
- `plan_to_watch` → `watching`: User starts consuming content
- `watching` → `completed`: User finishes content
- `watching` → `dropped`: User stops consuming content
- `watching` → `on_hold`: User pauses consumption
- `on_hold` → `watching`: User resumes consumption
- `on_hold` → `dropped`: User abandons content
- `dropped` → `watching`: User resumes dropped content
- `completed` → `watching`: User rewatches/rereads content

### Session States
- `active` → `expired`: Automatic expiration after TTL
- `active` → `revoked`: Manual logout or security action