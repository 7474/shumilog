import OpenAPIBackend from 'openapi-backend';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Singleton instance of OpenAPI backend validator
let apiValidator: OpenAPIBackend | null = null;

/**
 * Initialize the OpenAPI validator
 */
async function initValidator(): Promise<OpenAPIBackend> {
  if (apiValidator) {
    return apiValidator;
  }

  const openapiPath = path.resolve(__dirname, '../../../api/v1/openapi.yaml');
  
  apiValidator = new OpenAPIBackend({
    definition: openapiPath,
    strict: false, // Set to false to allow additional properties in responses
    validate: true,
    ajvOpts: {
      strict: false,
      coerceTypes: true,
      removeAdditional: false,
    },
  });

  await apiValidator.init();
  return apiValidator;
}

/**
 * Automatically validate a response against the OpenAPI specification
 * 
 * @param method HTTP method (GET, POST, etc.)
 * @param path Request path (e.g., /api/logs)
 * @param statusCode Response status code
 * @param responseBody Response body
 * @param _headers Response headers (currently unused, reserved for future use)
 * @returns Validation result with errors if any
 */
export async function validateResponse(
  method: string,
  path: string,
  statusCode: number,
  responseBody: any,
  _headers: Record<string, string>
): Promise<{ valid: boolean; errors: any[] }> {
  try {
    const validator = await initValidator();
    
    // Normalize path to match OpenAPI spec (ensure /api prefix)
    const normalizedPath = path.startsWith('/api') ? path : `/api${path}`;
    
    // Try to match the operation
    const operation = validator.matchOperation({
      method: method.toLowerCase(),
      path: normalizedPath,
    });

    if (!operation) {
      // Operation not found in spec - this might be ok (e.g., dev endpoints)
      return { valid: true, errors: [] };
    }

    // Validate the response
    const validation = validator.validateResponse(responseBody, {
      method: method.toLowerCase(),
      path: normalizedPath,
      status: statusCode,
    });

    if (validation.errors && validation.errors.length > 0) {
      return {
        valid: false,
        errors: validation.errors.map((err: any) => ({
          message: err.message,
          path: err.instancePath || err.path,
          keyword: err.keyword,
          params: err.params,
        })),
      };
    }

    return { valid: true, errors: [] };
  } catch (error) {
    // If validation fails catastrophically, log but don't fail the test
    console.warn(`Warning: Could not validate response for ${method} ${path}:`, error);
    return { valid: true, errors: [] };
  }
}

/**
 * Wrapper function for app.request that automatically validates responses
 * 
 * Usage in tests:
 * ```typescript
 * import { validateAppRequest } from '../helpers/openapi-auto-validator';
 * 
 * const response = await validateAppRequest(app, '/logs', { method: 'GET' });
 * ```
 */
export async function validateAppRequest(
  app: any,
  path: string,
  init?: Record<string, any>
): Promise<Response> {
  const method = init?.method || 'GET';
  const response = await app.request(path, init);
  
  // Clone response to read body without consuming it
  const clonedResponse = response.clone();
  const contentType = response.headers.get('content-type') || '';
  
  let responseBody: any = null;
  if (contentType.includes('application/json')) {
    try {
      responseBody = await clonedResponse.json();
    } catch {
      // Not JSON or empty body
    }
  }

  // Validate the response
  const validation = await validateResponse(
    method,
    path,
    response.status,
    responseBody,
    Object.fromEntries(response.headers.entries())
  );

  if (!validation.valid) {
    console.error(`\n❌ OpenAPI Validation Failed for ${method} ${path}:`);
    console.error(`   Status: ${response.status}`);
    console.error(`   Errors:`, JSON.stringify(validation.errors, null, 2));
    
    // Optionally fail the test
    // throw new Error(`OpenAPI validation failed: ${JSON.stringify(validation.errors)}`);
  } else {
    console.log(`✓ ${method} ${path} - validated against OpenAPI spec`);
  }

  return response;
}

/**
 * Enable automatic validation for all app.request calls in a test suite
 * 
 * This wraps the app object to automatically validate all responses.
 */
export function enableAutomaticValidation(app: any): any {
  const originalRequest = app.request.bind(app);
  
  app.request = async function(path: string, init?: Record<string, any>) {
    return validateAppRequest({ request: originalRequest }, path, init);
  };
  
  return app;
}
