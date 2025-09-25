import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';

const mockApp = new Hono();

describe('Integration: New User Registration and First Log', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock environment setup
    vi.stubEnv('TWITTER_CLIENT_ID', 'test_client_id');
    vi.stubEnv('TWITTER_CLIENT_SECRET', 'test_client_secret');
    vi.stubEnv('SESSION_SECRET', 'test_session_secret');
  });

  it('should complete full user onboarding flow', async () => {
    // Step 1: Landing page access (this will be frontend)
    // For now we'll test API endpoints
    
    // Step 2: Twitter OAuth initiation
    const authResponse = await mockApp.request('/auth/twitter', {
      method: 'GET',
    });
    expect(authResponse.status).toBe(302);
    expect(authResponse.headers.get('Location')).toContain('twitter.com');
    
    // Step 3: OAuth callback simulation
    const callbackResponse = await mockApp.request('/auth/callback?code=test_code&state=test_state', {
      method: 'GET',
    });
    expect(callbackResponse.status).toBe(302);
    
    const sessionCookie = callbackResponse.headers.get('Set-Cookie');
    expect(sessionCookie).toBeDefined();
    
    // Step 4: Create user's first log
    const logData = {
      tag_ids: ['tag_anime'],
      title: 'Amazing first season!',
      content_md: 'This anime really hooked me from episode 1. The animation quality is top-notch and the story keeps you guessing.',
      is_public: false
    };
    
    const createLogResponse = await mockApp.request('/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie || ''
      },
      body: JSON.stringify(logData)
    });
    
    expect(createLogResponse.status).toBe(201);
    const createdLog = await createLogResponse.json();
    expect(createdLog).toHaveProperty('id');
    expect(createdLog.title).toBe(logData.title);
    expect(createdLog.content_md).toBe(logData.content_md);
    expect(createdLog.associated_tags).toHaveLength(1);
    
    // Step 5: Make log public and verify
    const updateResponse = await mockApp.request(`/logs/${createdLog.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie || ''
      },
      body: JSON.stringify({ is_public: true })
    });
    
    expect(updateResponse.status).toBe(200);
    
    // Step 6: Verify log appears in public browsing
    const publicLogsResponse = await mockApp.request('/logs', {
      method: 'GET',
    });
    
    expect(publicLogsResponse.status).toBe(200);
    const publicLogs = await publicLogsResponse.json();
    expect(publicLogs.items.some((log: any) => log.id === createdLog.id)).toBe(true);
  });

  it('should handle unauthenticated log creation', async () => {
    const logData = {
      tag_ids: ['tag_anime'],
      title: 'Test log',
      content_md: 'Test content',
      is_public: false
    };
    
    const response = await mockApp.request('/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(logData)
    });
    
    expect(response.status).toBe(401);
  });
});