import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  app,
  clearTestData,
  createTestSession,
  createTestUser,
  seedTestTags,
  setupTestEnvironment,
  TEST_TAG_IDS,
} from '../helpers/app';

/**
 * Contract Suite: Tags routes
 *
 * This suite documents the expected behaviour for tag management endpoints.
 */
describe('Contract: Tags routes', () => {
  beforeEach(async () => {
    await clearTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe('GET /tags', () => {
    it('returns paginated list of tags with default limit', async () => {
      await setupTestEnvironment();

      const response = await app.request('/tags', { method: 'GET' });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/json');

      const payload = await response.json();
      expect(payload).toMatchObject({
        items: expect.any(Array),
        total: expect.any(Number),
        limit: 20,
        offset: 0
      });

      expect(payload.items.length).toBeGreaterThan(0);
      payload.items.forEach((tag: any) => {
        expect(tag).toMatchObject({
          id: expect.any(String),
          name: expect.any(String)
        });
      });
    });

    it('supports search filter', async () => {
      await setupTestEnvironment();

      const response = await app.request('/tags?search=titan', { method: 'GET' });

      expect(response.status).toBe(200);
      const payload = await response.json();

      expect(payload.items.length).toBeGreaterThan(0);
      payload.items.forEach((tag: any) => {
        const haystack = `${tag.name} ${tag.description}`.toLowerCase();
        expect(haystack).toContain('titan');
      });
    });

    it('respects pagination parameters', async () => {
      await setupTestEnvironment();

      const response = await app.request('/tags?limit=1&offset=1', { method: 'GET' });

      expect(response.status).toBe(200);
      const payload = await response.json();

      expect(payload.limit).toBe(1);
      expect(payload.offset).toBe(1);
      expect(Array.isArray(payload.items)).toBe(true);
      expect(payload.items.length).toBeLessThanOrEqual(1);
    });
  });

  describe('POST /tags', () => {
    it('creates a new tag for the authenticated user', async () => {
      const userId = 'tags_creator';
      await createTestUser(userId, 'tags_creator');
      const sessionToken = await createTestSession(userId);

      const response = await app.request('/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          name: 'New Tag',
          description: 'Created via contract test',
          metadata: {
            type: 'category'
          }
        })
      });

      expect(response.status).toBe(201);
      expect(response.headers.get('Content-Type')).toContain('application/json');

      const tag = await response.json();
      expect(tag).toMatchObject({
        id: expect.any(String),
        name: 'New Tag',
        description: 'Created via contract test',
        metadata: {
          type: 'category'
        },
        created_by: userId
      });

      expect(typeof tag.created_at).toBe('string');
      expect(Number.isNaN(Date.parse(tag.created_at))).toBe(false);
      expect(typeof tag.updated_at).toBe('string');
    });

    it('returns 400 when payload is invalid', async () => {
      const userId = 'tags_creator';
      await createTestUser(userId, 'tags_creator');
      const sessionToken = await createTestSession(userId);

      const response = await app.request('/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({ description: 'Missing required name' })
      });

      expect(response.status).toBe(400);
    });

    it('returns 401 when request is unauthenticated', async () => {
      const response = await app.request('/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'No auth' })
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /tags/:tagId', () => {
    it('returns tag detail with metadata and associations', async () => {
      await setupTestEnvironment();

      const response = await app.request(`/tags/${TEST_TAG_IDS.ANIME}`, { method: 'GET' });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/json');

      const tag = await response.json();
      expect(tag).toMatchObject({
        id: TEST_TAG_IDS.ANIME,
        name: expect.any(String),
        description: expect.any(String),
        metadata: expect.any(Object),
        created_by: expect.any(String),
        associated_tags: expect.any(Array)
      });
    });

    it('returns 404 for missing tag', async () => {
      const response = await app.request('/tags/non-existent-tag', { method: 'GET' });

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /tags/:tagId', () => {
    it('updates tag fields when requested by owner', async () => {
      const sessionToken = await setupTestEnvironment();

      const response = await app.request(`/tags/${TEST_TAG_IDS.ANIME}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          name: 'Anime Updated',
          description: 'Updated description',
          metadata: {
            category: 'media',
            updated: true
          }
        })
      });

      expect(response.status).toBe(200);
      const tag = await response.json();
      expect(tag).toMatchObject({
        id: TEST_TAG_IDS.ANIME,
        name: 'Anime Updated',
        description: 'Updated description',
        metadata: {
          category: 'media',
          updated: true
        }
      });
      expect(typeof tag.updated_at).toBe('string');
    });

    it('returns 401 when unauthenticated', async () => {
      await setupTestEnvironment();

      const response = await app.request(`/tags/${TEST_TAG_IDS.ANIME}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'Unauthorized update' })
      });

      expect(response.status).toBe(401);
    });

    it('returns 403 when user is not the tag owner', async () => {
      await setupTestEnvironment();
      await createTestUser('other-user', 'other_user');
      const otherSession = await createTestSession('other-user');

      const response = await app.request(`/tags/${TEST_TAG_IDS.ANIME}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${otherSession}`
        },
        body: JSON.stringify({ name: 'Forbidden update' })
      });

      expect(response.status).toBe(403);
    });

    it('returns 404 when tag does not exist', async () => {
      const userId = 'tags_creator';
      await createTestUser(userId, 'tags_creator');
      const sessionToken = await createTestSession(userId);

      const response = await app.request('/tags/unknown-tag', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({ name: 'Missing tag' })
      });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /tags/:tagId', () => {
    it('removes a tag owned by the requester', async () => {
      const sessionToken = await setupTestEnvironment();

      const response = await app.request(`/tags/${TEST_TAG_IDS.ANIME}`, {
        method: 'DELETE',
        headers: {
          Cookie: `session=${sessionToken}`
        }
      });

      expect(response.status).toBe(204);

      const confirm = await app.request(`/tags/${TEST_TAG_IDS.ANIME}`, { method: 'GET' });
      expect(confirm.status).toBe(404);
    });

    it('returns 401 when unauthenticated', async () => {
      await setupTestEnvironment();

      const response = await app.request(`/tags/${TEST_TAG_IDS.ANIME}`, { method: 'DELETE' });
      expect(response.status).toBe(401);
    });

    it('returns 403 when user is not admin', async () => {
      await setupTestEnvironment();
      await createTestUser('other-user', 'other_user', 'user'); // Regular user, not admin
      const otherSession = await createTestSession('other-user');

      const response = await app.request(`/tags/${TEST_TAG_IDS.ANIME}`, {
        method: 'DELETE',
        headers: {
          Cookie: `session=${otherSession}`
        }
      });

      expect(response.status).toBe(403);
    });

    it('returns 404 when tag does not exist', async () => {
      const userId = 'tags_creator';
      await createTestUser(userId, 'tags_creator', 'admin'); // Create admin user
      const sessionToken = await createTestSession(userId);

      const response = await app.request('/tags/unknown-tag', {
        method: 'DELETE',
        headers: {
          Cookie: `session=${sessionToken}`
        }
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Tag associations', () => {
    it('creates and lists tag associations', async () => {
      const sessionToken = await setupTestEnvironment();

      const createResponse = await app.request(`/tags/${TEST_TAG_IDS.ANIME}/associations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({ associated_tag_id: TEST_TAG_IDS.MANGA })
      });

      expect(createResponse.status).toBe(201);

      const listResponse = await app.request(`/tags/${TEST_TAG_IDS.ANIME}/associations`, { method: 'GET' });
      expect(listResponse.status).toBe(200);

      const associations = await listResponse.json();
      expect(Array.isArray(associations)).toBe(true);
      expect(associations.some((tag: any) => tag.id === TEST_TAG_IDS.MANGA)).toBe(true);
    });

    it('returns 400 when association payload is invalid', async () => {
      const sessionToken = await setupTestEnvironment();

      const response = await app.request(`/tags/${TEST_TAG_IDS.ANIME}/associations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({})
      });

      expect(response.status).toBe(400);
    });

    it('returns 401 when creating association without authentication', async () => {
      await setupTestEnvironment();

      const response = await app.request(`/tags/${TEST_TAG_IDS.ANIME}/associations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ associated_tag_id: TEST_TAG_IDS.MANGA })
      });

      expect(response.status).toBe(401);
    });

    it('returns 404 when base tag is missing during association creation', async () => {
      const userId = 'tags_creator';
      await createTestUser(userId, 'tags_creator');
      const sessionToken = await createTestSession(userId);
      await seedTestTags();

      const response = await app.request('/tags/unknown-tag/associations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({ associated_tag_id: TEST_TAG_IDS.MANGA })
      });

      expect(response.status).toBe(404);
    });

    it('removes an existing association', async () => {
      const sessionToken = await setupTestEnvironment();

      await app.request(`/tags/${TEST_TAG_IDS.ANIME}/associations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({ associated_tag_id: TEST_TAG_IDS.MANGA })
      });

      const deleteResponse = await app.request(`/tags/${TEST_TAG_IDS.ANIME}/associations?associated_tag_id=${TEST_TAG_IDS.MANGA}`, {
        method: 'DELETE',
        headers: {
          Cookie: `session=${sessionToken}`
        }
      });

      expect(deleteResponse.status).toBe(204);

      const listResponse = await app.request(`/tags/${TEST_TAG_IDS.ANIME}/associations`, { method: 'GET' });
      const associations = await listResponse.json();
      expect(associations.some((tag: any) => tag.id === TEST_TAG_IDS.MANGA)).toBe(false);
    });

    it('returns 401 when deleting association without authentication', async () => {
      await setupTestEnvironment();

      const response = await app.request(`/tags/${TEST_TAG_IDS.ANIME}/associations?associated_tag_id=${TEST_TAG_IDS.MANGA}`, {
        method: 'DELETE'
      });

      expect(response.status).toBe(401);
    });

    it('returns 404 when deleting association for missing tag', async () => {
      const userId = 'tags_creator';
      await createTestUser(userId, 'tags_creator');
      const sessionToken = await createTestSession(userId);

      const response = await app.request(`/tags/unknown-tag/associations?associated_tag_id=${TEST_TAG_IDS.MANGA}`, {
        method: 'DELETE',
        headers: {
          Cookie: `session=${sessionToken}`
        }
      });

      expect(response.status).toBe(404);
    });
  });
});
