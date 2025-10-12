# Backend Testing Status

## AI-Enhanced Tag Support

### Overview
This backend now includes **AI-powered tag support** using Cloudflare Workers AI to automatically generate tag editing support content based on Wikipedia information.

### Features
- **AI Model**: Uses `@cf/openai/gpt-oss-120b` (GPT OSS 120B)
- **Content Generation**:
  - One-line tag summary (targeting ~50 characters)
  - Related tags extracted as hashtags
  - Subsections for series/episode information
- **AI Content Identification**: Wrapped with HTML comments `<!-- AI生成コンテンツ開始/終了 -->`
- **Attribution**: Includes Wikipedia source link for all generated content

### API Usage
```bash
# Request AI-enhanced tag support
POST /api/support/tags
Content-Type: application/json
Cookie: session=<your-session-token>

{
  "tag_name": "進撃の巨人",
  "support_type": "ai_enhanced"
}
```

### Testing
- **Unit Tests**: `tests/unit/AiService.test.ts` - Tests AI service logic with mocks
- **Integration Tests**: `tests/integration/tag-support-ai.test.ts` - Tests API endpoint behavior

### Implementation Details
- **AiService**: Wrapper class for Cloudflare Workers AI (`src/services/AiService.ts`)
- **TagService Integration**: AI support integrated into existing TagService
- **Wrangler Configuration**: AI bindings configured for all environments in `wrangler.toml`

### Limitations
- **Local Development**: AI features require Cloudflare environment (not available in `wrangler dev --local`)
- **Rate Limits**: Subject to Cloudflare Workers AI usage limits
- **Model Constraints**: Limited by GPT OSS 120B model capabilities

## Current Test Suite Status

### ✅ All Tests (CI Enabled)
- **Command**: `npm test`
- **Status**: All tests passing - 282 passed, 0 skipped
- **Coverage**: Contract tests, unit tests, and integration tests
- **CI**: Enabled in GitHub Actions running full test suite

### ✅ Contract Tests with OpenAPI Validation
- **Command**: `npm run test:contract`
- **Status**: All passing
- **Coverage**: API endpoint contracts, authentication flows, validation
- **OpenAPI Validation**: Automated validation against `/api/v1/openapi.yaml` specification

### ✅ Integration Tests
- **Status**: All passing
- **Approach**: Use `createTestSession()` helper for authenticated test scenarios

## OpenAPI Specification Validation

The backend now includes **automated OpenAPI specification validation** to ensure that API implementations match the defined specification in `/api/v1/openapi.yaml`.

### How It Works

Contract tests automatically validate:
- ✅ Response status codes match the specification
- ✅ Response body structure matches defined schemas
- ✅ Required fields are present
- ✅ Field types are correct
- ✅ Enum values are valid

### Using OpenAPI Validation in Tests

To add OpenAPI validation to a contract test:

```typescript
import { toOpenApiResponse } from '../helpers/openapi-setup';

it('validates response against OpenAPI spec', async () => {
  const response = await app.request('/users/me', {
    method: 'GET',
    headers: { Cookie: `session=${sessionToken}` }
  });

  // Convert Hono response to OpenAPI-compatible format and validate
  const openApiResponse = await toOpenApiResponse(response, '/users/me', 'GET');
  expect(openApiResponse).toSatisfyApiSpec();
  
  // Continue with additional assertions...
});
```

### Maintaining the API Specification

**Important**: The OpenAPI specification (`/api/v1/openapi.yaml`) is the **source of truth** for the API.

When making API changes:
1. **Update the specification first** - Modify `/api/v1/openapi.yaml`
2. **Update contract tests** - Ensure tests match the new specification
3. **Implement the changes** - Update the actual API implementation
4. **Verify** - Run `npm run test:contract` to ensure implementation matches spec

This workflow ensures:
- ✅ API specification is always up-to-date
- ✅ Implementation matches specification
- ✅ Breaking changes are caught early
- ✅ Documentation is automatically accurate


## Test Coverage

### Working
- Contract tests with authentication ✅
- Log endpoint authentication ✅  
- Basic session management ✅
- Unit tests ✅
- Integration tests with test session helpers ✅

All tests use the `createTestSession()` helper for authenticated scenarios, avoiding the need for complex OAuth flow simulation in tests.

## Running Tests

```bash
# Run all tests (recommended - includes proper skipping)
npm test

# Run only contract tests
npm run test:contract

# Run specific test file  
npx vitest run tests/contract/logs.contract.test.ts

# Watch mode for development
npm run test:watch
```

## CI Strategy

The CI runs the full test suite (`npm test`) with all tests passing:

1. **Contract Tests**: Validate API contracts against OpenAPI specification
2. **Unit Tests**: Test individual service logic with mocks
3. **Integration Tests**: Test complete workflows with test database

This approach ensures:
- ✅ CI remains stable and reliable
- ✅ Core functionality is thoroughly tested
- ✅ All tests provide value without redundancy
- ✅ Full test coverage visibility maintained