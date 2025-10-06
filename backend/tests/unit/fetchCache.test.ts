import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { cachedFetch, invalidateCache } from '../../src/utils/fetchCache.js';

// Mock Cache API
const createMockCache = () => {
  const store = new Map<string, Response>();
  
  return {
    match: vi.fn(async (request: Request | string) => {
      const url = typeof request === 'string' ? request : request.url;
      return store.get(url) || null;
    }),
    put: vi.fn(async (request: Request | string, response: Response) => {
      const url = typeof request === 'string' ? request : request.url;
      store.set(url, response);
    }),
    delete: vi.fn(async (request: Request | string) => {
      const url = typeof request === 'string' ? request : request.url;
      const existed = store.has(url);
      store.delete(url);
      return existed;
    }),
    _store: store // For testing purposes
  };
};

describe('fetchCache', () => {
  let mockCache: ReturnType<typeof createMockCache>;
  let originalCaches: any;
  let originalFetch: any;

  beforeEach(() => {
    // Setup mock cache
    mockCache = createMockCache();
    originalCaches = global.caches;
    (global as any).caches = {
      default: mockCache
    };

    // Setup mock fetch
    originalFetch = global.fetch;
    global.fetch = vi.fn(async (url: string | URL) => {
      return new Response(JSON.stringify({ data: 'test data', url: url.toString() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }) as any;
  });

  afterEach(() => {
    // Restore
    (global as any).caches = originalCaches;
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('cachedFetch', () => {
    it('最初の呼び出しではfetchが実行されキャッシュに保存される', async () => {
      const url = 'https://api.example.com/data';
      
      const response = await cachedFetch(url);
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(url, undefined);
      expect(mockCache.match).toHaveBeenCalled();
      expect(mockCache.put).toHaveBeenCalled();
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.data).toBe('test data');
    });

    it('2回目の呼び出しではキャッシュから返される', async () => {
      const url = 'https://api.example.com/data';
      
      // First call
      await cachedFetch(url);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      // Second call should hit cache
      vi.clearAllMocks();
      const response = await cachedFetch(url);
      
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockCache.match).toHaveBeenCalled();
      expect(response.ok).toBe(true);
    });

    it('カスタムキャッシュキーが使用できる', async () => {
      const url = 'https://api.example.com/data?param=123';
      const cacheKey = 'custom:key:123';
      
      await cachedFetch(url, undefined, { cacheKey });
      
      // Check that cache was called with the custom key
      const calls = mockCache.match.mock.calls;
      const matchedUrl = calls[0][0];
      expect(matchedUrl.toString()).toContain(cacheKey);
    });

    it('カスタムTTLが設定できる', async () => {
      const url = 'https://api.example.com/data';
      const ttl = 7200; // 2 hours
      
      await cachedFetch(url, undefined, { ttl });
      
      // Check that cache was called
      expect(mockCache.put).toHaveBeenCalled();
      
      // Get the cached response from the put call
      const putCalls = mockCache.put.mock.calls;
      const cachedResponse = putCalls[0][1] as Response;
      const cacheControl = cachedResponse.headers.get('Cache-Control');
      
      expect(cacheControl).toContain(`max-age=${ttl}`);
    });

    it('デフォルトTTLは3600秒', async () => {
      const url = 'https://api.example.com/data';
      
      await cachedFetch(url);
      
      const putCalls = mockCache.put.mock.calls;
      const cachedResponse = putCalls[0][1] as Response;
      const cacheControl = cachedResponse.headers.get('Cache-Control');
      
      expect(cacheControl).toContain('max-age=3600');
    });

    it('エラーレスポンスはキャッシュされない', async () => {
      const url = 'https://api.example.com/error';
      
      global.fetch = vi.fn(async () => {
        return new Response('Not Found', { status: 404 });
      }) as any;
      
      await cachedFetch(url);
      
      expect(mockCache.put).not.toHaveBeenCalled();
    });

    it('Cache APIが利用できない場合は通常のfetchが実行される', async () => {
      // Remove caches
      (global as any).caches = undefined;
      
      const url = 'https://api.example.com/data';
      const response = await cachedFetch(url);
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(response.ok).toBe(true);
    });

    it('fetchのinit optionsが渡される', async () => {
      const url = 'https://api.example.com/data';
      const init: globalThis.RequestInit = {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer token'
        }
      };
      
      await cachedFetch(url, init);
      
      expect(global.fetch).toHaveBeenCalledWith(url, init);
    });
  });

  describe('invalidateCache', () => {
    it('指定したキャッシュを削除できる', async () => {
      const cacheKey = 'test:key';
      
      // First, add something to cache
      await cachedFetch('https://api.example.com/data', undefined, { cacheKey });
      
      // Then invalidate it
      const result = await invalidateCache(cacheKey);
      
      expect(result).toBe(true);
      expect(mockCache.delete).toHaveBeenCalled();
    });

    it('Cache APIが利用できない場合はfalseを返す', async () => {
      (global as any).caches = undefined;
      
      const result = await invalidateCache('test:key');
      
      expect(result).toBe(false);
    });
  });
});
