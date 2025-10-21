import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  app,
  clearTestData,
  setupTestEnvironment,
  createTestSession,
  getTestD1Database,
} from '../helpers/app';

/**
 * Integration test: Tag Revision History
 * 
 * このテストでは、タグの編集履歴が正しく記録されることを検証します。
 * 要件:
 * - タグ作成時にリビジョン0が作成される
 * - タグ更新時に新しいリビジョンが作成される
 * - 各リビジョンにはタグの完全な状態が記録される
 * - リビジョン番号は連番で管理される
 * 
 * 注意: 履歴参照APIはまだ提供されていません（要件通り）
 */
describe('Integration: Tag Revision History', () => {
  const TEST_USER_ID = 'test-user-id-for-revisions';

  beforeEach(async () => {
    await clearTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  it('should create revision 0 when creating a new tag', async () => {
    await setupTestEnvironment();

    // Create a new tag
    const sessionToken = await createTestSession(TEST_USER_ID);
    const createResponse = await app.request('/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `session=${sessionToken}`,
      },
      body: JSON.stringify({
        name: 'TestTag',
        description: 'Initial description',
        metadata: { key: 'value' },
      }),
    });

    expect(createResponse.status).toBe(201);
    const createdTag = await createResponse.json();

    // Verify revision 0 was created in the database
    const testD1 = getTestD1Database();
    const revisions = await testD1
      .prepare('SELECT * FROM tag_revisions WHERE tag_id = ? ORDER BY revision_number ASC')
      .bind(createdTag.id)
      .all();

    expect(revisions.results).toHaveLength(1);
    const revision = revisions.results[0] as any;
    
    expect(revision.revision_number).toBe(0);
    expect(revision.name).toBe('TestTag');
    expect(revision.description).toBe('Initial description');
    expect(JSON.parse(revision.metadata)).toEqual({ key: 'value' });
    expect(revision.created_by).toBe(TEST_USER_ID);
  });

  it('should create new revisions when updating a tag', async () => {
    await setupTestEnvironment();

    // Create a tag
    const sessionToken = await createTestSession(TEST_USER_ID);
    const createResponse = await app.request('/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `session=${sessionToken}`,
      },
      body: JSON.stringify({
        name: 'TestTag',
        description: 'Initial description',
      }),
    });

    expect(createResponse.status).toBe(201);
    const createdTag = await createResponse.json();

    // Update the tag - first update
    const update1Response = await app.request(`/tags/${createdTag.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `session=${sessionToken}`,
      },
      body: JSON.stringify({
        description: 'Updated description 1',
      }),
    });

    expect(update1Response.status).toBe(200);

    // Update the tag - second update
    const update2Response = await app.request(`/tags/${createdTag.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `session=${sessionToken}`,
      },
      body: JSON.stringify({
        name: 'UpdatedTestTag',
        description: 'Updated description 2',
      }),
    });

    expect(update2Response.status).toBe(200);

    // Verify three revisions exist (0: initial, 1: first update, 2: second update)
    const testD1 = getTestD1Database();
    const revisions = await testD1
      .prepare('SELECT * FROM tag_revisions WHERE tag_id = ? ORDER BY revision_number ASC')
      .bind(createdTag.id)
      .all();

    expect(revisions.results).toHaveLength(3);

    // Verify revision 0 (initial state)
    const revision0 = revisions.results[0] as any;
    expect(revision0.revision_number).toBe(0);
    expect(revision0.name).toBe('TestTag');
    expect(revision0.description).toBe('Initial description');

    // Verify revision 1 (first update)
    const revision1 = revisions.results[1] as any;
    expect(revision1.revision_number).toBe(1);
    expect(revision1.name).toBe('TestTag');
    expect(revision1.description).toBe('Updated description 1');

    // Verify revision 2 (second update)
    const revision2 = revisions.results[2] as any;
    expect(revision2.revision_number).toBe(2);
    expect(revision2.name).toBe('UpdatedTestTag');
    expect(revision2.description).toBe('Updated description 2');
  });

  it('should store complete tag state in each revision for diff capability', async () => {
    await setupTestEnvironment();

    // Create a tag with all fields
    const sessionToken = await createTestSession(TEST_USER_ID);
    const createResponse = await app.request('/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `session=${sessionToken}`,
      },
      body: JSON.stringify({
        name: 'CompleteTag',
        description: 'Original description with #Anime hashtag',
        metadata: {
          color: 'blue',
          category: 'entertainment',
        },
      }),
    });

    expect(createResponse.status).toBe(201);
    const createdTag = await createResponse.json();

    // Update metadata only
    const updateResponse = await app.request(`/tags/${createdTag.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `session=${sessionToken}`,
      },
      body: JSON.stringify({
        metadata: {
          color: 'red',
          category: 'entertainment',
          priority: 'high',
        },
      }),
    });

    expect(updateResponse.status).toBe(200);

    // Verify revisions contain complete state for diff generation
    const testD1 = getTestD1Database();
    const revisions = await testD1
      .prepare('SELECT * FROM tag_revisions WHERE tag_id = ? ORDER BY revision_number ASC')
      .bind(createdTag.id)
      .all();

    expect(revisions.results).toHaveLength(2);

    // Revision 0 - original state
    const revision0 = revisions.results[0] as any;
    expect(revision0.name).toBe('CompleteTag');
    expect(revision0.description).toBe('Original description with #Anime hashtag');
    const metadata0 = JSON.parse(revision0.metadata);
    expect(metadata0.color).toBe('blue');
    expect(metadata0.category).toBe('entertainment');
    expect(metadata0.priority).toBeUndefined();

    // Revision 1 - updated state
    const revision1 = revisions.results[1] as any;
    expect(revision1.name).toBe('CompleteTag'); // name unchanged
    expect(revision1.description).toBe('Original description with #Anime hashtag'); // description unchanged
    const metadata1 = JSON.parse(revision1.metadata);
    expect(metadata1.color).toBe('red'); // changed
    expect(metadata1.category).toBe('entertainment'); // unchanged
    expect(metadata1.priority).toBe('high'); // added

    // Verify we can compute diffs between revisions
    const changes = {
      name: revision0.name !== revision1.name,
      description: revision0.description !== revision1.description,
      metadata: JSON.stringify(metadata0) !== JSON.stringify(metadata1),
    };

    expect(changes.name).toBe(false);
    expect(changes.description).toBe(false);
    expect(changes.metadata).toBe(true);
  });

  it('should handle multiple tags with separate revision histories', async () => {
    await setupTestEnvironment();

    const sessionToken = await createTestSession(TEST_USER_ID);

    // Create first tag
    const tag1Response = await app.request('/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `session=${sessionToken}`,
      },
      body: JSON.stringify({
        name: 'Tag1',
        description: 'Tag 1 description',
      }),
    });

    expect(tag1Response.status).toBe(201);
    const tag1 = await tag1Response.json();

    // Create second tag
    const tag2Response = await app.request('/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `session=${sessionToken}`,
      },
      body: JSON.stringify({
        name: 'Tag2',
        description: 'Tag 2 description',
      }),
    });

    expect(tag2Response.status).toBe(201);
    const tag2 = await tag2Response.json();

    // Update first tag
    await app.request(`/tags/${tag1.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `session=${sessionToken}`,
      },
      body: JSON.stringify({
        description: 'Tag 1 updated',
      }),
    });

    // Verify tag 1 has 2 revisions
    const testD1 = getTestD1Database();
    const tag1Revisions = await testD1
      .prepare('SELECT * FROM tag_revisions WHERE tag_id = ? ORDER BY revision_number ASC')
      .bind(tag1.id)
      .all();

    expect(tag1Revisions.results).toHaveLength(2);
    expect((tag1Revisions.results[0] as any).revision_number).toBe(0);
    expect((tag1Revisions.results[1] as any).revision_number).toBe(1);

    // Verify tag 2 has only 1 revision (initial)
    const tag2Revisions = await testD1
      .prepare('SELECT * FROM tag_revisions WHERE tag_id = ? ORDER BY revision_number ASC')
      .bind(tag2.id)
      .all();

    expect(tag2Revisions.results).toHaveLength(1);
    expect((tag2Revisions.results[0] as any).revision_number).toBe(0);
  });
});
