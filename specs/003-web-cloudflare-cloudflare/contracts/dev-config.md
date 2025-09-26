# Development Configuration API Contract

**Endpoint**: `/dev/config`  
**Method**: GET  
**Purpose**: Expose configuration status for development environment
**Environment**: Development only

## Request Schema

```typescript
// No request body required
// Query parameters: none
// Headers: none required
```

## Response Schema

### Success Response (200 OK)
```typescript
{
  "environment": "development",
  "timestamp": string, // ISO 8601 timestamp
  "database": {
    "type": "d1-local" | "d1-remote",
    "status": "connected" | "disconnected",
    "migrations": {
      "current_version": string,
      "pending_count": number,
      "last_applied": string // ISO timestamp
    }
  },
  "wrangler": {
    "version": string,
    "dev_server": {
      "port": number,
      "hot_reload": boolean,
      "pid": number
    }
  },
  "bindings": {
    "d1_databases": string[], // binding names
    "kv_namespaces": string[], // binding names
    "secrets": string[] // secret names (values hidden)
  }
}
```

### Error Response (404 Not Found) - Production Environment
```typescript
{
  "error": "Development endpoints not available in production",
  "environment": "production"
}
```

### Error Response (500 Internal Server Error)
```typescript
{
  "error": "Configuration check failed",
  "details": string,
  "timestamp": string
}
```

## Validation Rules

- Only available in development environment
- Must verify all bindings are properly configured
- Migration status must be current and accurate
- Wrangler dev server information must be live
- Secrets listed by name only (values never exposed)
- Response must complete within 3 seconds

## Test Scenarios

### Test: Development Configuration Check
- **Given**: Application is running in development mode
- **When**: GET /dev/config is called
- **Then**: Response shows current configuration status

### Test: Production Environment Block
- **Given**: Application is running in production mode
- **When**: GET /dev/config is called
- **Then**: Response status is 404 and endpoint is not available

### Test: Migration Status Reporting
- **Given**: Database has pending migrations
- **When**: GET /dev/config is called
- **Then**: Pending migration count is accurate

### Test: Binding Verification
- **Given**: Wrangler configuration has specific bindings
- **When**: GET /dev/config is called
- **Then**: All configured bindings are listed and verified