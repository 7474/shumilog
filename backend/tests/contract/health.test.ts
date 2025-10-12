import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import { toOpenApiResponse } from '../helpers/openapi-setup';

/**
 * Contract Test: GET /health
 * 
 * Validates that the health endpoint conforms to the OpenAPI specification
 */

describe('Contract Test: GET /health', () => {
  let app: Hono;

  beforeAll(async () => {
    // This will fail until we implement the endpoint
    // Import will be added when the route is implemented
    try {
      const { createApp } = await import('../../src/index');
      app = createApp({});
    } catch (_) {
      console.log('Expected failure: Health endpoint not implemented yet');
    }
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  it('should return 200 status with healthy response', async () => {
    // This test MUST fail initially (TDD approach)
    if (!app) {
      expect(false).toBe(true); // Force failure until implementation
      return;
    }

    const res = await app.request('/health');
    
    expect(res.status).toBe(200);
    
    // Validate response against OpenAPI specification
    const openApiResponse = await toOpenApiResponse(res, '/health', 'GET');
    expect(openApiResponse).toSatisfyApiSpec();
    
    const json = await res.json();
    expect(json).toMatchObject({
      status: 'healthy',
      timestamp: expect.any(String),
      services: {
        database: expect.stringMatching(/connected|disconnected|unknown/),
        backend: expect.stringMatching(/running|degraded/)
      }
    });
    
    // Validate timestamp format
    expect(new Date(json.timestamp).getTime()).toBeGreaterThan(0);
  });

  it('should have correct content-type header', async () => {
    if (!app) {
      expect(false).toBe(true); // Force failure until implementation
      return;
    }

    const res = await app.request('/health');
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('should respond quickly (< 100ms)', async () => {
    if (!app) {
      expect(false).toBe(true); // Force failure until implementation
      return;
    }

    const start = Date.now();
    await app.request('/health');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100);
  });
});