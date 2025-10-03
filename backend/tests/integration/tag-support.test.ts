import { describe, it, expect, beforeEach, vi } from 'vitest';
import { app, clearTestData, setupTestEnvironment } from '../helpers/app';

// Mock Wikipedia API responses for testing
const mockWikipediaResponse = {
  extract: 'アニメは、日本で制作されたアニメーションの総称です。',
  content_urls: {
    desktop: {
      page: 'https://ja.wikipedia.org/wiki/%E3%82%A2%E3%83%8B%E3%83%A1'
    }
  }
};

describe('Integration: Tag Support Feature', () => {
  let sessionToken: string;

  beforeEach(async () => {
    await clearTestData();
    sessionToken = await setupTestEnvironment();
    
    // Mock global fetch for Wikipedia API
    global.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.includes('wikipedia.org')) {
        if (url.includes('xyzabc123notexist999')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            json: async () => ({ error: 'Not found' })
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockWikipediaResponse
        } as Response);
      }
      return Promise.reject(new Error('Unexpected fetch call'));
    }) as any;
  });

  describe('POST /support/tags', () => {
    it('should get Wikipedia summary with CC attribution link in content', async () => {
      // Request Wikipedia summary
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

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('content');
      expect(data).toHaveProperty('support_type', 'wikipedia_summary');
      expect(typeof data.content).toBe('string');
      expect(data.content.length).toBeGreaterThan(0);
      
      // Verify that the Wikipedia attribution link is included in the content
      expect(data.content).toContain('出典: [Wikipedia]');
      expect(data.content).toContain('https://ja.wikipedia.org/wiki/');
    });

    it('should work for new tags not yet in database', async () => {
      // Request support for a tag that doesn't exist in database yet
      const response = await app.request('/api/support/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `session=${sessionToken}`
        },
        body: JSON.stringify({
          tag_name: 'マンガ',
          support_type: 'wikipedia_summary'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('content');
    });

    it('should require authentication', async () => {
      // Request without session
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

    it('should validate support type', async () => {
      // Request with invalid support type
      const response = await app.request('/api/support/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `session=${sessionToken}`
        },
        body: JSON.stringify({
          tag_name: 'アニメ',
          support_type: 'invalid_type'
        })
      });

      expect(response.status).toBe(400);
    });

    it('should require support_type in request body', async () => {
      // Request without support_type
      const response = await app.request('/api/support/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `session=${sessionToken}`
        },
        body: JSON.stringify({
          tag_name: 'アニメ'
        })
      });

      expect(response.status).toBe(400);
    });

    it('should require tag_name in request body', async () => {
      // Request without tag_name
      const response = await app.request('/api/support/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `session=${sessionToken}`
        },
        body: JSON.stringify({
          support_type: 'wikipedia_summary'
        })
      });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent Wikipedia pages', async () => {
      // Request with a tag name that definitely doesn't have a Wikipedia page
      const response = await app.request('/api/support/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `session=${sessionToken}`
        },
        body: JSON.stringify({
          tag_name: 'xyzabc123notexist999',
          support_type: 'wikipedia_summary'
        })
      });

      expect(response.status).toBe(404);
    });
  });
});
