import { describe, it, expect } from 'vitest';
import { app } from "../helpers/app";

// Contract tests for PUT /logs/{logId} endpoint (update log)
describe('Contract: PUT /logs/{logId}', () => {

  it('should update log for authenticated owner', async () => {
    const updateData = {
      title: 'Updated: Attack on Titan S1E1',
      content: 'Updated review with more thoughts',
      tag_ids: [1, 2, 3],
      privacy: 'private',
      rating: 4
    };

    const response = await app.request('/logs/123', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=owner_session_token'
      },
      body: JSON.stringify(updateData)
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    
    const data = await response.json();
    expect(data).toHaveProperty('id', '123');
    expect(data).toHaveProperty('title', updateData.title);
    expect(data).toHaveProperty('content', updateData.content);
    expect(data).toHaveProperty('privacy', 'private');
    expect(data).toHaveProperty('rating', 4);
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
    const updateData = { title: 'Hacked title' };

    const response = await app.request('/logs/123', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=other_user_session_token'
      },
      body: JSON.stringify(updateData)
    });

    expect(response.status).toBe(403);
  });

  it('should return 404 for non-existent log', async () => {
    const updateData = { title: 'New title' };

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
      title: '', // Empty title should be invalid
      content: 'Some content'
    };

    const response = await app.request('/logs/123', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=owner_session_token'
      },
      body: JSON.stringify(invalidData)
    });

    expect(response.status).toBe(400);
  });
});