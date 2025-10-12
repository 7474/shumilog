import { describe, it, expect, beforeAll } from 'vitest';
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
    const { createApp } = await import('../../src/index');
    app = createApp({});
  });

  it('should return 200 status with healthy response', async () => {
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
    const res = await app.request('/health');
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('should respond quickly (< 100ms)', async () => {
    const start = Date.now();
    await app.request('/health');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100);
  });
});