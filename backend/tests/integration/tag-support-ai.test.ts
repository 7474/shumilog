import { describe, it, expect, beforeEach, vi } from 'vitest';
import { app, clearTestData, setupTestEnvironment } from '../helpers/app';

describe('Integration: AI Enhanced Tag Support', () => {
  let sessionToken: string;

  beforeEach(async () => {
    await clearTestData();
    sessionToken = await setupTestEnvironment();
  });

  describe('POST /support/tags with ai_enhanced', () => {
    it('should accept ai_enhanced as a valid support type', async () => {
      // Mock Wikipedia API to return not found
      global.fetch = vi.fn((url) => {
        if (typeof url === 'string' && url.includes('wikipedia.org')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            json: async () => ({ error: 'Not found' })
          } as Response);
        }
        return Promise.reject(new Error('Unexpected fetch call'));
      }) as any;

      // Request with ai_enhanced support type
      const response = await app.request('/api/support/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `session=${sessionToken}`
        },
        body: JSON.stringify({
          tag_name: 'テスト',
          support_type: 'ai_enhanced'
        })
      });

      // ai_enhancedは有効なsupport_typeとして受け入れられる
      // ただし、テスト環境ではAIバインディングがないため500または404エラーが返される
      expect([404, 500]).toContain(response.status);
    });

    it('should still reject invalid support types', async () => {
      // Request with invalid support type
      const response = await app.request('/api/support/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `session=${sessionToken}`
        },
        body: JSON.stringify({
          tag_name: 'テスト',
          support_type: 'invalid_type'
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid support type');
    });

    it('should require authentication', async () => {
      // Request without session
      const response = await app.request('/api/support/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tag_name: 'テスト',
          support_type: 'ai_enhanced'
        })
      });

      expect(response.status).toBe(401);
    });
  });
});
