import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { toOpenApiResponse } from '../helpers/openapi-setup';

/**
 * Contract Suite: Frontend API Client - Health
 *
 * These tests verify that the health endpoint response conforms to the OpenAPI specification.
 * Uses MSW to provide OpenAPI-compliant mock responses.
 */

const baseUrl = 'http://localhost:8787';

const handlers = [
  http.get(`${baseUrl}/api/health`, () => {
    return HttpResponse.json({
      status: 'healthy',
      timestamp: '2025-01-01T00:00:00.000Z',
      services: {
        database: 'connected',
        backend: 'running'
      }
    });
  }),
];

const server = setupServer(...handlers);

describe('Contract: Frontend API Client - Health', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
    import('../helpers/openapi-setup');
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('GET /api/health', () => {
    it('validates mock response against OpenAPI spec', async () => {
      const response = await fetch(`${baseUrl}/api/health`);
      
      expect(response.ok).toBe(true);
      
      // Validate response against OpenAPI specification
      const openApiResponse = await toOpenApiResponse(response, '/health', 'GET');
      expect(openApiResponse).toSatisfyApiSpec();
      
      const data = await response.json();
      expect(data).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        services: expect.any(Object)
      });
      
      expect(data.services).toMatchObject({
        database: expect.any(String),
        backend: expect.any(String)
      });
    });
  });
});
