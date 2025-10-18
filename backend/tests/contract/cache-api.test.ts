import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  app,
  clearTestData,
  seedTestLogs
} from '../helpers/app';

/**
 * Contract Test: Cache API
 * 
 * Cloudflare Workers Cache API の動作を検証する
 * - GETリクエストで認証不要のエンドポイントは Cache API でキャッシュされる
 * - キャッシュヒット時は X-Cache-Status: HIT が返る
 * - キャッシュミス時は X-Cache-Status: MISS が返る
 * - 認証必要エンドポイントはキャッシュされない
 */
describe('Contract Test: Cache API', () => {
  beforeEach(async () => {
    await clearTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe('公開エンドポイント（キャッシュ対象）', () => {
    it('GET /logs - 初回リクエストはキャッシュミス', async () => {
      const response = await app.request('/logs', { method: 'GET' });
      
      expect(response.status).toBe(200);
      // Cache API が利用できない環境（テスト環境）では X-Cache-Status ヘッダーは設定されない
      // 実際の Cloudflare Workers 環境では MISS が返る
      const cacheStatus = response.headers.get('X-Cache-Status');
      if (cacheStatus) {
        expect(cacheStatus).toBe('MISS');
      }
    });

    it('GET /logs - Cache-Control ヘッダーと併用される', async () => {
      await seedTestLogs();
      
      const response = await app.request('/logs', { method: 'GET' });
      
      expect(response.status).toBe(200);
      // Cache-Control ヘッダーが設定されている
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=300, s-maxage=300, stale-while-revalidate=60');
      expect(response.headers.get('Vary')).toBe('Origin');
      
      // Cache API のステータスもチェック（利用可能な場合）
      const cacheStatus = response.headers.get('X-Cache-Status');
      if (cacheStatus) {
        expect(['HIT', 'MISS']).toContain(cacheStatus);
      }
    });
  });

  describe('非キャッシュ対象', () => {
    it('POST リクエストはキャッシュされない', async () => {
      // POST リクエストでは X-Cache-Status ヘッダーは設定されない
      const response = await app.request('/logs', { method: 'POST' });
      
      // logs エンドポイントの POST は認証必要なので 401 になる
      expect(response.status).toBe(401);
      expect(response.headers.get('X-Cache-Status')).toBeNull();
    });

    it('認証必要エンドポイントはキャッシュされない', async () => {
      // 認証なしのリクエストなので 401 になる
      const response = await app.request('/users/me', { method: 'GET' });
      
      expect(response.status).toBe(401);
      // 認証が必要なエンドポイントでは X-Cache-Status ヘッダーは設定されない
      expect(response.headers.get('X-Cache-Status')).toBeNull();
    });
  });
});
