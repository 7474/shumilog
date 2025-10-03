import path from 'path';
import jestOpenAPI from 'jest-openapi';
import { fileURLToPath } from 'url';

// Convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the OpenAPI specification - jest-openapi expects an absolute path
const openapiPath = path.resolve(__dirname, '../../../api/v1/openapi.yaml');

// Initialize jest-openapi with the specification file path
jestOpenAPI(openapiPath);

/**
 * Helper function to adapt Hono response for jest-openapi validation
 * @param response Hono Response object
 * @param requestPath The request path (e.g., '/users/me')
 * @param requestMethod The HTTP method (e.g., 'GET')
 * @returns An object compatible with jest-openapi expectations
 */
export async function toOpenApiResponse(
  response: Response,
  requestPath: string,
  requestMethod: string = 'GET'
) {
  // Clone the response body since it can only be read once
  const bodyText = await response.clone().text();
  let bodyJson;
  try {
    bodyJson = JSON.parse(bodyText);
  } catch {
    bodyJson = undefined;
  }

  // Add /api prefix to match OpenAPI server paths if not already present
  const apiPath = requestPath.startsWith('/api') ? requestPath : `/api${requestPath}`;

  // Create a request-like object that jest-openapi expects
  const req = {
    method: requestMethod,
    path: apiPath,
    url: apiPath,
  };

  // Create a response-like object that jest-openapi expects
  const res = {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: bodyJson,
    text: bodyText,
    req,
  };

  return res;
}

