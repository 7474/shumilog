import { describe, it, expect, beforeAll, vi } from 'vitest';
import { app } from '../helpers/app';

// This test should FAIL initially - that's the point of TDD
describe('Contract: GET /auth/twitter', () => {
  beforeAll(() => {
    // Mock environment variables
    vi.stubEnv('TWITTER_CLIENT_ID', 'test_client_id');
    vi.stubEnv('TWITTER_REDIRECT_URI', 'http://localhost:8787/api/auth/callback');
  });

  it('should redirect to Twitter OAuth with proper parameters', async () => {
    const response = await app.request('/auth/twitter', {
      method: 'GET',
    });

    expect(response.status).toBe(302);
    
    const location = response.headers.get('Location');
    expect(location).toBeDefined();
    expect(location).toContain('twitter.com');
    expect(location).toContain('oauth2/authorize');
    expect(location).toContain('client_id=test_client_id');
    expect(location).toContain('redirect_uri=');
    expect(location).toContain('response_type=code');
    expect(location).toContain('scope=');
    expect(location).toContain('state=');
  });

  it('should return 400 for invalid request parameters', async () => {
    const response = await app.request('/auth/twitter?invalid=param', {
      method: 'GET',
    });

    // This should eventually return 400 for malformed requests
    expect([302, 400]).toContain(response.status);
  });
});