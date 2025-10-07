import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { toOpenApiResponse } from '../helpers/openapi-setup';

/**
 * Contract Suite: Frontend API Client - Tags
 *
 * These tests verify that tag-related API responses conform to the OpenAPI specification.
 * Uses MSW to provide OpenAPI-compliant mock responses.
 */

const baseUrl = 'http://localhost:8787';

const handlers = [
  http.get(`${baseUrl}/api/tags`, () => {
    return HttpResponse.json({
      items: [
        {
          id: 'tag_1',
          name: 'Test Tag',
          description: 'Test tag description',
          metadata: {},
          created_by: 'user_1',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    });
  }),

  http.get(`${baseUrl}/api/tags/:id`, ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: 'Test Tag Detail',
      description: 'Detailed tag description',
      metadata: {},
      created_by: 'user_1',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
      log_count: 5,
      recent_logs: [],
      associated_tags: [],
    });
  }),
];

const server = setupServer(...handlers);

describe('Contract: Frontend API Client - Tags', () => {
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

  describe('GET /api/tags', () => {
    it('validates mock response against OpenAPI spec', async () => {
      const response = await fetch(`${baseUrl}/api/tags`);
      
      expect(response.ok).toBe(true);
      
      // Validate response against OpenAPI specification
      const openApiResponse = await toOpenApiResponse(response, '/tags', 'GET');
      expect(openApiResponse).toSatisfyApiSpec();
      
      const data = await response.json();
      expect(data).toMatchObject({
        items: expect.any(Array),
        total: expect.any(Number)
      });
    });
  });

  describe('GET /api/tags/:id', () => {
    it('validates mock tag detail response against OpenAPI spec', async () => {
      const response = await fetch(`${baseUrl}/api/tags/test_tag_1`);
      
      expect(response.ok).toBe(true);
      
      // Validate response against OpenAPI specification
      const openApiResponse = await toOpenApiResponse(response, '/tags/test_tag_1', 'GET');
      expect(openApiResponse).toSatisfyApiSpec();
      
      const data = await response.json();
      expect(data).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        created_at: expect.any(String)
      });
    });
  });
});
