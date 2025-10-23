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
});
