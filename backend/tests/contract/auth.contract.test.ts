import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { app, clearTestData, createTestSession } from '../helpers/app';

/**
 * Contract Suite: Authentication endpoints
 *
 * This suite encodes the expected behaviour for the Cloudflare Worker auth flow.
 * Each test currently fails because the Worker has not been implemented yet.
 */
describe('Contract: Auth routes', () => {
  beforeEach(async () => {
    await clearTestData();
    vi.unstubAllEnvs();
    vi.stubEnv('TWITTER_CLIENT_ID', 'test-twitter-client-id');
    vi.stubEnv('TWITTER_CLIENT_SECRET', 'test-twitter-client-secret');
    vi.stubEnv('TWITTER_REDIRECT_URI', 'http://localhost:8787/api/auth/callback');
  });

  afterEach(async () => {
    await clearTestData();
    vi.unstubAllEnvs();
  });

  describe('GET /auth/twitter', () => {
    it('redirects to Twitter OAuth with required parameters', async () => {
      const response = await app.request('/auth/twitter', { method: 'GET' });

      expect(response.status).toBe(302);

      const location = response.headers.get('Location');
      expect(location).toBeTruthy();

      const url = new URL(location!);
      expect(url.host).toContain('x.com');
      expect(url.pathname).toContain('oauth');
      expect(url.searchParams.get('client_id')).toBe('test-twitter-client-id');
      expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:8787/api/auth/callback');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('scope')).toBeTruthy();
      expect(url.searchParams.get('state')).toBeTruthy();
    });

    it('returns 400 for malformed query parameters', async () => {
      const response = await app.request('/auth/twitter?redirect_uri=not-allowed', { method: 'GET' });

      expect(response.status).toBe(400);
      const bodyText = await response.text();
      expect(bodyText).toContain('invalid');
    });
  });

  describe('GET /auth/callback', () => {
    it('establishes a session and redirects on success', async () => {
      const response = await app.request('/auth/callback?code=test-code&state=test-state', { method: 'GET' });

      expect(response.status).toBe(302);

      const location = response.headers.get('Location');
      expect(location).toBeTruthy();
      expect(location).not.toContain('twitter.com');

      const setCookie = response.headers.get('Set-Cookie');
      expect(setCookie).toBeTruthy();
      expect(setCookie).toContain('session=');
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('Secure');
    });

    it('returns 401 when the oauth code is missing', async () => {
      const response = await app.request('/auth/callback?state=test-state', { method: 'GET' });

      expect(response.status).toBe(401);
    });

    it('returns 401 when the oauth state is missing', async () => {
      const response = await app.request('/auth/callback?code=test-code', { method: 'GET' });

      expect(response.status).toBe(401);
    });

    it('returns 401 when the oauth exchange fails', async () => {
      const response = await app.request('/auth/callback?code=invalid-code&state=test-state', { method: 'GET' });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('revokes the active session cookie and acknowledges logout', async () => {
      const sessionToken = await createTestSession();

      const response = await app.request('/auth/logout', {
        method: 'POST',
        headers: {
          Cookie: `session=${sessionToken}`
        }
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/json');

      const body = await response.json();
      expect(body).toMatchObject({ success: true, message: expect.any(String) });

      const setCookie = response.headers.get('Set-Cookie');
      expect(setCookie).toContain('session=');
      expect(setCookie).toMatch(/Max-Age=0/);
    });

    it('returns 401 when no active session is present', async () => {
      const response = await app.request('/auth/logout', {
        method: 'POST'
      });

      expect(response.status).toBe(401);
    });
  });
});
