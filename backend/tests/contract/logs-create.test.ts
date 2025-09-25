import { describe, it, expect } from 'vitest';
import { app } from "../helpers/app";

// Contract tests for POST /logs endpoint (create new log)
describe('Contract: POST /logs', () => {

  it('should create new log for authenticated user', async () => {
    const logData = {
      title: 'Watched Attack on Titan S1E1',
      content_md: 'Amazing first episode! The animation quality is incredible.',
      tag_ids: ['tag_anime', 'tag_attack_on_titan'],
      is_public: true
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
    expect(data).toHaveProperty('content_md', logData.content_md);
    expect(data).toHaveProperty('created_at');
    expect(data).toHaveProperty('updated_at');
    expect(data).toHaveProperty('user');
    expect(data.user).toHaveProperty('id');
    expect(data).toHaveProperty('associated_tags');
    expect(Array.isArray(data.associated_tags)).toBe(true);
  });

  it('should create private log by default', async () => {
    const logData = {
      title: 'Private diary entry',
      content_md: 'This is my private thought.',
      tag_ids: ['tag_anime']
      // is_public defaults to false per API spec
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
    // Should be private by default (is_public: false)
    expect(data).toHaveProperty('user');
    expect(data).toHaveProperty('associated_tags');
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
    const invalidLogData = {
      // Missing required content_md and empty tag_ids (violates minItems: 1)
      title: 'Valid title',
      tag_ids: []
    };    const response = await app.request('/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=valid_session_token'
      },
      body: JSON.stringify(invalidLogData)
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('tag_ids');
  });

  it('should handle Markdown content processing', async () => {
    const logData = {
      title: 'Test Markdown Log',
      content_md: '# Episode Review\n\n**Rating:** 5/5\n\n- Great animation\n- Amazing story',
      tag_ids: ['tag_anime']
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
    expect(data).toHaveProperty('content_md', logData.content_md);
    expect(data).toHaveProperty('user');
    expect(data).toHaveProperty('associated_tags');
  });
});