# Error Codes Reference

## Authentication & Authorization Errors

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `AUTH_REQUIRED` | 401 | No authentication token provided | Include session cookie in request |
| `AUTH_INVALID` | 401 | Invalid or expired session token | Re-authenticate via Twitter OAuth |
| `AUTH_EXPIRED` | 401 | Session has expired | Re-authenticate via Twitter OAuth |
| `FORBIDDEN` | 403 | User lacks permission for this action | Ensure user owns the resource or has proper permissions |
| `OAUTH_STATE_MISMATCH` | 400 | OAuth state parameter doesn't match | Start new OAuth flow |
| `OAUTH_CODE_INVALID` | 400 | Invalid OAuth authorization code | Retry OAuth flow |
| `TWITTER_API_ERROR` | 502 | Twitter API service error | Retry after some time |

## Validation Errors

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `VALIDATION_ERROR` | 400 | Request data failed validation rules | Check error details for specific field requirements |
| `MISSING_REQUIRED_FIELD` | 400 | Required field is missing | Include all required fields in request |
| `INVALID_FIELD_FORMAT` | 400 | Field format is incorrect | Use correct data type and format |
| `FIELD_TOO_LONG` | 422 | Field exceeds maximum length | Reduce field length to within limits |
| `FIELD_TOO_SHORT` | 422 | Field is below minimum length | Increase field length to meet requirements |
| `INVALID_EMAIL_FORMAT` | 400 | Email address format is invalid | Use valid email format |
| `INVALID_URL_FORMAT` | 400 | URL format is invalid | Use valid URL format with protocol |
| `INVALID_DATE_FORMAT` | 400 | Date format is invalid | Use ISO 8601 date format |

## Resource Errors

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `RESOURCE_NOT_FOUND` | 404 | Requested resource does not exist | Verify resource ID and ensure it exists |
| `LOG_NOT_FOUND` | 404 | Log entry not found | Check log ID and user permissions |
| `TAG_NOT_FOUND` | 404 | Tag not found | Check tag ID and ensure it exists |
| `USER_NOT_FOUND` | 404 | User not found | Verify user ID |
| `ASSOCIATION_NOT_FOUND` | 404 | Tag association not found | Check association ID |
| `RESOURCE_CONFLICT` | 409 | Resource already exists | Use different name or update existing resource |
| `TAG_NAME_EXISTS` | 409 | Tag name already exists for user | Choose different tag name |
| `DUPLICATE_ASSOCIATION` | 409 | Tag already associated with log | Remove existing association first |

## Permission Errors

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions | Ensure user is authenticated and owns resource |
| `RESOURCE_OWNER_REQUIRED` | 403 | Only resource owner can perform this action | Authenticate as resource owner |
| `PRIVATE_RESOURCE_ACCESS` | 403 | Cannot access private resource | Authenticate as owner or make resource public |
| `ADMIN_REQUIRED` | 403 | Admin privileges required | Contact administrator |

## Rate Limiting Errors

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests in time window | Wait for rate limit window to reset |
| `DAILY_LIMIT_EXCEEDED` | 429 | Daily request limit exceeded | Wait until next day or upgrade plan |
| `CREATION_LIMIT_EXCEEDED` | 429 | Too many resources created | Wait before creating more resources |

## Data Errors

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `INVALID_JSON` | 400 | Request body is not valid JSON | Ensure request body is properly formatted JSON |
| `CONTENT_TYPE_REQUIRED` | 400 | Content-Type header required | Set Content-Type: application/json |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Unsupported Content-Type | Use application/json Content-Type |
| `REQUEST_TOO_LARGE` | 413 | Request body too large | Reduce request size |
| `INVALID_ID_FORMAT` | 400 | Resource ID format is invalid | Use valid resource ID format |
| `MARKDOWN_PARSE_ERROR` | 422 | Markdown content cannot be parsed | Fix markdown syntax errors |

## Database Errors

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `DATABASE_ERROR` | 500 | Database operation failed | Retry request, contact support if persistent |
| `DATABASE_CONNECTION_ERROR` | 503 | Cannot connect to database | Service temporarily unavailable, retry later |
| `DATABASE_TIMEOUT` | 504 | Database operation timed out | Retry with simpler query or contact support |
| `TRANSACTION_FAILED` | 500 | Database transaction failed | Retry request |
| `CONSTRAINT_VIOLATION` | 409 | Database constraint violated | Check for duplicate or invalid data |

## External Service Errors

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `EXTERNAL_SERVICE_ERROR` | 502 | External service unavailable | Retry later or use alternative method |
| `TWITTER_SERVICE_ERROR` | 502 | Twitter API service error | Retry authentication later |
| `EXTERNAL_SERVICE_TIMEOUT` | 504 | External service timeout | Retry request |
| `EXTERNAL_SERVICE_RATE_LIMITED` | 429 | External service rate limit | Wait before retrying |

## System Errors

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error | Contact support with request details |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable | Try again later |
| `CONFIGURATION_ERROR` | 500 | Server configuration error | Contact administrator |
| `DEPENDENCY_ERROR` | 502 | Required service dependency failed | Service issue, try again later |

## Usage Examples

### Handling Specific Error Codes

```javascript
async function handleApiResponse(response) {
  if (!response.ok) {
    const error = await response.json();
    
    switch (error.code) {
      case 'AUTH_REQUIRED':
      case 'AUTH_INVALID':
      case 'AUTH_EXPIRED':
        // Redirect to login
        redirectToLogin();
        break;
        
      case 'VALIDATION_ERROR':
      case 'MISSING_REQUIRED_FIELD':
        // Show field-specific errors
        showValidationErrors(error.details);
        break;
        
      case 'RESOURCE_NOT_FOUND':
      case 'LOG_NOT_FOUND':
      case 'TAG_NOT_FOUND':
        // Show not found message
        showNotFoundError(error.error);
        break;
        
      case 'RATE_LIMIT_EXCEEDED':
        // Show rate limit message with retry time
        const retryAfter = error.details?.retry_after || 60;
        showRateLimitMessage(retryAfter);
        break;
        
      case 'RESOURCE_CONFLICT':
      case 'TAG_NAME_EXISTS':
        // Show conflict resolution options
        showConflictResolution(error);
        break;
        
      default:
        // Generic error handling
        showGenericError(error.error);
    }
  }
}
```

### Error Code Patterns

- **Authentication codes**: Start with `AUTH_`
- **Validation codes**: Start with `VALIDATION_` or describe the specific validation issue
- **Resource codes**: Include resource type (e.g., `LOG_`, `TAG_`, `USER_`)
- **External service codes**: Include service name (e.g., `TWITTER_`)
- **System codes**: Describe the system component (e.g., `DATABASE_`)

### Custom Error Responses

For specific business logic errors, additional codes may be added following the established patterns:

```javascript
// Example: Custom business logic error
{
  "error": "Cannot delete tag that is associated with logs",
  "code": "TAG_HAS_ASSOCIATIONS",
  "details": {
    "tag_id": "tag_123",
    "associated_logs_count": 5,
    "suggestion": "Remove all associations before deleting tag"
  }
}
```