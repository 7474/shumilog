import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DmmAffiliateService } from '../../src/services/DmmAffiliateService';

describe('DmmAffiliateService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchAdvertisements', () => {
    it('should return empty array when no keywords provided', async () => {
      const service = new DmmAffiliateService({
        apiId: 'test-api-id',
        affiliateId: 'test-affiliate-id'
      });

      const result = await service.searchAdvertisements([]);

      expect(result).toEqual([]);
    });

    it('should fetch advertisements from DMM API with AND search first', async () => {
      const mockResponse = {
        result: {
          status: 200,
          result_count: 3,
          total_count: 100,
          first_position: 1,
          items: [
            {
              service_name: 'FANZA',
              floor_name: 'Digital',
              category_name: 'Anime',
              content_id: 'content_123',
              product_id: 'product_123',
              title: 'Test Anime Product',
              URL: 'https://dmm.com/product/123',
              affiliateURL: 'https://affiliate.dmm.com/product/123',
              imageURL: {
                list: 'https://dmm.com/image/123_list.jpg',
                small: 'https://dmm.com/image/123_small.jpg',
                large: 'https://dmm.com/image/123_large.jpg'
              },
              prices: {
                price: '1980円'
              }
            },
            {
              service_name: 'FANZA',
              floor_name: 'Digital',
              category_name: 'Game',
              content_id: 'content_456',
              product_id: 'product_456',
              title: 'Test Game Product',
              URL: 'https://dmm.com/product/456',
              affiliateURL: 'https://affiliate.dmm.com/product/456',
              imageURL: {
                list: 'https://dmm.com/image/456_list.jpg',
                small: 'https://dmm.com/image/456_small.jpg',
                large: 'https://dmm.com/image/456_large.jpg'
              }
            },
            {
              service_name: 'FANZA',
              floor_name: 'Digital',
              category_name: 'Novel',
              content_id: 'content_789',
              product_id: 'product_789',
              title: 'Test Novel Product',
              URL: 'https://dmm.com/product/789',
              affiliateURL: 'https://affiliate.dmm.com/product/789',
              imageURL: {
                list: 'https://dmm.com/image/789_list.jpg',
                small: 'https://dmm.com/image/789_small.jpg',
                large: 'https://dmm.com/image/789_large.jpg'
              }
            }
          ]
        }
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const service = new DmmAffiliateService({
        apiId: 'test-api-id',
        affiliateId: 'test-affiliate-id'
      });

      const result = await service.searchAdvertisements(['anime', 'game'], 5);

      // AND検索が最初に呼ばれ、十分な結果があるので1回のみ
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const fetchCall = (global.fetch as any).mock.calls[0][0];
      // URLSearchParams uses + for space encoding
      expect(fetchCall).toContain('keyword=anime+game');
      expect(fetchCall).toContain('sort=rank');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        productId: 'product_123',
        title: 'Test Anime Product',
        imageUrl: 'https://dmm.com/image/123_small.jpg',
        affiliateUrl: 'https://affiliate.dmm.com/product/123',
        price: '1980円',
        serviceName: 'FANZA'
      });
      expect(result[1]).toEqual({
        productId: 'product_456',
        title: 'Test Game Product',
        imageUrl: 'https://dmm.com/image/456_small.jpg',
        affiliateUrl: 'https://affiliate.dmm.com/product/456',
        price: undefined,
        serviceName: 'FANZA'
      });
      expect(result[2]).toEqual({
        productId: 'product_789',
        title: 'Test Novel Product',
        imageUrl: 'https://dmm.com/image/789_small.jpg',
        affiliateUrl: 'https://affiliate.dmm.com/product/789',
        price: undefined,
        serviceName: 'FANZA'
      });
    });

    it('should fall back to OR search when AND search returns insufficient results', async () => {
      const andResponse = {
        result: {
          status: 200,
          result_count: 1,
          total_count: 1,
          first_position: 1,
          items: [
            {
              service_name: 'FANZA',
              floor_name: 'Digital',
              category_name: 'Anime',
              content_id: 'content_123',
              product_id: 'product_123',
              title: 'Anime and Game Product',
              URL: 'https://dmm.com/product/123',
              affiliateURL: 'https://affiliate.dmm.com/product/123',
              imageURL: {
                list: 'https://dmm.com/image/123_list.jpg',
                small: 'https://dmm.com/image/123_small.jpg',
                large: 'https://dmm.com/image/123_large.jpg'
              },
              prices: {
                price: '1980円'
              }
            }
          ]
        }
      };

      const orResponse = {
        result: {
          status: 200,
          result_count: 3,
          total_count: 100,
          first_position: 1,
          items: [
            {
              service_name: 'FANZA',
              floor_name: 'Digital',
              category_name: 'Anime',
              content_id: 'content_123',
              product_id: 'product_123',
              title: 'Anime and Game Product',
              URL: 'https://dmm.com/product/123',
              affiliateURL: 'https://affiliate.dmm.com/product/123',
              imageURL: {
                list: 'https://dmm.com/image/123_list.jpg',
                small: 'https://dmm.com/image/123_small.jpg',
                large: 'https://dmm.com/image/123_large.jpg'
              },
              prices: {
                price: '1980円'
              }
            },
            {
              service_name: 'FANZA',
              floor_name: 'Digital',
              category_name: 'Anime',
              content_id: 'content_456',
              product_id: 'product_456',
              title: 'Anime Only Product',
              URL: 'https://dmm.com/product/456',
              affiliateURL: 'https://affiliate.dmm.com/product/456',
              imageURL: {
                list: 'https://dmm.com/image/456_list.jpg',
                small: 'https://dmm.com/image/456_small.jpg',
                large: 'https://dmm.com/image/456_large.jpg'
              }
            },
            {
              service_name: 'FANZA',
              floor_name: 'Digital',
              category_name: 'Game',
              content_id: 'content_789',
              product_id: 'product_789',
              title: 'Game Only Product',
              URL: 'https://dmm.com/product/789',
              affiliateURL: 'https://affiliate.dmm.com/product/789',
              imageURL: {
                list: 'https://dmm.com/image/789_list.jpg',
                small: 'https://dmm.com/image/789_small.jpg',
                large: 'https://dmm.com/image/789_large.jpg'
              }
            }
          ]
        }
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => andResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => orResponse
        } as Response);

      const service = new DmmAffiliateService({
        apiId: 'test-api-id',
        affiliateId: 'test-affiliate-id'
      });

      const result = await service.searchAdvertisements(['anime', 'game'], 5);

      // AND検索とOR検索の両方が呼ばれることを確認
      expect(global.fetch).toHaveBeenCalledTimes(2);
      
      const andCall = (global.fetch as any).mock.calls[0][0];
      expect(andCall).toContain('keyword=anime+game'); // URLSearchParams uses + for space
      expect(andCall).toContain('sort=rank');
      
      const orCall = (global.fetch as any).mock.calls[1][0];
      expect(orCall).toContain('keyword=anime%7Cgame'); // %7C is URL-encoded |
      expect(orCall).toContain('sort=rank');

      // 重複を除いた結果が返されることを確認
      expect(result).toHaveLength(3);
      expect(result[0].productId).toBe('product_123');
      expect(result[1].productId).toBe('product_456');
      expect(result[2].productId).toBe('product_789');
    });

    it('should return empty array when API returns error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      } as Response);

      const service = new DmmAffiliateService({
        apiId: 'test-api-id',
        affiliateId: 'test-affiliate-id'
      });

      const result = await service.searchAdvertisements(['anime']);

      expect(result).toEqual([]);
    });

    it('should return empty array when API returns non-200 status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            status: 400,
            result_count: 0,
            total_count: 0,
            first_position: 0
          }
        })
      } as Response);

      const service = new DmmAffiliateService({
        apiId: 'test-api-id',
        affiliateId: 'test-affiliate-id'
      });

      const result = await service.searchAdvertisements(['anime']);

      expect(result).toEqual([]);
    });

    it('should handle fetch errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const service = new DmmAffiliateService({
        apiId: 'test-api-id',
        affiliateId: 'test-affiliate-id'
      });

      const result = await service.searchAdvertisements(['anime']);

      expect(result).toEqual([]);
    });
  });

  describe('getCreditText', () => {
    it('should return DMM affiliate credit text', () => {
      const service = new DmmAffiliateService({
        apiId: 'test-api-id',
        affiliateId: 'test-affiliate-id'
      });

      const creditText = service.getCreditText();

      expect(creditText).toContain('Powered by');
      expect(creditText).toContain('DMM.com Webサービス');
      expect(creditText).toContain('href');
    });
  });

  describe('cache functionality', () => {
    it('should use cache when available and return cached response', async () => {
      const mockResponse = {
        result: {
          status: 200,
          result_count: 1,
          total_count: 1,
          first_position: 1,
          items: [
            {
              service_name: 'FANZA',
              floor_name: 'Digital',
              category_name: 'Anime',
              content_id: 'content_cached',
              product_id: 'product_cached',
              title: 'Cached Product',
              URL: 'https://dmm.com/product/cached',
              affiliateURL: 'https://affiliate.dmm.com/product/cached',
              imageURL: {
                list: 'https://dmm.com/image/cached_list.jpg',
                small: 'https://dmm.com/image/cached_small.jpg',
                large: 'https://dmm.com/image/cached_large.jpg'
              }
            }
          ]
        }
      };

      // Create a proper Response mock that can be cloned and read multiple times
      const mockResponseBody = JSON.stringify(mockResponse);
      
      // Return a new Response object each time to avoid body exhaustion
      const mockCacheMatch = vi.fn().mockImplementation(() => 
        Promise.resolve(new Response(mockResponseBody, {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }))
      );
      const mockCachePut = vi.fn();

      global.caches = {
        default: {
          match: mockCacheMatch,
          put: mockCachePut
        }
      } as any;

      // Mock fetch (should not be called if cache hits)
      global.fetch = vi.fn();

      const service = new DmmAffiliateService({
        apiId: 'test-api-id',
        affiliateId: 'test-affiliate-id'
      });

      const result = await service.searchAdvertisements(['cached', 'anime'], 5);

      // Should use cache (called twice for AND and OR search strategies)
      expect(mockCacheMatch.mock.calls.length).toBeGreaterThan(0);
      // Should not call fetch
      expect(global.fetch).not.toHaveBeenCalled();
      // Should not put to cache (already cached)
      expect(mockCachePut).not.toHaveBeenCalled();
      
      // Should return cached result
      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('product_cached');
      expect(result[0].title).toBe('Cached Product');
    });

    it('should fetch and cache response when cache misses', async () => {
      const mockResponse = {
        result: {
          status: 200,
          result_count: 1,
          total_count: 1,
          first_position: 1,
          items: [
            {
              service_name: 'FANZA',
              floor_name: 'Digital',
              category_name: 'Anime',
              content_id: 'content_fresh',
              product_id: 'product_fresh',
              title: 'Fresh Product',
              URL: 'https://dmm.com/product/fresh',
              affiliateURL: 'https://affiliate.dmm.com/product/fresh',
              imageURL: {
                list: 'https://dmm.com/image/fresh_list.jpg',
                small: 'https://dmm.com/image/fresh_small.jpg',
                large: 'https://dmm.com/image/fresh_large.jpg'
              }
            }
          ]
        }
      };

      // Mock cache API - cache miss
      const mockCacheMatch = vi.fn().mockResolvedValue(undefined);
      const mockCachePut = vi.fn().mockResolvedValue(undefined);

      global.caches = {
        default: {
          match: mockCacheMatch,
          put: mockCachePut
        }
      } as any;

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        clone: () => ({
          body: null,
          clone: () => ({ body: null })
        }),
        json: async () => mockResponse
      } as Response);

      const service = new DmmAffiliateService({
        apiId: 'test-api-id',
        affiliateId: 'test-affiliate-id'
      });

      const result = await service.searchAdvertisements(['fresh', 'anime'], 5);

      // Should check cache first
      expect(mockCacheMatch).toHaveBeenCalled();
      // Should call fetch on cache miss
      expect(global.fetch).toHaveBeenCalled();
      // Should cache the response
      expect(mockCachePut).toHaveBeenCalled();
      
      // Check that cached response has Cache-Control header
      const cachedRequest = mockCachePut.mock.calls[0][0];
      const cachedResponse = mockCachePut.mock.calls[0][1];
      expect(cachedRequest).toBeInstanceOf(Request);
      expect(cachedResponse.headers.get('Cache-Control')).toBe('max-age=86400');
      
      // Should return fetched result
      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('product_fresh');
      expect(result[0].title).toBe('Fresh Product');
    });

    it('should work without cache API (e.g., in test environments)', async () => {
      const mockResponse = {
        result: {
          status: 200,
          result_count: 1,
          total_count: 1,
          first_position: 1,
          items: [
            {
              service_name: 'FANZA',
              floor_name: 'Digital',
              category_name: 'Anime',
              content_id: 'content_nocache',
              product_id: 'product_nocache',
              title: 'No Cache Product',
              URL: 'https://dmm.com/product/nocache',
              affiliateURL: 'https://affiliate.dmm.com/product/nocache',
              imageURL: {
                list: 'https://dmm.com/image/nocache_list.jpg',
                small: 'https://dmm.com/image/nocache_small.jpg',
                large: 'https://dmm.com/image/nocache_large.jpg'
              }
            }
          ]
        }
      };

      // Simulate cache API not available
      global.caches = undefined as any;

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse
      } as Response);

      const service = new DmmAffiliateService({
        apiId: 'test-api-id',
        affiliateId: 'test-affiliate-id'
      });

      const result = await service.searchAdvertisements(['nocache'], 5);

      // Should call fetch directly without cache
      expect(global.fetch).toHaveBeenCalled();
      
      // Should return result
      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('product_nocache');
      expect(result[0].title).toBe('No Cache Product');
    });

    it('should continue to return response even if caching fails', async () => {
      const mockResponse = {
        result: {
          status: 200,
          result_count: 1,
          total_count: 1,
          first_position: 1,
          items: [
            {
              service_name: 'FANZA',
              floor_name: 'Digital',
              category_name: 'Anime',
              content_id: 'content_cachefail',
              product_id: 'product_cachefail',
              title: 'Cache Fail Product',
              URL: 'https://dmm.com/product/cachefail',
              affiliateURL: 'https://affiliate.dmm.com/product/cachefail',
              imageURL: {
                list: 'https://dmm.com/image/cachefail_list.jpg',
                small: 'https://dmm.com/image/cachefail_small.jpg',
                large: 'https://dmm.com/image/cachefail_large.jpg'
              }
            }
          ]
        }
      };

      // Mock cache API - put fails
      const mockCacheMatch = vi.fn().mockResolvedValue(undefined);
      const mockCachePut = vi.fn().mockRejectedValue(new Error('Cache storage full'));

      global.caches = {
        default: {
          match: mockCacheMatch,
          put: mockCachePut
        }
      } as any;

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        clone: () => ({
          body: null,
          clone: () => ({ body: null })
        }),
        json: async () => mockResponse
      } as Response);

      const service = new DmmAffiliateService({
        apiId: 'test-api-id',
        affiliateId: 'test-affiliate-id'
      });

      const result = await service.searchAdvertisements(['cachefail'], 5);

      // Should attempt to cache
      expect(mockCachePut).toHaveBeenCalled();
      
      // Should still return result even if caching fails
      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('product_cachefail');
      expect(result[0].title).toBe('Cache Fail Product');
    });
  });
});
