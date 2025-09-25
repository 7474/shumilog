import { describe, it, expect, beforeAll, vi } from 'vitest';
import { app } from '../helpers/app';

describe('Contract: GET /auth/callback', () => {
  beforeAll(() => {
    vi.stubEnv('TWITTER_CLIENT_SECRET', 'test_client_secret');
    vi.stubEnv('SESSION_SECRET', 'test_session_secret');
  });

  it('should handle successful OAuth callback with code and state', async () => {
    const response = await app.request('/auth/callback?code=test_code&state=test_state', {
      method: 'GET',
    });

    expect(response.status).toBe(302);
    
    const location = response.headers.get('Location');
    expect(location).toBeDefined();
    // Should redirect to app after successful auth
    expect(location).not.toContain('twitter.com');
    
    const setCookie = response.headers.get('Set-Cookie');
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain('session=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
  });

  it('should return 401 for missing code parameter', async () => {
    const response = await app.request('/auth/callback?state=test_state', {
      method: 'GET',
    });

    expect(response.status).toBe(401);
  });

  it('should return 401 for missing state parameter', async () => {
    const response = await app.request('/auth/callback?code=test_code', {
      method: 'GET',
    });

    expect(response.status).toBe(401);
  });

  it('should return 401 for invalid code', async () => {
    const response = await app.request('/auth/callback?code=invalid_code&state=test_state', {
      method: 'GET',
    });

    expect(response.status).toBe(401);
  });
});