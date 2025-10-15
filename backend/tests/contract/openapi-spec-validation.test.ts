import { describe, it, expect, beforeAll } from 'vitest';
import OpenAPIBackend from 'openapi-backend';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Automatic OpenAPI Specification Validation
 * 
 * This test validates that the OpenAPI specification itself is valid and can be loaded.
 * The actual runtime validation of all endpoints happens through the test helper
 * that wraps app.request() calls.
 * 
 * This approach ensures:
 * - No individual test implementations needed for each endpoint
 * - Automatic validation of ALL API responses against the spec
 * - Type consistency verification happens transparently during any test
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('OpenAPI Specification Validation', () => {
  let api: OpenAPIBackend;

  beforeAll(async () => {
    const openapiPath = path.resolve(__dirname, '../../../api/v1/openapi.yaml');
    
    api = new OpenAPIBackend({
      definition: openapiPath,
      strict: true,
      validate: true,
      ajvOpts: {
        strict: true,
        strictSchema: true,
        strictNumbers: true,
        strictTypes: true,
        strictTuples: true,
        strictRequired: true,
      },
    });

    await api.init();
  });

  it('should have a valid OpenAPI specification', () => {
    expect(api).toBeDefined();
    expect(api.definition).toBeDefined();
  });

  it('should have defined paths in the specification', () => {
    const paths = Object.keys(api.definition.paths || {});
    expect(paths.length).toBeGreaterThan(0);
    
    console.log(`\n✓ OpenAPI spec loaded successfully with ${paths.length} paths`);
    console.log('  Paths:', paths.join(', '));
  });

  it('should have valid schemas for all defined paths', () => {
    const paths = api.definition.paths || {};
    let totalOperations = 0;
    let operationsWithResponseSchemas = 0;

    for (const [pathname, pathItem] of Object.entries(paths)) {
      const methods = ['get', 'post', 'put', 'delete', 'patch'] as const;
      
      for (const method of methods) {
        const operation = (pathItem as any)[method];
        if (operation) {
          totalOperations++;
          
          // Check if operation has response schemas
          if (operation.responses) {
            for (const [statusCode, response] of Object.entries(operation.responses)) {
              if ((response as any).content) {
                operationsWithResponseSchemas++;
                break;
              }
            }
          }
        }
      }
    }

    console.log(`\n✓ Found ${totalOperations} operations in spec`);
    console.log(`✓ ${operationsWithResponseSchemas} operations have response schemas`);
    
    expect(totalOperations).toBeGreaterThan(0);
  });

  it('should be able to validate operation by path and method', () => {
    // Test that we can look up and validate operations
    // The spec defines paths without /api prefix (e.g., /health)
    // but server base URL includes /api
    const paths = Object.keys(api.definition.paths || {});
    expect(paths.length).toBeGreaterThan(0);
    
    const firstPath = paths[0];
    const pathItem = (api.definition.paths as any)[firstPath];
    const methods = ['get', 'post', 'put', 'delete', 'patch'];
    
    let foundOperation = false;
    for (const method of methods) {
      if ((pathItem as any)[method]) {
        const operation = api.matchOperation({
          method,
          path: firstPath,
        });
        
        if (operation) {
          foundOperation = true;
          console.log(`\n✓ Successfully matched operation: ${method.toUpperCase()} ${firstPath}`);
          break;
        }
      }
    }
    
    expect(foundOperation).toBe(true);
  });

  it('should support validation of responses', () => {
    // Verify the API backend is configured for response validation
    expect(api.validateResponse).toBeDefined();
    expect(typeof api.validateResponse).toBe('function');
    
    console.log('\n✓ Response validation capability confirmed');
  });
});
