import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { app, clearTestData, createTestSession, createTestUser } from '../helpers/app';
import { toOpenApiResponse } from '../helpers/openapi-setup';

/**
 * Contract Suite: Users routes
 *
 * These tests describe the expected behaviour for the `/users/me` endpoint.
 * They now include OpenAPI specification validation to ensure responses match the API contract.
 */
describe('Contract: Users routes', () => {
  beforeEach(async () => {
    await clearTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe('GET /users/me', () => {
    it('returns the authenticated user profile backed by persistence', async () => {
      const userId = 'user_contract_123';
      const twitterHandle = 'contract_user';

      await createTestUser(userId, twitterHandle);
      const sessionToken = await createTestSession(userId);

      const response = await app.request('/users/me', {
        method: 'GET',
        headers: {
          Cookie: `session=${sessionToken}`
        }
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/json');

      // Validate response against OpenAPI specification
      const openApiResponse = await toOpenApiResponse(response, '/users/me', 'GET');
      expect(openApiResponse).toSatisfyApiSpec();

      const user = await response.json();
      expect(user).toMatchObject({
        id: userId,
        twitter_username: twitterHandle,
        display_name: `Test User ${twitterHandle}`,
        avatar_url: `https://example.com/avatar/${twitterHandle}.jpg`
      });

      expect(typeof user.created_at).toBe('string');
      expect(Number.isNaN(Date.parse(user.created_at))).toBe(false);
    });

    it('returns 401 when request is unauthenticated', async () => {
      const response = await app.request('/users/me', { method: 'GET' });

      expect(response.status).toBe(401);
    });

    it('returns 401 when session cookie is invalid', async () => {
      const response = await app.request('/users/me', {
        method: 'GET',
        headers: {
          Cookie: 'session=invalid_session_token'
        }
      });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /users/me', () => {
    it('updates the authenticated user display name', async () => {
      const userId = 'user_update_123';
      const twitterHandle = 'update_user';

      await createTestUser(userId, twitterHandle);
      const sessionToken = await createTestSession(userId);

      const response = await app.request('/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          display_name: 'Updated Display Name'
        })
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/json');

      // Validate response against OpenAPI specification
      const openApiResponse = await toOpenApiResponse(response, '/users/me', 'PUT');
      expect(openApiResponse).toSatisfyApiSpec();

      const user = await response.json();
      expect(user).toMatchObject({
        id: userId,
        twitter_username: twitterHandle,
        display_name: 'Updated Display Name'
      });
    });

    it('returns 401 when request is unauthenticated', async () => {
      const response = await app.request('/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          display_name: 'New Name'
        })
      });

      expect(response.status).toBe(401);
    });

    it('returns 400 when display_name is empty', async () => {
      const userId = 'user_empty_name';
      const twitterHandle = 'empty_user';

      await createTestUser(userId, twitterHandle);
      const sessionToken = await createTestSession(userId);

      const response = await app.request('/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          display_name: ''
        })
      });

      expect(response.status).toBe(400);
    });

    it('returns 400 when display_name is too long', async () => {
      const userId = 'user_long_name';
      const twitterHandle = 'long_user';

      await createTestUser(userId, twitterHandle);
      const sessionToken = await createTestSession(userId);

      const response = await app.request('/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          display_name: 'a'.repeat(101)
        })
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /users/me/logs', () => {
    it('returns all logs (public and private) for the authenticated user', async () => {
      const userId = 'user_with_logs';
      const twitterHandle = 'log_owner';

      await createTestUser(userId, twitterHandle);
      const sessionToken = await createTestSession(userId);

      // Create both public and private logs
      const publicLogResponse = await app.request('/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          title: 'Public Log',
          content_md: 'This is public',
          is_public: true
        })
      });
      expect(publicLogResponse.status).toBe(201);

      const privateLogResponse = await app.request('/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          title: 'Private Log',
          content_md: 'This is private',
          is_public: false
        })
      });
      expect(privateLogResponse.status).toBe(201);

      // Get user's logs
      const response = await app.request('/users/me/logs', {
        method: 'GET',
        headers: {
          Cookie: `session=${sessionToken}`
        }
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/json');

      // Validate response against OpenAPI specification
      const openApiResponse = await toOpenApiResponse(response, '/users/me/logs', 'GET');
      expect(openApiResponse).toSatisfyApiSpec();

      const result = await response.json();
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('offset');
      expect(result).toHaveProperty('has_more');

      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBe(2);
      expect(result.total).toBe(2);

      // Verify both public and private logs are returned
      const publicLog = result.items.find((log: any) => log.title === 'Public Log');
      const privateLog = result.items.find((log: any) => log.title === 'Private Log');
      
      expect(publicLog).toBeDefined();
      expect(publicLog.is_public).toBe(true);
      expect(privateLog).toBeDefined();
      expect(privateLog.is_public).toBe(false);
    });

    it('returns 401 when request is unauthenticated', async () => {
      const response = await app.request('/users/me/logs', { method: 'GET' });

      expect(response.status).toBe(401);
    });

    it('supports pagination parameters', async () => {
      const userId = 'user_pagination';
      const twitterHandle = 'paging_user';

      await createTestUser(userId, twitterHandle);
      const sessionToken = await createTestSession(userId);

      // Create multiple logs
      for (let i = 0; i < 5; i++) {
        await app.request('/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `session=${sessionToken}`
          },
          body: JSON.stringify({
            title: `Log ${i}`,
            content_md: `Content ${i}`,
            is_public: i % 2 === 0
          })
        });
      }

      // Get with pagination
      const response = await app.request('/users/me/logs?limit=2&offset=0', {
        method: 'GET',
        headers: {
          Cookie: `session=${sessionToken}`
        }
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      
      expect(result.items.length).toBe(2);
      expect(result.total).toBe(5);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(0);
      expect(result.has_more).toBe(true);
    });
  });
});
