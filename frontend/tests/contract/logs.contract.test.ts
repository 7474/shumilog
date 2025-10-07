import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { toOpenApiResponse } from '../helpers/openapi-setup';

/**
 * Contract Suite: Frontend API Client - Logs
 *
 * These tests verify that the frontend API client handles responses that conform
 * to the OpenAPI specification. This ensures frontend code correctly processes
 * API responses and helps prevent bugs like #249.
 *
 * Uses MSW to provide OpenAPI-compliant mock responses.
 */

const baseUrl = 'http://localhost:8787';

// Create MSW handlers for API endpoints with OpenAPI-compliant responses
const handlers = [
  http.get(`${baseUrl}/api/logs`, () => {
    return HttpResponse.json({
      items: [
        {
          id: 'log_1',
          title: 'Test Log',
          content_md: '# Test Content',
          is_public: true,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
          user: {
            id: 'user_1',
            twitter_username: 'testuser',
            display_name: 'Test User',
            avatar_url: 'https://example.com/avatar.jpg',
            role: 'user',
            created_at: '2025-01-01T00:00:00.000Z',
          },
          associated_tags: [
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
          images: [],
        },
      ],
      total: 1,
    });
  }),

  http.get(`${baseUrl}/api/logs/:logId`, ({ params }) => {
    return HttpResponse.json({
      id: params.logId,
      title: 'Test Log Detail',
      content_md: '# Detailed Content',
      is_public: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
      user: {
        id: 'user_1',
        twitter_username: 'testuser',
        display_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        role: 'user',
        created_at: '2025-01-01T00:00:00.000Z',
      },
      associated_tags: [],
      images: [],
    });
  }),

  http.get(`${baseUrl}/api/logs/:logId/related`, () => {
    return HttpResponse.json({
      items: [
        {
          id: 'related_log_1',
          title: 'Related Log',
          content_md: '# Related Content',
          is_public: true,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
          user: {
            id: 'user_1',
            twitter_username: 'testuser',
            display_name: 'Test User',
            avatar_url: 'https://example.com/avatar.jpg',
            role: 'user',
            created_at: '2025-01-01T00:00:00.000Z',
          },
          associated_tags: [],
          images: [],
        },
      ],
      total: 1,
    });
  }),
];

const server = setupServer(...handlers);

describe('Contract: Frontend API Client - Logs', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
    // Import OpenAPI setup to initialize jest-openapi matchers
    import('../helpers/openapi-setup');
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('GET /api/logs', () => {
    it('validates mock response against OpenAPI spec', async () => {
      const response = await fetch(`${baseUrl}/api/logs`);
      
      expect(response.ok).toBe(true);
      
      // Validate response against OpenAPI specification
      const openApiResponse = await toOpenApiResponse(response, '/logs', 'GET');
      expect(openApiResponse).toSatisfyApiSpec();
      
      const data = await response.json();
      expect(data).toMatchObject({
        items: expect.any(Array),
        total: expect.any(Number),
      });
    });
  });

  describe('GET /api/logs/:logId', () => {
    it('validates mock log detail response against OpenAPI spec', async () => {
      const response = await fetch(`${baseUrl}/api/logs/test_log_1`);
      
      expect(response.ok).toBe(true);
      
      // Validate response against OpenAPI specification
      const openApiResponse = await toOpenApiResponse(response, '/logs/test_log_1', 'GET');
      expect(openApiResponse).toSatisfyApiSpec();
      
      const data = await response.json();
      expect(data).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        content_md: expect.any(String),
        is_public: expect.any(Boolean),
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });
    });
  });

  describe('GET /api/logs/:logId/related', () => {
    it('validates mock related logs response against OpenAPI spec', async () => {
      const response = await fetch(`${baseUrl}/api/logs/test_log_1/related`);
      
      expect(response.ok).toBe(true);
      
      // Validate response against OpenAPI specification
      const openApiResponse = await toOpenApiResponse(response, '/logs/test_log_1/related', 'GET');
      expect(openApiResponse).toSatisfyApiSpec();
      
      const data = await response.json();
      expect(data).toMatchObject({
        items: expect.any(Array)
      });
    });
  });
});
