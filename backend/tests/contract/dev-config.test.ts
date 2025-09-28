import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';

describe('Contract Test: GET /dev/config', () => {
  let app: Hono;

  beforeAll(async () => {
    // This will fail until we implement the endpoint
    try {
      const { createApp } = await import('../../src/index');
      app = createApp({});
    } catch (_error) {
      console.log('Expected failure: Dev config endpoint not implemented yet');
    }
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  it('should return 200 status with development configuration', async () => {
    // This test MUST fail initially (TDD approach)
    if (!app) {
      expect(false).toBe(true); // Force failure until implementation
      return;
    }

    const res = await app.request('/dev/config');
    
    expect(res.status).toBe(200);
    
    const json = await res.json();
    expect(json).toMatchObject({
      environment: 'development',
      services: expect.arrayContaining([
        expect.objectContaining({
          name: expect.any(String),
          status: expect.stringMatching(/running|stopped|starting|unhealthy/),
          ports: expect.any(Array),
          volumes: expect.any(Array)
        })
      ])
    });
  });

  it('should include all expected services', async () => {
    if (!app) {
      expect(false).toBe(true); // Force failure until implementation
      return;
    }

    const res = await app.request('/dev/config');
    const json = await res.json();
    
    const serviceNames = json.services.map((s: any) => s.name);
    expect(serviceNames).toEqual(expect.arrayContaining(['backend', 'frontend', 'database']));
  });

  it('should have correct content-type header', async () => {
    if (!app) {
      expect(false).toBe(true); // Force failure until implementation
      return;
    }

    const res = await app.request('/dev/config');
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('should only be available in development environment', async () => {
    if (!app) {
      expect(false).toBe(true); // Force failure until implementation
      return;
    }

    // This endpoint should only work when NODE_ENV=development
    const res = await app.request('/dev/config');
    
    if (process.env.NODE_ENV !== 'development') {
      expect(res.status).toBe(404);
    } else {
      expect(res.status).toBe(200);
    }
  });
});