# Database Migration API Contract

**Endpoint**: `/dev/migrate`  
**Method**: POST  
**Purpose**: Execute database migrations in development environment
**Environment**: Development only

## Request Schema

```typescript
{
  "action": "up" | "down" | "reset" | "status",
  "target_version"?: string, // optional, for specific version targeting
  "force"?: boolean, // optional, for forcing migrations
  "dry_run"?: boolean // optional, for preview without execution
}
```

## Response Schema

### Success Response (200 OK) - Status Action
```typescript
{
  "action": "status",
  "timestamp": string,
  "current_version": string | null,
  "pending_migrations": [
    {
      "version": string,
      "description": string,
      "filename": string
    }
  ],
  "applied_migrations": [
    {
      "version": string,
      "description": string,
      "applied_at": string, // ISO timestamp
      "filename": string
    }
  ]
}
```

### Success Response (200 OK) - Migration Actions
```typescript
{
  "action": "up" | "down" | "reset",
  "timestamp": string,
  "executed_migrations": [
    {
      "version": string,
      "description": string,
      "action": "applied" | "rolled_back",
      "execution_time": number // milliseconds
    }
  ],
  "final_version": string | null,
  "dry_run": boolean
}
```

### Error Response (400 Bad Request)
```typescript
{
  "error": "Invalid migration request",
  "details": string,
  "action": string,
  "timestamp": string
}
```

### Error Response (500 Internal Server Error)
```typescript
{
  "error": "Migration execution failed",
  "details": string,
  "failed_migration": {
    "version": string,
    "description": string,
    "error_message": string
  },
  "timestamp": string
}
```

## Validation Rules

- Only available in development environment
- Migration execution must complete within 30 seconds
- All migrations must have rollback capability
- Dry run must not modify database state
- Force flag requires explicit confirmation
- Target version must exist in migration files
- Database must be in consistent state after execution

## Test Scenarios

### Test: Migration Status Check
- **Given**: Database has applied and pending migrations
- **When**: POST /dev/migrate with action "status"
- **Then**: Response shows accurate migration state

### Test: Apply Pending Migrations
- **Given**: Database has pending migrations
- **When**: POST /dev/migrate with action "up"
- **Then**: All pending migrations are applied successfully

### Test: Rollback Migration
- **Given**: Database has applied migrations
- **When**: POST /dev/migrate with action "down"
- **Then**: Latest migration is rolled back successfully

### Test: Dry Run Preview  
- **Given**: Database has pending migrations
- **When**: POST /dev/migrate with dry_run: true
- **Then**: Migration plan is shown without database changes

### Test: Production Environment Block
- **Given**: Application is running in production mode
- **When**: POST /dev/migrate is called
- **Then**: Response status is 404 and endpoint is not available

### Test: Migration Failure Handling
- **Given**: Migration script contains SQL errors
- **When**: POST /dev/migrate with action "up" 
- **Then**: Response status is 500 and database remains in consistent state