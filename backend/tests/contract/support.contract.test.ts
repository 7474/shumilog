import { describe, it, expect, beforeEach } from 'vitest';
import { app, clearTestData, setupTestEnvironment } from '../helpers/app';

describe('Contract: Support routes', () => {
  let sessionToken: string;

  beforeEach(async () => {
    await clearTestData();
    sessionToken = await setupTestEnvironment();
  });

  describe('POST /support/tags', () => {
    it('should work with /api prefix and session cookie', async () => {
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

      console.log('Response status:', response.status);
      const body = await response.text();
      console.log('Response body:', body);

      expect(response.status).toBe(200);
    });

    it('should work without /api prefix and session cookie', async () => {
      const response = await app.request('/support/tags', {
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

      console.log('Response status:', response.status);
      const body = await response.text();
      console.log('Response body:', body);

      expect(response.status).toBe(200);
    });

    it('should require authentication', async () => {
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
    });
  });
});
