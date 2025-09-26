# Error Handling Documentation

## Overview

The Shumilog API implements comprehensive error handling with standardized HTTP status codes, consistent error response formats, and detailed error messages to help developers integrate with the API effectively.

## Error Response Format

All API errors follow a consistent JSON response format:

```json
{
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context about the error",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Response Fields

- **error** (string, required): Human-readable error message
- **code** (string, optional): Machine-readable error code for programmatic handling
- **details** (object, optional): Additional context and debugging information

## HTTP Status Codes

### 2xx Success Codes

| Code | Description | Usage |
|------|-------------|-------|
| 200 | OK | Successful GET, PUT, DELETE operations |
| 201 | Created | Successful POST operations that create resources |

### 4xx Client Error Codes

| Code | Description | Common Causes | Example Response |
|------|-------------|---------------|------------------|
| 400 | Bad Request | Invalid request body, missing required fields, malformed data | `{"error": "Title is required"}` |
| 401 | Unauthorized | Missing or invalid authentication token | `{"error": "Not authenticated"}` |
| 403 | Forbidden | Valid authentication but insufficient permissions | `{"error": "You do not have permission to delete this resource"}` |
| 404 | Not Found | Resource does not exist or has been deleted | `{"error": "Log not found"}` |
| 409 | Conflict | Resource already exists or conflict with current state | `{"error": "Tag name already exists"}` |
| 422 | Unprocessable Entity | Request is well-formed but contains semantic errors | `{"error": "Content exceeds maximum length"}` |
| 429 | Too Many Requests | Rate limiting exceeded | `{"error": "Rate limit exceeded. Try again in 60 seconds"}` |

### 5xx Server Error Codes

| Code | Description | Common Causes | Example Response |
|------|-------------|---------------|------------------|
| 500 | Internal Server Error | Unexpected server errors, database connection issues | `{"error": "Internal server error"}` |
| 502 | Bad Gateway | External service (Twitter API) unavailable | `{"error": "Authentication service temporarily unavailable"}` |
| 503 | Service Unavailable | Server maintenance or overload | `{"error": "Service temporarily unavailable"}` |
| 504 | Gateway Timeout | External service timeout | `{"error": "Request timeout"}` |

## Detailed Error Scenarios

### Authentication Errors

#### 401 Unauthorized - No Authentication Token

**Trigger**: Making requests to protected endpoints without a session token

```http
GET /api/users/me
```

**Response**:
```json
{
  "error": "Not authenticated",
  "code": "AUTH_REQUIRED"
}
```

#### 401 Unauthorized - Invalid Session Token

**Trigger**: Using an expired or invalid session token

```http
GET /api/users/me
Cookie: session_token=invalid_token
```

**Response**:
```json
{
  "error": "Invalid or expired session",
  "code": "AUTH_INVALID"
}
```

#### 403 Forbidden - Insufficient Permissions

**Trigger**: Attempting to access or modify resources owned by other users

```http
DELETE /api/logs/other-user-log-id
Cookie: session_token=valid_token
```

**Response**:
```json
{
  "error": "You do not have permission to delete this resource",
  "code": "FORBIDDEN"
}
```

### Validation Errors

#### 400 Bad Request - Missing Required Fields

**Trigger**: Creating resources without required fields

```http
POST /api/logs
Content-Type: application/json
Cookie: session_token=valid_token

{
  "content_md": "# Content without title"
}
```

**Response**:
```json
{
  "error": "Title is required",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "title",
    "message": "Title is required and cannot be empty"
  }
}
```

#### 422 Unprocessable Entity - Data Validation

**Trigger**: Providing data that fails validation rules

```http
POST /api/tags
Content-Type: application/json
Cookie: session_token=valid_token

{
  "name": "",
  "description": "A" * 1001
}
```

**Response**:
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "errors": [
      {
        "field": "name",
        "message": "Name cannot be empty"
      },
      {
        "field": "description", 
        "message": "Description cannot exceed 1000 characters"
      }
    ]
  }
}
```

### Resource Errors

#### 404 Not Found - Resource Does Not Exist

**Trigger**: Accessing non-existent resources

```http
GET /api/logs/non-existent-id
Cookie: session_token=valid_token
```

**Response**:
```json
{
  "error": "Log not found",
  "code": "RESOURCE_NOT_FOUND"
}
```

#### 409 Conflict - Resource Already Exists

**Trigger**: Creating resources that would violate uniqueness constraints

```http
POST /api/tags
Content-Type: application/json
Cookie: session_token=valid_token

{
  "name": "Existing Tag Name",
  "description": "Description"
}
```

**Response**:
```json
{
  "error": "Tag name already exists",
  "code": "RESOURCE_CONFLICT",
  "details": {
    "field": "name",
    "existing_id": "tag_existing_123"
  }
}
```

### Rate Limiting Errors

#### 429 Too Many Requests

**Trigger**: Exceeding API rate limits

```http
POST /api/logs
Content-Type: application/json
Cookie: session_token=valid_token

{
  "title": "Rapid Request",
  "content_md": "# Too many requests"
}
```

**Response**:
```json
{
  "error": "Rate limit exceeded. Try again in 60 seconds",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "retry_after": 60,
    "limit": 100,
    "window": "1 hour"
  }
}
```

### External Service Errors

#### 502 Bad Gateway - Twitter API Issues

**Trigger**: Twitter OAuth service failures

```http
POST /api/auth/callback
Content-Type: application/json

{
  "code": "auth_code",
  "state": "oauth_state"
}
```

**Response**:
```json
{
  "error": "Authentication service temporarily unavailable",
  "code": "EXTERNAL_SERVICE_ERROR",
  "details": {
    "service": "twitter_oauth",
    "retry_suggested": true
  }
}
```

## Error Handling Patterns

### Client-Side Error Handling

```javascript
async function createLog(logData) {
  try {
    const response = await fetch('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for session
      body: JSON.stringify(logData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      switch (response.status) {
        case 401:
          // Redirect to login
          window.location.href = '/login';
          break;
        case 400:
        case 422:
          // Show validation errors to user
          displayValidationErrors(errorData.details?.errors || [errorData]);
          break;
        case 429:
          // Show rate limit message with retry time
          const retryAfter = errorData.details?.retry_after || 60;
          showRateLimitMessage(retryAfter);
          break;
        default:
          // Show generic error message
          showErrorMessage(errorData.error || 'An unexpected error occurred');
      }
      
      throw new Error(errorData.error);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
```

### Retry Logic

```javascript
async function apiCallWithRetry(apiCall, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      const isRetryable = error.status >= 500 || error.status === 429;
      
      if (attempt === maxRetries || !isRetryable) {
        throw error;
      }
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## Logging and Monitoring

### Error Logging Format

All errors are logged with structured data for monitoring and debugging:

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "error",
  "message": "Database connection failed",
  "error": {
    "code": "DB_CONNECTION_ERROR",
    "stack": "Error stack trace...",
    "context": {
      "user_id": "user_123",
      "request_id": "req_456",
      "endpoint": "/api/logs",
      "method": "POST"
    }
  }
}
```

### Monitoring Metrics

Key error metrics to monitor:

- **Error Rate**: Percentage of requests resulting in 4xx/5xx errors
- **Error Distribution**: Breakdown of error types and frequencies
- **Response Time**: P95/P99 response times including error responses
- **Authentication Errors**: Failed authentication attempts and patterns
- **External Service Errors**: Failures from Twitter OAuth and other external services

### Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error Rate | > 5% | > 10% |
| 5xx Error Rate | > 1% | > 5% |
| Authentication Failure Rate | > 10% | > 25% |
| Average Response Time | > 500ms | > 1000ms |

## Error Prevention

### Input Validation

- **Client-side validation**: Immediate feedback for common validation errors
- **Schema validation**: Structured validation using JSON schemas
- **Sanitization**: Input sanitization to prevent injection attacks
- **Rate limiting**: Prevent abuse and resource exhaustion

### Error Recovery

- **Graceful degradation**: Continue serving public content when authentication fails
- **Fallback mechanisms**: Alternative data sources when primary services fail
- **Caching**: Serve cached content when database connections fail
- **Circuit breakers**: Prevent cascading failures from external services

## Development Guidelines

### Error Message Best Practices

1. **Be specific**: Include relevant details about what went wrong
2. **Be actionable**: Tell users what they can do to fix the issue
3. **Be consistent**: Use standardized error codes and message formats
4. **Be secure**: Don't expose sensitive system information in error messages

### Testing Error Scenarios

Ensure comprehensive error scenario testing:

```javascript
// Test authentication errors
it('should return 401 for unauthenticated requests', async () => {
  const response = await app.request('/api/users/me');
  expect(response.status).toBe(401);
  
  const error = await response.json();
  expect(error.error).toBe('Not authenticated');
  expect(error.code).toBe('AUTH_REQUIRED');
});

// Test validation errors
it('should return 400 for missing required fields', async () => {
  const response = await app.request('/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content_md: 'Content without title' })
  });
  
  expect(response.status).toBe(400);
  
  const error = await response.json();
  expect(error.error).toContain('Title is required');
});
```

This comprehensive error handling approach ensures reliable API behavior, clear communication with client applications, and effective debugging and monitoring capabilities.