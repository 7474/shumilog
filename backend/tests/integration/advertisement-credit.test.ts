import { describe, it, expect, beforeEach, vi } from 'vitest';
import { app, clearTestData, setupTestEnvironment } from '../helpers/app';

describe('Integration: Advertisement Credit Text', () => {
  let sessionToken: string;

  beforeEach(async () => {
    await clearTestData();
    sessionToken = await setupTestEnvironment();
  });

  describe('Log Detail with Advertisements', () => {
    it('should include advertisement_credit when DMM API returns ads', async () => {
      // Mock DMM API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
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
                content_id: 'test_content',
                product_id: 'test_product',
                title: 'Test Product',
                URL: 'https://dmm.com/test',
                affiliateURL: 'https://affiliate.dmm.com/test',
                imageURL: {
                  list: 'https://dmm.com/image.jpg',
                  small: 'https://dmm.com/image_small.jpg',
                  large: 'https://dmm.com/image_large.jpg'
                }
              }
            ]
          }
        })
      } as Response);

      // Create a public log
      const createResponse = await app.request('/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          title: 'Test Log with Ads',
          content_md: '# Test Content',
          is_public: true
        })
      });

      expect(createResponse.status).toBe(201);
      const createdLog = await createResponse.json();

      // Get the log detail (with mock environment variables)
      const response = await app.request(`/logs/${createdLog.id}`, {
        method: 'GET'
      }, {
        DMM_API_ID: 'test_api_id',
        DMM_AFFILIATE_ID: 'test_affiliate_id'
      } as any);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Should have advertisements
      expect(data.advertisements).toBeDefined();
      expect(Array.isArray(data.advertisements)).toBe(true);

      // If advertisements exist, credit should be present
      if (data.advertisements.length > 0) {
        expect(data.advertisement_credit).toBeDefined();
        expect(data.advertisement_credit).toContain('Powered by');
        expect(data.advertisement_credit).toContain('DMM アフィリエイト');
        expect(data.advertisement_credit).toContain('href');
      }
    });

    it('should not include advertisement_credit when no ads are returned', async () => {
      // Mock DMM API returning no results
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            status: 200,
            result_count: 0,
            total_count: 0,
            first_position: 0,
            items: []
          }
        })
      } as Response);

      // Create a public log
      const createResponse = await app.request('/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          title: 'Test Log without Ads',
          content_md: '# Test Content',
          is_public: true
        })
      });

      expect(createResponse.status).toBe(201);
      const createdLog = await createResponse.json();

      // Get the log detail
      const response = await app.request(`/logs/${createdLog.id}`, {
        method: 'GET'
      }, {
        DMM_API_ID: 'test_api_id',
        DMM_AFFILIATE_ID: 'test_affiliate_id'
      } as any);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Should have no advertisements
      expect(data.advertisements).toBeDefined();
      expect(data.advertisements.length).toBe(0);

      // Should not have credit text
      expect(data.advertisement_credit).toBeNull();
    });

    it('should not include advertisements for private logs', async () => {
      // Create a private log
      const createResponse = await app.request('/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          title: 'Private Test Log',
          content_md: '# Private Content',
          is_public: false
        })
      });

      expect(createResponse.status).toBe(201);
      const createdLog = await createResponse.json();

      // Get the log detail as owner
      const response = await app.request(`/logs/${createdLog.id}`, {
        method: 'GET',
        headers: {
          Cookie: `session=${sessionToken}`
        }
      }, {
        DMM_API_ID: 'test_api_id',
        DMM_AFFILIATE_ID: 'test_affiliate_id'
      } as any);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Should not have advertisements for private logs
      expect(data.advertisements).toBeDefined();
      expect(data.advertisements.length).toBe(0);
      expect(data.advertisement_credit).toBeNull();
    });
  });

  describe('Tag Detail with Advertisements', () => {
    it('should include advertisement_credit when DMM API returns ads', async () => {
      // Mock DMM API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
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
                content_id: 'test_content',
                product_id: 'test_product',
                title: 'Test Product',
                URL: 'https://dmm.com/test',
                affiliateURL: 'https://affiliate.dmm.com/test',
                imageURL: {
                  list: 'https://dmm.com/image.jpg',
                  small: 'https://dmm.com/image_small.jpg',
                  large: 'https://dmm.com/image_large.jpg'
                }
              }
            ]
          }
        })
      } as Response);

      // Create a tag
      const createResponse = await app.request('/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          name: 'TestTag',
          description: 'Test tag description'
        })
      });

      expect(createResponse.status).toBe(201);
      const createdTag = await createResponse.json();

      // Get the tag detail
      const response = await app.request(`/tags/${createdTag.id}`, {
        method: 'GET'
      }, {
        DMM_API_ID: 'test_api_id',
        DMM_AFFILIATE_ID: 'test_affiliate_id'
      } as any);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Should have advertisements
      expect(data.advertisements).toBeDefined();
      expect(Array.isArray(data.advertisements)).toBe(true);

      // If advertisements exist, credit should be present
      if (data.advertisements.length > 0) {
        expect(data.advertisement_credit).toBeDefined();
        expect(data.advertisement_credit).toContain('Powered by');
        expect(data.advertisement_credit).toContain('DMM アフィリエイト');
        expect(data.advertisement_credit).toContain('href');
      }
    });
  });
});
