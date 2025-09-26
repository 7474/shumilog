import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { app, clearTestData, createTestSession, createTestUser } from '../helpers/app';

/**
 * Contract Suite: Users routes
 *
 * These tests describe the expected behaviour for the `/users/me` endpoint.
 * They intentionally fail today because the Worker implementation still returns
 * hard-coded data and does not integrate with the session/user stores seeded in tests.
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
});
