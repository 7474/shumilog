import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createApp } from '../../src/index.js';
import { clearTestData } from '../helpers/app.js';

/**
 * Contract Test: OAuth callback in production environment
 * 
 * This test verifies that OAuth state validation works correctly in production,
 * using only cookie-based verification without relying on in-memory state.
 * This is critical for Cloudflare Workers where OAuth init and callback
 * may be handled by different Worker instances.
 */
describe('Contract: Auth callback (production mode)', () => {
  beforeEach(async () => {
    await clearTestData();
    vi.unstubAllEnvs();
    // Set production environment
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('TWITTER_CLIENT_ID', 'test-twitter-client-id');
    vi.stubEnv('TWITTER_CLIENT_SECRET', 'test-twitter-client-secret');
    vi.stubEnv('TWITTER_REDIRECT_URI', 'http://localhost:8787/api/auth/callback');
  });

  afterEach(async () => {
    await clearTestData();
    vi.unstubAllEnvs();
  });

  it('should reject callback without state cookie in production', async () => {
    const { getTestD1Database } = await import('../helpers/app.js');
    const app = createApp({
      DB: getTestD1Database(),
      NODE_ENV: 'production',
      TWITTER_CLIENT_ID: 'test-twitter-client-id',
      TWITTER_CLIENT_SECRET: 'test-twitter-client-secret',
      TWITTER_REDIRECT_URI: 'http://localhost:8787/api/auth/callback'
    });
    
    // Attempt OAuth callback without the state cookie
    // (simulates callback arriving at different Worker instance)
    const response = await app.request('/auth/callback?code=test-code&state=test-state', {
      method: 'GET'
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toMatchObject({ error: 'Invalid OAuth state' });
  });

  it('should reject callback with mismatched state cookie in production', async () => {
    const { getTestD1Database } = await import('../helpers/app.js');
    const app = createApp({
      DB: getTestD1Database(),
      NODE_ENV: 'production',
      TWITTER_CLIENT_ID: 'test-twitter-client-id',
      TWITTER_CLIENT_SECRET: 'test-twitter-client-secret',
      TWITTER_REDIRECT_URI: 'http://localhost:8787/api/auth/callback'
    });
    
    // Attempt OAuth callback with wrong state cookie
    const response = await app.request('/auth/callback?code=test-code&state=test-state', {
      method: 'GET',
      headers: {
        Cookie: 'oauth_state=wrong-state'
      }
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toMatchObject({ error: 'Invalid OAuth state' });
  });

  it('should pass state validation with matching cookie in production', async () => {
    const { getTestD1Database } = await import('../helpers/app.js');
    const app = createApp({
      DB: getTestD1Database(),
      NODE_ENV: 'production',
      TWITTER_CLIENT_ID: 'test-twitter-client-id',
      TWITTER_CLIENT_SECRET: 'test-twitter-client-secret',
      TWITTER_REDIRECT_URI: 'http://localhost:8787/api/auth/callback'
    });
    
    // Simulate OAuth callback with matching state cookie and verifier cookie
    // In production, we verify both cookies
    const response = await app.request('/auth/callback?code=test-code&state=test-state', {
      method: 'GET',
      headers: {
        Cookie: 'oauth_state=test-state; oauth_verifier=test-verifier'
      }
    });

    // State and verifier validation passes, but will fail later when
    // trying to exchange code with Twitter (which is expected in test)
    // The important thing is it doesn't fail with "Invalid OAuth state" (401)
    // at the cookie validation stage
    expect(response.status).toBe(401);
    const body = await response.json();
    // Should fail with "Authentication failed" not "Invalid OAuth state"
    expect(body).toMatchObject({ error: 'Authentication failed' });
  });
});
