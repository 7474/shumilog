import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';

const mockApp = new Hono();

describe('Contract: GET /users/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return user profile for authenticated user', async () => {
    const response = await mockApp.request('/users/me', {
      method: 'GET',
      headers: {
        'Cookie': 'session=valid_session_token'
      }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    
    const user = await response.json();
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('twitter_username');
    expect(user).toHaveProperty('display_name');
    expect(user).toHaveProperty('avatar_url');
    expect(user).toHaveProperty('created_at');
    
    // Verify the structure matches the API spec
    expect(typeof user.id).toBe('string');
    expect(typeof user.twitter_username).toBe('string');
    expect(typeof user.display_name).toBe('string');
    expect(typeof user.avatar_url).toBe('string');
    expect(typeof user.created_at).toBe('string');
  });

  it('should return 401 for unauthenticated request', async () => {
    const response = await mockApp.request('/users/me', {
      method: 'GET',
    });

    expect(response.status).toBe(401);
  });

  it('should return 401 for invalid session', async () => {
    const response = await mockApp.request('/users/me', {
      method: 'GET',
      headers: {
        'Cookie': 'session=invalid_session_token'
      }
    });

    expect(response.status).toBe(401);
  });
});