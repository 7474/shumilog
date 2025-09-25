import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';

const mockApp = new Hono();

describe('Contract: GET /logs', () => {
  it('should return paginated list of public logs', async () => {
    const response = await mockApp.request('/logs', {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    
    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total');
    
    expect(Array.isArray(data.items)).toBe(true);
    expect(typeof data.total).toBe('number');
    
    // Each log should have expected structure
    if (data.items.length > 0) {
      const log = data.items[0];
      expect(log).toHaveProperty('id');
      expect(log).toHaveProperty('user');
      expect(log).toHaveProperty('associated_tags');
      expect(log).toHaveProperty('title');
      expect(log).toHaveProperty('content_md');
      expect(log).toHaveProperty('created_at');
      expect(log).toHaveProperty('updated_at');
      
      expect(Array.isArray(log.associated_tags)).toBe(true);
    }
  });

  it('should filter by tag_ids', async () => {
    const response = await mockApp.request('/logs?tag_ids=tag1,tag2', {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('items');
  });

  it('should filter by user_id', async () => {
    const response = await mockApp.request('/logs?user_id=user123', {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('items');
  });

  it('should handle pagination parameters', async () => {
    const response = await mockApp.request('/logs?limit=10&offset=20', {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('items');
  });
});