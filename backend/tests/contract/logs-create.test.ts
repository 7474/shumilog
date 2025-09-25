import { describe, it, expect } from 'vitest';
import { app } from "../helpers/app";

// Contract tests for POST /logs endpoint (create new log)
describe('Contract: POST /logs', () => {

  it('should create new log for authenticated user', async () => {
    const logData = {
      title: 'Watched Attack on Titan S1E1',
      content: 'Amazing first episode! The animation quality is incredible.',
      tag_ids: [1, 2], // anime, attack-on-titan
      privacy: 'public',
      episode_number: 1,
      rating: 5
    };

    const response = await app.request('/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=valid_session_token'
      },
      body: JSON.stringify(logData)
    });

    expect(response.status).toBe(201);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('title', logData.title);
    expect(data).toHaveProperty('content', logData.content);
    expect(data).toHaveProperty('privacy', 'public');
    expect(data).toHaveProperty('episode_number', 1);
    expect(data).toHaveProperty('rating', 5);
    expect(data).toHaveProperty('created_at');
    expect(data).toHaveProperty('updated_at');
    expect(data).toHaveProperty('user_id');
    expect(data.tag_ids).toEqual(expect.arrayContaining([1, 2]));
  });

  it('should create private log by default', async () => {
    const logData = {
      title: 'Personal anime notes',
      content: 'Some private thoughts',
      tag_ids: [1]
    };

    const response = await app.request('/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=valid_session_token'
      },
      body: JSON.stringify(logData)
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('privacy', 'private');
  });

  it('should return 401 for unauthenticated request', async () => {
    const logData = {
      title: 'Test log',
      content: 'Test content',
      tag_ids: [1]
    };

    const response = await app.request('/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(logData)
    });

    expect(response.status).toBe(401);
  });

  it('should return 400 for invalid request data', async () => {
    const invalidData = {
      // Missing required title
      content: 'Test content'
    };

    const response = await app.request('/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=valid_session_token'
      },
      body: JSON.stringify(invalidData)
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('title');
  });

  it('should handle Markdown content processing', async () => {
    const logData = {
      title: 'Test Markdown Log',
      content: '# Episode Review\n\n**Rating:** 5/5\n\n- Great animation\n- Amazing story',
      tag_ids: [1]
    };

    const response = await app.request('/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=valid_session_token'
      },
      body: JSON.stringify(logData)
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('content', logData.content);
    expect(data).toHaveProperty('content_html'); // Processed Markdown to HTML
  });
});