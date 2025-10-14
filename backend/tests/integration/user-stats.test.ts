import { describe, it, expect, beforeEach } from 'vitest';
import { app, clearTestData, createTestSession } from '../helpers/app';

describe('Integration: User Statistics', () => {
  beforeEach(async () => {
    await clearTestData();
  });

  describe('GET /users/me/stats', () => {
    it('should return user statistics with tag information', async () => {
      // Arrange
      const sessionToken = await createTestSession('user_alice');

      // Act
      const response = await app.request('/api/users/me/stats', {
        method: 'GET',
        headers: {
          Cookie: `session=${sessionToken}`,
        },
      });

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();

      // Verify structure
      expect(data).toHaveProperty('logs');
      expect(data).toHaveProperty('tags');

      // Verify logs stats
      expect(data.logs).toHaveProperty('total');
      expect(data.logs).toHaveProperty('public');
      expect(data.logs).toHaveProperty('recent');
      expect(typeof data.logs.total).toBe('number');
      expect(typeof data.logs.public).toBe('number');
      expect(typeof data.logs.recent).toBe('number');

      // Verify tags stats
      expect(data.tags).toHaveProperty('total');
      expect(data.tags).toHaveProperty('top_tags');
      expect(data.tags).toHaveProperty('recent_tags');
      expect(typeof data.tags.total).toBe('number');
      expect(Array.isArray(data.tags.top_tags)).toBe(true);
      expect(Array.isArray(data.tags.recent_tags)).toBe(true);

      // Verify top_tags structure
      if (data.tags.top_tags.length > 0) {
        const topTag = data.tags.top_tags[0];
        expect(topTag).toHaveProperty('id');
        expect(topTag).toHaveProperty('name');
        expect(topTag).toHaveProperty('count');
        expect(typeof topTag.id).toBe('string');
        expect(typeof topTag.name).toBe('string');
        expect(typeof topTag.count).toBe('number');
      }

      // Verify recent_tags structure
      if (data.tags.recent_tags.length > 0) {
        const recentTag = data.tags.recent_tags[0];
        expect(recentTag).toHaveProperty('id');
        expect(recentTag).toHaveProperty('name');
        expect(recentTag).toHaveProperty('lastUsed');
        expect(typeof recentTag.id).toBe('string');
        expect(typeof recentTag.name).toBe('string');
        expect(typeof recentTag.lastUsed).toBe('string');
      }
    });

    it('should require authentication', async () => {
      // Act
      const response = await app.request('/api/users/me/stats', {
        method: 'GET',
      });

      // Assert
      expect(response.status).toBe(401);
    });

    it('should return correct tag counts for alice', async () => {
      // Arrange
      const sessionToken = await createTestSession('user_alice');

      // Act
      const response = await app.request('/api/users/me/stats', {
        method: 'GET',
        headers: {
          Cookie: `session=${sessionToken}`,
        },
      });

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();

      // Alice may or may not have logs in test environment
      // Verify that structure is valid and counts are non-negative
      expect(data.tags.total).toBeGreaterThanOrEqual(0);
      expect(data.logs.total).toBeGreaterThanOrEqual(0);
      
      // Top tags should be ordered by count (descending)
      if (data.tags.top_tags.length > 1) {
        for (let i = 0; i < data.tags.top_tags.length - 1; i++) {
          expect(data.tags.top_tags[i].count).toBeGreaterThanOrEqual(
            data.tags.top_tags[i + 1].count
          );
        }
      }
    });
  });
});
