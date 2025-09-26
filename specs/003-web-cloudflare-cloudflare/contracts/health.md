# Health Check API Contract

**Endpoint**: `/health`  
**Method**: GET  
**Purpose**: Verify application and database connectivity

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
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": string, // ISO 8601 timestamp
  "checks": {
    "database": {
      "status": "healthy" | "unhealthy",
      "response_time": number, // milliseconds
      "details": string
    },
    "application": {
      "status": "healthy" | "unhealthy", 
      "response_time": number, // milliseconds
      "version": string
    }
  },
  "environment": "development" | "production"
}
```

### Error Response (503 Service Unavailable)
```typescript
{
  "status": "unhealthy",
  "timestamp": string,
  "error": string,
  "checks": {
    // partial results of failed checks
  }
}
```

## Validation Rules

- Response must complete within 5 seconds
- Database check must verify D1 connectivity
- Application check must verify Workers runtime
- Status must be consistent across individual checks
- Response time must be measured and reported
- Environment must match actual deployment environment

## Test Scenarios

### Test: Basic Health Check
- **Given**: Application is running normally
- **When**: GET /health is called
- **Then**: Response status is 200 and overall status is "healthy"

### Test: Database Connection Failure
- **Given**: D1 database is unavailable
- **When**: GET /health is called  
- **Then**: Response status is 503 and database status is "unhealthy"

### Test: Performance Monitoring
- **Given**: Application is under normal load
- **When**: GET /health is called
- **Then**: Response times are recorded and within acceptable limits

### Test: Environment Verification
- **Given**: Application is deployed to specific environment
- **When**: GET /health is called
- **Then**: Environment field matches deployment target