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

    it('should fetch advertisements from DMM API', async () => {
      const mockResponse = {
        result: {
          status: 200,
          result_count: 2,
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

      expect(result).toHaveLength(2);
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
