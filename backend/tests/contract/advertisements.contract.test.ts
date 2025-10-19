import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  app,
  clearTestData,
  seedTestLogs
} from '../helpers/app';

describe('Advertisements API Contract Tests', () => {
  beforeEach(async () => {
    await clearTestData();
    await seedTestLogs();
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe('GET /advertisements/logs/:logId', () => {
    it('should return advertisements for a log', async () => {
      const response = await app.request('/advertisements/logs/log_public_entry');

      if (response.status !== 200) {
        const errorData = await response.text();
        console.error('Error response status:', response.status);
        console.error('Error response body:', errorData);
      }

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('items');
      expect(Array.isArray(data.items)).toBe(true);
    });

    it('should return 404 for non-existent log', async () => {
      const response = await app.request('/advertisements/logs/non_existent_log');

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should respect limit parameter', async () => {
      const response = await app.request('/advertisements/logs/log_public_entry?limit=2');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.items.length).toBeLessThanOrEqual(2);
    });

    it('should cap limit at 10', async () => {
      const response = await app.request('/advertisements/logs/log_public_entry?limit=100');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.items.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /advertisements/tags/:tagId', () => {
    it('should return advertisements for a tag by name', async () => {
      const response = await app.request('/advertisements/tags/Anime');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('items');
      expect(Array.isArray(data.items)).toBe(true);
    });

    it('should return advertisements for a tag by ID', async () => {
      // タグIDを取得
      const tagsResponse = await app.request('/tags');
      const tagsData = await tagsResponse.json();
      const animeTag = tagsData.items.find((tag: any) => tag.name === 'Anime');

      if (animeTag) {
        const response = await app.request(`/advertisements/tags/${animeTag.id}`);

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('items');
        expect(Array.isArray(data.items)).toBe(true);
      }
    });

    it('should return 404 for non-existent tag', async () => {
      const response = await app.request('/advertisements/tags/NonExistentTag');

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should respect limit parameter', async () => {
      const response = await app.request('/advertisements/tags/Anime?limit=2');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.items.length).toBeLessThanOrEqual(2);
    });

    it('should cap limit at 10', async () => {
      const response = await app.request('/advertisements/tags/Anime?limit=100');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.items.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Advertisement schema validation', () => {
    it('should return advertisements with correct schema', async () => {
      const response = await app.request('/advertisements/logs/log_public_entry');

      expect(response.status).toBe(200);

      const data = await response.json();

      // 広告が返された場合、スキーマを検証
      if (data.items.length > 0) {
        const ad = data.items[0];
        expect(ad).toHaveProperty('productId');
        expect(ad).toHaveProperty('title');
        expect(ad).toHaveProperty('imageUrl');
        expect(ad).toHaveProperty('affiliateUrl');
        expect(typeof ad.productId).toBe('string');
        expect(typeof ad.title).toBe('string');
        expect(typeof ad.imageUrl).toBe('string');
        expect(typeof ad.affiliateUrl).toBe('string');
      }
    });
  });
});
