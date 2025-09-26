# Hobby Content Log API Documentation

This API provides endpoints for managing personal content logs with Twitter OAuth authentication.

## Base URL

- **Development**: `http://localhost:8787/api`
- **Production**: `https://shumilog.example.com/api`

## Authentication

All protected endpoints require authentication via session cookies obtained through Twitter OAuth.

### Authentication Flow

1. **Initiate OAuth**: `GET /auth/twitter`
2. **OAuth Callback**: `GET /auth/callback?code={code}&state={state}`
3. **Logout**: `POST /auth/logout`

#### Example: Initiate Twitter OAuth

```bash
curl -X GET "http://localhost:8787/auth/twitter"
```

**Response**: 302 redirect to Twitter OAuth

#### Example: Logout

```bash
curl -X POST "http://localhost:8787/auth/logout" \
  -b "session=your_session_token"
```

**Response**:
```json
{
  "message": "Logged out successfully"
}
```

## Users

### Get Current User Profile

Get the authenticated user's profile information.

**Endpoint**: `GET /users/me`  
**Authentication**: Required

#### Example Request

```bash
curl -X GET "http://localhost:8787/users/me" \
  -b "session=your_session_token"
```

#### Example Response

```json
{
  "id": "user-uuid",
  "twitter_username": "johndoe",
  "display_name": "John Doe",
  "avatar_url": "https://pbs.twimg.com/profile_images/...",
  "created_at": "2025-09-26T10:00:00.000Z"
}
```

## Tags

### List Tags

Get a paginated list of all tags.

**Endpoint**: `GET /tags`  
**Authentication**: Not required

#### Query Parameters

- `search` (optional): Filter tags by name
- `limit` (optional): Number of items per page (default: 20, max: 100)
- `offset` (optional): Number of items to skip (default: 0)

#### Example Request

```bash
curl -X GET "http://localhost:8787/tags?search=anime&limit=10&offset=0"
```

#### Example Response

```json
{
  "items": [
    {
      "id": "tag-uuid",
      "name": "Anime",
      "description": "Japanese animation",
      "metadata": {
        "category": "media"
      },
      "created_at": "2025-09-26T10:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0,
  "has_next": false,
  "has_prev": false
}
```

### Create Tag

Create a new tag.

**Endpoint**: `POST /tags`  
**Authentication**: Required

#### Request Body

```json
{
  "name": "Attack on Titan",
  "description": "Popular anime series",
  "metadata": {
    "year": 2013,
    "studio": "Studio WIT",
    "official_url": "https://attackontitan.com"
  }
}
```

#### Example Request

```bash
curl -X POST "http://localhost:8787/tags" \
  -H "Content-Type: application/json" \
  -b "session=your_session_token" \
  -d '{
    "name": "Attack on Titan",
    "description": "Popular anime series",
    "metadata": {
      "year": 2013,
      "studio": "Studio WIT"
    }
  }'
```

#### Example Response

```json
{
  "id": "new-tag-uuid",
  "name": "Attack on Titan",
  "description": "Popular anime series",
  "metadata": {
    "year": 2013,
    "studio": "Studio WIT"
  },
  "created_by": "user-uuid",
  "created_at": "2025-09-26T10:00:00.000Z",
  "updated_at": "2025-09-26T10:00:00.000Z"
}
```

### Get Tag Details

Get details for a specific tag.

**Endpoint**: `GET /tags/{tagId}`  
**Authentication**: Not required

#### Example Request

```bash
curl -X GET "http://localhost:8787/tags/tag-uuid"
```

#### Example Response

```json
{
  "id": "tag-uuid",
  "name": "Attack on Titan",
  "description": "Popular anime series",
  "metadata": {
    "year": 2013,
    "studio": "Studio WIT"
  },
  "created_at": "2025-09-26T10:00:00.000Z"
}
```

## Logs

### List Logs

Get a paginated list of public logs.

**Endpoint**: `GET /logs`  
**Authentication**: Not required

#### Query Parameters

- `tag_ids` (optional): Comma-separated list of tag IDs to filter by
- `user_id` (optional): Filter logs by user ID
- `limit` (optional): Number of items per page (default: 20, max: 100)
- `offset` (optional): Number of items to skip (default: 0)

#### Example Request

```bash
curl -X GET "http://localhost:8787/logs?tag_ids=tag1,tag2&limit=10"
```

#### Example Response

```json
{
  "items": [
    {
      "id": "log-uuid",
      "title": "Watched Attack on Titan S1E1",
      "content_md": "Amazing first episode! The animation quality is incredible.",
      "is_public": true,
      "created_at": "2025-09-26T10:00:00.000Z",
      "updated_at": "2025-09-26T10:00:00.000Z",
      "user": {
        "id": "user-uuid",
        "twitter_username": "johndoe",
        "display_name": "John Doe"
      },
      "associated_tags": [
        {
          "id": "tag-anime",
          "name": "Anime"
        },
        {
          "id": "tag-attack-on-titan",
          "name": "Attack on Titan"
        }
      ]
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0,
  "has_next": false,
  "has_prev": false
}
```

### Create Log

Create a new personal log entry.

**Endpoint**: `POST /logs`  
**Authentication**: Required

#### Request Body

```json
{
  "title": "Watched Attack on Titan S1E1",
  "content_md": "Amazing first episode! The animation quality is incredible.\n\n## Key Points\n- Great animation\n- Compelling story\n- Amazing soundtrack",
  "tag_ids": ["tag_anime", "tag_attack_on_titan"],
  "is_public": true
}
```

#### Example Request

```bash
curl -X POST "http://localhost:8787/logs" \
  -H "Content-Type: application/json" \
  -b "session=your_session_token" \
  -d '{
    "title": "Watched Attack on Titan S1E1",
    "content_md": "Amazing first episode!",
    "tag_ids": ["tag_anime", "tag_attack_on_titan"],
    "is_public": true
  }'
```

#### Example Response

```json
{
  "id": "new-log-uuid",
  "title": "Watched Attack on Titan S1E1",
  "content_md": "Amazing first episode!",
  "is_public": true,
  "created_at": "2025-09-26T10:00:00.000Z",
  "updated_at": "2025-09-26T10:00:00.000Z",
  "user": {
    "id": "user-uuid",
    "twitter_username": "johndoe",
    "display_name": "John Doe"
  },
  "associated_tags": [
    {
      "id": "tag_anime",
      "name": "Anime"
    }
  ]
}
```

### Get Log Details

Get details for a specific log.

**Endpoint**: `GET /logs/{logId}`  
**Authentication**: Not required for public logs

#### Example Request

```bash
curl -X GET "http://localhost:8787/logs/log-uuid"
```

#### Example Response

```json
{
  "id": "log-uuid",
  "title": "Watched Attack on Titan S1E1",
  "content_md": "Amazing first episode! The animation quality is incredible.",
  "is_public": true,
  "created_at": "2025-09-26T10:00:00.000Z",
  "updated_at": "2025-09-26T10:00:00.000Z",
  "user": {
    "id": "user-uuid",
    "twitter_username": "johndoe",
    "display_name": "John Doe",
    "avatar_url": "https://pbs.twimg.com/profile_images/..."
  },
  "associated_tags": [
    {
      "id": "tag_anime",
      "name": "Anime",
      "description": "Japanese animation"
    }
  ]
}
```

### Share Log to Twitter

Share a public log to Twitter.

**Endpoint**: `POST /logs/{logId}/share`  
**Authentication**: Required

#### Request Body

```json
{
  "message": "Just watched an amazing episode! Check out my thoughts:"
}
```

#### Example Request

```bash
curl -X POST "http://localhost:8787/logs/log-uuid/share" \
  -H "Content-Type: application/json" \
  -b "session=your_session_token" \
  -d '{
    "message": "Just watched an amazing episode!"
  }'
```

#### Example Response

```json
{
  "success": true,
  "tweet_id": "1234567890",
  "tweet_url": "https://twitter.com/johndoe/status/1234567890"
}
```

## Error Responses

All endpoints return consistent error responses:

### Authentication Error (401)

```json
{
  "error": "Not authenticated",
  "message": "Authentication required to access this resource"
}
```

### Validation Error (400)

```json
{
  "error": "Validation failed",
  "message": "tag_ids must be a non-empty array",
  "details": {
    "field": "tag_ids",
    "received": [],
    "expected": "array with at least 1 item"
  }
}
```

### Not Found Error (404)

```json
{
  "error": "Resource not found",
  "message": "Log not found"
}
```

### Server Error (500)

```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

## Rate Limits

- **Authentication endpoints**: 5 requests per minute per IP
- **API endpoints**: 100 requests per minute per authenticated user
- **Public endpoints**: 50 requests per minute per IP

## Response Headers

All responses include:

- `Content-Type: application/json`
- `X-RateLimit-Limit`: Rate limit for the endpoint
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit resets

## Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `204 No Content`: Resource deleted successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `502 Bad Gateway`: External service error (e.g., Twitter API)