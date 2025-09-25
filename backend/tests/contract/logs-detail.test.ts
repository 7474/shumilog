import { describe, it, expect } from 'vitest';
import { app } from "../helpers/app";

// Contract tests for GET /logs/{logId} endpoint (get specific log)
describe('Contract: GET /logs/{logId}', () => {

  it('should return public log for any user', async () => {
    const response = await app.request('/logs/123');

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    
    const data = await response.json();
    expect(data).toHaveProperty('id', '123');
    expect(data).toHaveProperty('title');
    expect(data).toHaveProperty('content');
    expect(data).toHaveProperty('content_html');
    expect(data).toHaveProperty('privacy', 'public');
    expect(data).toHaveProperty('created_at');
    expect(data).toHaveProperty('updated_at');
    expect(data).toHaveProperty('user_id');
    expect(data).toHaveProperty('tag_ids');
    expect(data).toHaveProperty('episode_number');
    expect(data).toHaveProperty('rating');
  });

  it('should return private log only to owner', async () => {
    const response = await app.request('/logs/456', {
      headers: {
        'Cookie': 'session=owner_session_token'
      }
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('id', '456');
    expect(data).toHaveProperty('privacy', 'private');
  });

  it('should return 403 for private log accessed by non-owner', async () => {
    const response = await app.request('/logs/456', {
      headers: {
        'Cookie': 'session=other_user_session_token'
      }
    });

    expect(response.status).toBe(403);
  });

  it('should return 403 for private log accessed without authentication', async () => {
    const response = await app.request('/logs/456');

    expect(response.status).toBe(403);
  });

  it('should return 404 for non-existent log', async () => {
    const response = await app.request('/logs/999999');

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('should return 400 for invalid log ID format', async () => {
    const response = await app.request('/logs/invalid-id');

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('should include tag information in response', async () => {
    const response = await app.request('/logs/123');

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('tags');
    expect(Array.isArray(data.tags)).toBe(true);
    
    if (data.tags && data.tags.length > 0) {
      expect(data.tags[0]).toHaveProperty('id');
      expect(data.tags[0]).toHaveProperty('name');
      expect(data.tags[0]).toHaveProperty('category');
    }
  });
});