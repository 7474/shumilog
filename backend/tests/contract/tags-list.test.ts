import { describe, it, expect } from 'vitest';
import { app } from '../helpers/app';

describe('Contract: GET /tags', () => {
  it('should return paginated list of tags', async () => {
    const response = await app.request('/tags', {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    
    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('limit');
    expect(data).toHaveProperty('offset');
    
    expect(Array.isArray(data.items)).toBe(true);
    expect(typeof data.total).toBe('number');
    expect(typeof data.limit).toBe('number');
    expect(typeof data.offset).toBe('number');
    
    // Default pagination
    expect(data.limit).toBe(20);
    expect(data.offset).toBe(0);
  });

  it('should handle search parameter', async () => {
    const response = await app.request('/tags?search=anime', {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('items');
  });

  it('should handle custom pagination', async () => {
    const response = await app.request('/tags?limit=10&offset=5', {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.limit).toBe(10);
    expect(data.offset).toBe(5);
  });

  it('should enforce maximum limit', async () => {
    const response = await app.request('/tags?limit=200', {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.limit).toBeLessThanOrEqual(100);
  });
});