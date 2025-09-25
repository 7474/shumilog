import { describe, it, expect } from 'vitest';
import { app } from "../helpers/app";

// Contract tests for POST /logs/{logId}/share endpoint
describe('Contract: POST /logs/{logId}/share', () => {

  it('should share public log to Twitter for authenticated owner', async () => {
    const shareData = {
      platform: 'twitter',
      message: 'Just watched an amazing anime episode! Check out my thoughts:'
    };

    const response = await app.request('/logs/123/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=owner_session_token'
      },
      body: JSON.stringify(shareData)
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('share_url');
    expect(data).toHaveProperty('twitter_post_id');
    expect(data.share_url).toMatch(/^https:\/\/twitter\.com/);
  });

  it('should return 401 for unauthenticated request', async () => {
    const shareData = {
      platform: 'twitter',
      message: 'Test message'
    };

    const response = await app.request('/logs/123/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(shareData)
    });

    expect(response.status).toBe(401);
  });

  it('should return 403 for non-owner trying to share', async () => {
    const shareData = {
      platform: 'twitter',
      message: 'Test message'
    };

    const response = await app.request('/logs/123/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=other_user_session_token'
      },
      body: JSON.stringify(shareData)
    });

    expect(response.status).toBe(403);
  });

  it('should return 400 for private log sharing attempt', async () => {
    const shareData = {
      platform: 'twitter',
      message: 'Test message'
    };

    const response = await app.request('/logs/456/share', { // private log
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=owner_session_token'
      },
      body: JSON.stringify(shareData)
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('should return 404 for non-existent log', async () => {
    const shareData = {
      platform: 'twitter',
      message: 'Test message'
    };

    const response = await app.request('/logs/999999/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=valid_session_token'
      },
      body: JSON.stringify(shareData)
    });

    expect(response.status).toBe(404);
  });

  it('should validate required fields', async () => {
    const invalidData = {
      platform: 'twitter'
      // Missing message field
    };

    const response = await app.request('/logs/123/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=owner_session_token'
      },
      body: JSON.stringify(invalidData)
    });

    expect(response.status).toBe(400);
  });

  it('should handle Twitter API failures gracefully', async () => {
    const shareData = {
      platform: 'twitter',
      message: 'This is a test message that might fail'
    };

    const response = await app.request('/logs/123/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=owner_with_invalid_twitter_token'
      },
      body: JSON.stringify(shareData)
    });

    expect([500, 502, 503]).toContain(response.status);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });
});