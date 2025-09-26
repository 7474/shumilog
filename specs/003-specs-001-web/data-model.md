# Data Model Blueprint

Focus: Preserve only the entities needed to satisfy the Hobby Content Log API while keeping Cloudflare D1 schema minimal.

## users
- **Primary Key**: `id` (TEXT, ULID)
- **Fields**:
  - `twitter_username` (TEXT, nullable) — optional display handle.
  - `display_name` (TEXT) — shown in log metadata.
  - `avatar_url` (TEXT, nullable) — used by frontend list views.
  - `created_at` (TIMESTAMP) — default `CURRENT_TIMESTAMP`.
- **Indexes**:
  - `idx_users_twitter_username` on `twitter_username` for quick lookup.
- **Notes**: Password/auth handled via session table + Twitter OAuth callback; no password columns retained.

## sessions
- **Primary Key**: `token` (TEXT)
- **Fields**:
  - `user_id` (TEXT, FK → `users.id`)
  - `created_at` (TIMESTAMP)
  - `expires_at` (TIMESTAMP)
- **Indexes**:
  - `idx_sessions_user_id` for revocation sweeps.
- **Notes**: Minimal table to back cookie-based sessionAuth in Workers KV-like D1.

## tags
- **Primary Key**: `id` (TEXT, ULID)
- **Fields**:
  - `name` (TEXT, unique)
  - `description` (TEXT, nullable)
  - `metadata` (JSON, nullable) — stored as TEXT JSON blob for flexibility.
  - `created_by` (TEXT, FK → `users.id`)
  - `created_at` (TIMESTAMP)
  - `updated_at` (TIMESTAMP)
- **Indexes**:
  - `idx_tags_name` unique.
- **Notes**: Metadata kept generic to avoid schema churn; ensure triggers or app layer update timestamps.

## tag_associations
- **Primary Key**: composite (`tag_id`, `associated_tag_id`)
- **Fields**:
  - `tag_id` (TEXT, FK → `tags.id`)
  - `associated_tag_id` (TEXT, FK → `tags.id`)
  - `created_at` (TIMESTAMP)
- **Indexes**:
  - `idx_tag_assoc_associated_tag_id` for reverse lookups.
- **Notes**: Enforce `tag_id != associated_tag_id` via CHECK constraint in SQL migration.

## logs
- **Primary Key**: `id` (TEXT, ULID)
- **Fields**:
  - `user_id` (TEXT, FK → `users.id`)
  - `title` (TEXT, nullable, length ≤ 200)
  - `content_md` (TEXT)
  - `is_public` (INTEGER BOOLEAN)
  - `created_at` (TIMESTAMP)
  - `updated_at` (TIMESTAMP)
- **Indexes**:
  - `idx_logs_user_id` for profile listing.
  - `idx_logs_is_public` for public feed queries.
- **Notes**: Keep markdown content raw; Worker response layer handles rendering to HTML if needed.

## log_tag_associations
- **Primary Key**: composite (`log_id`, `tag_id`)
- **Fields**:
  - `log_id` (TEXT, FK → `logs.id`)
  - `tag_id` (TEXT, FK → `tags.id`)
- **Indexes**:
  - `idx_log_tag_assoc_tag_id` for tag→log browsing.
- **Notes**: No extra fields to keep payload lean; ordering handled at query level.

## Derived Views / Helpers
- **recent_public_logs** (virtual view): Select top N public logs with author + tag joins for `/logs` endpoint.
- **tag_detail_view**: Aggregated row for `/tags/{id}` combining counts, associated tags, and recent logs.

## Data Lifecycle
- **Creation**: Via API endpoints with server-side ULID generation.
- **Updates**: Title/content/is_public for logs; name/description/metadata for tags.
- **Deletion**: Soft delete not required—rows removed physically to match contract semantics (204 responses).
- **Seeds**: Provide fixture entries for one user, two tags, two logs, plus association coverage to support quickstart validations.
