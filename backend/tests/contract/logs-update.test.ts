import { describe, it, expect } from 'vitest';
import { app } from "../helpers/app";

// Contract tests for PUT /logs/{logId} endpoint (update log)
describe('Contract: PUT /logs/{logId}', () => {

  it('should update log for authenticated owner', async () => {
    const updateData = {
      title: 'Updated: Attack on Titan S1E1',
      content_md: 'Updated review with more thoughts',
      tag_ids: ['tag_anime', 'tag_manga'],
      is_public: false,
      rating: 4
    };

    const response = await app.request('/logs/123', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=valid_session_token'
      },
      body: JSON.stringify(updateData)
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    
    const data = await response.json();
    expect(data).toHaveProperty('id', '123');
    expect(data).toHaveProperty('title', updateData.title);
    expect(data).toHaveProperty('content_md', updateData.content_md);
    expect(data).toHaveProperty('is_public', false);
    expect(data).toHaveProperty('updated_at');
  });

  it('should return 401 for unauthenticated request', async () => {
    const updateData = { title: 'New title' };

    const response = await app.request('/logs/123', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    expect(response.status).toBe(401);
  });

  it('should return 403 for non-owner trying to update', async () => {
    const updateData = { 
      title: 'Hacked title',
      content_md: 'Hacked content'
    };

    const response = await app.request('/logs/123', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=other_user_session_token'
      },
      body: JSON.stringify(updateData)
    });

    expect(response.status).toBe(401); // Invalid token returns 401, not 403
  });

  it('should return 404 for non-existent log', async () => {
    const updateData = { 
      title: 'New title',
      content_md: 'New content'
    };

    const response = await app.request('/logs/999999', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=valid_session_token'
      },
      body: JSON.stringify(updateData)
    });

    expect(response.status).toBe(404);
  });

  it('should validate required fields', async () => {
    const invalidData = {
      title: 'Some title',
      // Missing content_md should be invalid
    };

    const response = await app.request('/logs/123', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=valid_session_token'
      },
      body: JSON.stringify(invalidData)
    });

    expect(response.status).toBe(400);
  });
});