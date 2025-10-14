import { describe, it, expect, beforeEach } from 'vitest';
import { app, clearTestData, setupTestEnvironment } from '../helpers/app';

describe('Contract: Support routes', () => {
  let sessionToken: string;

  beforeEach(async () => {
    await clearTestData();
    sessionToken = await setupTestEnvironment();
  });

  describe('POST /support/tags', () => {
    // NOTE: These tests verify authentication is required but skip Wikipedia API calls
    // Wikipedia API calls may fail in test environment due to network restrictions
    // The actual Wikipedia integration is tested in integration tests with proper mocking

    it('should require authentication for /api prefix', async () => {
      const response = await app.request('/api/support/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tag_name: 'アニメ',
          support_type: 'wikipedia_summary'
        })
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should require authentication for root path', async () => {
      const response = await app.request('/support/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tag_name: 'アニメ',
          support_type: 'wikipedia_summary'
        })
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should accept authenticated requests with session cookie', async () => {
      const response = await app.request('/api/support/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `session=${sessionToken}`
        },
        body: JSON.stringify({
          tag_name: 'アニメ',
          support_type: 'wikipedia_summary'
        })
      });

      // Should not be 401 - either 200 (success) or 404/500 (Wikipedia API issues)
      expect(response.status).not.toBe(401);
    });

    it('should return 400 for invalid request body', async () => {
      const response = await app.request('/api/support/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `session=${sessionToken}`
        },
        body: JSON.stringify({
          // Missing required fields
        })
      });

      expect(response.status).toBe(400);
    });
  });
});
