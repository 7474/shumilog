import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { app, clearTestData } from '../helpers/app.js';

/**
 * Test suite to reproduce and fix the multiple login issue
 * 
 * Issue: When the same X account tries to login multiple times,
 * authentication fails from the second time onwards.
 */
describe('Multiple Login Issue', () => {
  beforeEach(async () => {
    await clearTestData();
    vi.unstubAllEnvs();
    vi.stubEnv('TWITTER_CLIENT_ID', 'test-twitter-client-id');
    vi.stubEnv('TWITTER_CLIENT_SECRET', 'test-twitter-client-secret');
    vi.stubEnv('TWITTER_REDIRECT_URI', 'http://localhost:8787/api/auth/callback');
    vi.stubEnv('NODE_ENV', 'development'); // Enable offline mode for testing
  });

  afterEach(async () => {
    await clearTestData();
    vi.unstubAllEnvs();
  });

  it('should allow the same Twitter user to login multiple times', async () => {
    const testState = 'test-state-12345';
    const testCode = 'valid-auth-code';
    const callbackUrl = `/api/auth/callback?code=${testCode}&state=${testState}`;

    // First login attempt
    const firstResponse = await app.request(callbackUrl, {
      method: 'GET',
      headers: {
        Cookie: `oauth_state=${testState}`,
      },
    });

    expect(firstResponse.status).toBe(302); // Should redirect successfully
    const firstSetCookie = firstResponse.headers.get('Set-Cookie');
    expect(firstSetCookie).toBeTruthy();
    expect(firstSetCookie).toContain('session=');

    // Extract the session cookie for verification
    const firstSessionMatch = firstSetCookie?.match(/session=([^;]+)/);
    const firstSessionToken = firstSessionMatch?.[1];
    expect(firstSessionToken).toBeTruthy();

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Second login attempt with the same user (simulated by same state/code pattern)
    // In offline mode, the same state generates the same mock user
    const secondResponse = await app.request(callbackUrl, {
      method: 'GET',
      headers: {
        Cookie: `oauth_state=${testState}`,
      },
    });

    // This should NOT fail - it should create a new session for the same user
    expect(secondResponse.status).toBe(302); // Should redirect successfully
    const secondSetCookie = secondResponse.headers.get('Set-Cookie');
    expect(secondSetCookie).toBeTruthy();
    expect(secondSetCookie).toContain('session=');

    // Extract the second session cookie
    const secondSessionMatch = secondSetCookie?.match(/session=([^;]+)/);
    const secondSessionToken = secondSessionMatch?.[1];
    expect(secondSessionToken).toBeTruthy();

    // The session tokens should be different (new session created)
    expect(firstSessionToken).not.toBe(secondSessionToken);
    
    // Both sessions should be valid
    const meWithFirstSession = await app.request('/api/users/me', {
      method: 'GET',
      headers: {
        Cookie: `session=${firstSessionToken}`,
      },
    });

    const meWithSecondSession = await app.request('/api/users/me', {
      method: 'GET',
      headers: {
        Cookie: `session=${secondSessionToken}`,
      },
    });

    // Both sessions should work (assuming /users/me endpoint exists)
    // If it doesn't exist, we'll get 404, not 401 which indicates auth failure
    expect([200, 404]).toContain(meWithFirstSession.status);
    expect([200, 404]).toContain(meWithSecondSession.status);
    
    // Make sure we're not getting auth failures
    expect(meWithFirstSession.status).not.toBe(401);
    expect(meWithSecondSession.status).not.toBe(401);
  });

  it('should handle different users logging in without conflicts', async () => {
    const user1State = 'user1-state-12345';
    const user2State = 'user2-state-67890';
    const testCode = 'valid-auth-code';

    // First user login
    const user1Response = await app.request(`/api/auth/callback?code=${testCode}&state=${user1State}`, {
      method: 'GET',
      headers: {
        Cookie: `oauth_state=${user1State}`,
      },
    });

    expect(user1Response.status).toBe(302);
    const user1SetCookie = user1Response.headers.get('Set-Cookie');
    expect(user1SetCookie).toContain('session=');

    // Second user login
    const user2Response = await app.request(`/api/auth/callback?code=${testCode}&state=${user2State}`, {
      method: 'GET',
      headers: {
        Cookie: `oauth_state=${user2State}`,
      },
    });

    expect(user2Response.status).toBe(302);
    const user2SetCookie = user2Response.headers.get('Set-Cookie');
    expect(user2SetCookie).toContain('session=');

    // Extract session tokens to ensure they're different
    const user1SessionMatch = user1SetCookie?.match(/session=([^;]+)/);
    const user2SessionMatch = user2SetCookie?.match(/session=([^;]+)/);
    
    expect(user1SessionMatch?.[1]).not.toBe(user2SessionMatch?.[1]);
  });
});