import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';

// Contract tests for POST /auth/logout endpoint
describe('Contract: POST /auth/logout', () => {
  const app = new Hono();

  it('should successfully logout authenticated user', async () => {
    const response = await app.request('/auth/logout', {
      method: 'POST',
      headers: {
        'Cookie': 'session=valid_session_token'
      }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('message');
    
    // Should clear session cookie
    const setCookie = response.headers.get('Set-Cookie');
    expect(setCookie).toContain('session=');
    expect(setCookie).toContain('Max-Age=0');
  });

  it('should handle logout for unauthenticated user', async () => {
    const response = await app.request('/auth/logout', {
      method: 'POST'
    });

    // Should still return success for security (don't leak session state)
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
  });

  it('should handle invalid session gracefully', async () => {
    const response = await app.request('/auth/logout', {
      method: 'POST',
      headers: {
        'Cookie': 'session=invalid_or_expired_token'
      }
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
  });
});