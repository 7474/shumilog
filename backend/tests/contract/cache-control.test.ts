import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  app,
  clearTestData,
  createTestSession,
  createTestUser,
  seedTestLogs
} from '../helpers/app';

/**
 * Contract Test: Cache Control Headers
 * 
 * キャッシュ制御ヘッダが正しく設定されることを検証する
 * - GETリクエストで認証不要のエンドポイントは5分間キャッシュ
 * - 認証必要エンドポイントはキャッシュしない
 * - Varyヘッダで CORS 以外の条件では同じ応答を返すことを示す
 */
describe('Contract Test: Cache Control Headers', () => {
  beforeEach(async () => {
    await clearTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe('公開エンドポイント（認証不要）', () => {
    it('GET /health - キャッシュヘッダが設定されている', async () => {
      const response = await app.request('/health', { method: 'GET' });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=300, stale-while-revalidate=60');
      expect(response.headers.get('Vary')).toBe('Origin');
    });

    it('GET /logs - キャッシュヘッダが設定されている', async () => {
      await seedTestLogs();
      
      const response = await app.request('/logs', { method: 'GET' });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=300, stale-while-revalidate=60');
      expect(response.headers.get('Vary')).toBe('Origin');
    });

    it('GET /logs/:id - キャッシュヘッダが設定されている', async () => {
      const { publicLogId } = await seedTestLogs();
      
      const response = await app.request(`/logs/${publicLogId}`, { method: 'GET' });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=300, stale-while-revalidate=60');
      expect(response.headers.get('Vary')).toBe('Origin');
    });

    it('GET /logs/:id（非公開ログ・オーナー）- キャッシュされない', async () => {
      const { privateLogId, ownerId } = await seedTestLogs();
      const sessionToken = await createTestSession(ownerId);
      
      const response = await app.request(`/logs/${privateLogId}`, {
        method: 'GET',
        headers: {
          Cookie: `session=${sessionToken}`
        }
      });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('private, no-cache, no-store, must-revalidate');
    });
  });

  describe('認証必要エンドポイント', () => {
    it('GET /users/me - 認証時はキャッシュされない', async () => {
      const userId = 'cache_test_user';
      await createTestUser(userId, 'Cache Test User');
      const sessionToken = await createTestSession(userId);
      
      const response = await app.request('/users/me', {
        method: 'GET',
        headers: {
          Cookie: `session=${sessionToken}`
        }
      });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('private, no-cache, no-store, must-revalidate');
    });

    it('POST /logs - 作成操作はキャッシュされない', async () => {
      const userId = 'cache_test_user2';
      await createTestUser(userId, 'Cache Test User 2');
      const sessionToken = await createTestSession(userId);
      
      const response = await app.request('/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          title: 'Test Log',
          content_md: '# Test Content',
          is_public: true
        })
      });
      
      expect(response.status).toBe(201);
      // POSTリクエストではキャッシュヘッダは設定されない（ミドルウェアでスキップ）
      expect(response.headers.get('Cache-Control')).toBeNull();
    });
  });

  describe('エラーレスポンス', () => {
    it('404エラーはキャッシュされない', async () => {
      const response = await app.request('/nonexistent', { method: 'GET' });
      
      expect(response.status).toBe(404);
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
    });

    it('401エラーはキャッシュされない', async () => {
      const response = await app.request('/users/me', { method: 'GET' });
      
      expect(response.status).toBe(401);
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
    });
  });
});
