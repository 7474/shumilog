# Data Model: Frontend

**Date**: 2025-09-28
**Spec**: [./spec.md](./spec.md)

This document defines the client-side data structures for the shumilog frontend application. These models will be used to represent the data received from the backend API.

## Core Entities

### Log

Represents a single log entry created by a user.

-   **Type**: `object`
-   **Properties**:
    -   `id`: `string` (UUID) - The unique identifier for the log.
    -   `content`: `string` - The main text content of the log.
    -   `createdAt`: `string` (ISO 8601 Date) - The timestamp when the log was created.
    -   `tags`: `Tag[]` - An array of tags associated with the log.

**Example**:

```json
{
    "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "content": "Today I learned about React Hooks.",
    "createdAt": "2025-09-28T10:00:00Z",
    "tags": [
        { "id": "tag-1", "name": "React" },
        { "id": "tag-2", "name": "WebDev" }
    ]
}
```

### Tag

Represents a category or label that can be associated with logs.

-   **Type**: `object`
-   **Properties**:
    -   `id`: `string` - The unique identifier for the tag.
    -   `name`: `string` - The name of the tag.

**Example**:

```json
{
    "id": "tag-1",
    "name": "React"
}
```

### User

Represents the currently authenticated user.

-   **Type**: `object`
-   **Properties**:
    -   `id`: `string` - The user's unique identifier.
    -   `username`: `string` - The user's Twitter handle.
    -   `displayName`: `string` - The user's display name on Twitter.
    -   `avatarUrl`: `string` - The URL of the user's profile picture.

**Example**:

```json
{
    "id": "user-123",
    "username": "shumilog_dev",
    "displayName": "Shumilog Dev",
    "avatarUrl": "https://example.com/avatar.png"
}
```
