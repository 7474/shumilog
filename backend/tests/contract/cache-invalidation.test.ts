import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  app,
  clearTestData,
  seedTestLogs,
  createTestSession,
} from '../helpers/app';

/**
 * Contract Test: Cache Invalidation on Update
 * 
 * コンテンツ更新時のキャッシュ無効化を検証する
 * - ログ更新後、更新したユーザーには最新のコンテンツが表示される
 * - キャッシュが適切に無効化される
 */
describe('Contract Test: Cache Invalidation on Update', () => {
  beforeEach(async () => {
    await clearTestData();
    await seedTestLogs(); // This already calls seedTestTags internally
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe('ログ更新時のキャッシュ無効化', () => {
    it('ログを更新した後、最新の内容が表示される', async () => {
      // セッションを作成（log_owner としてログイン）
      const sessionToken = await createTestSession('user_log_owner');

      // log_ownerの公開ログを取得（初回）
      const logId = 'log_public_entry';
      const firstResponse = await app.request(`/logs/${logId}`, {
        method: 'GET',
      });
      
      expect(firstResponse.status).toBe(200);
      const firstData = await firstResponse.json();
      const originalTitle = firstData.title;
      const originalContent = firstData.content_md;

      // ログを更新
      const updatedTitle = 'Updated Title for Cache Test';
      const updatedContent = '# Updated Content\nThis is the updated content for cache invalidation test.';
      
      const updateResponse = await app.request(`/logs/${logId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`,
        },
        body: JSON.stringify({
          title: updatedTitle,
          content_md: updatedContent,
          is_public: true,
        }),
      });

      expect(updateResponse.status).toBe(200);
      const updatedData = await updateResponse.json();
      expect(updatedData.title).toBe(updatedTitle);
      expect(updatedData.content_md).toBe(updatedContent);

      // 更新後、再度ログを取得（認証なしでも最新の内容が表示される）
      const secondResponse = await app.request(`/logs/${logId}`, {
        method: 'GET',
      });
      
      expect(secondResponse.status).toBe(200);
      const secondData = await secondResponse.json();
      
      // 更新された内容が表示されることを確認
      expect(secondData.title).toBe(updatedTitle);
      expect(secondData.content_md).toBe(updatedContent);
      expect(secondData.title).not.toBe(originalTitle);
      expect(secondData.content_md).not.toBe(originalContent);
    });

    it('ログを作成した後、一覧に最新のログが表示される', async () => {
      // セッションを作成（log_owner としてログイン）
      const sessionToken = await createTestSession('user_log_owner');

      // 初回のログ一覧を取得
      const firstListResponse = await app.request('/logs', {
        method: 'GET',
      });
      
      expect(firstListResponse.status).toBe(200);
      const firstListData = await firstListResponse.json();
      const initialCount = firstListData.items.length;

      // 新しい公開ログを作成
      const newLogTitle = 'New Log for Cache Test';
      const newLogContent = '# New Log\nThis is a new log for cache invalidation test.';
      
      const createResponse = await app.request('/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`,
        },
        body: JSON.stringify({
          title: newLogTitle,
          content_md: newLogContent,
          is_public: true,
        }),
      });

      expect(createResponse.status).toBe(201);
      const createdData = await createResponse.json();
      expect(createdData.title).toBe(newLogTitle);

      // 作成後、再度一覧を取得（新しいログが含まれることを確認）
      const secondListResponse = await app.request('/logs', {
        method: 'GET',
      });
      
      expect(secondListResponse.status).toBe(200);
      const secondListData = await secondListResponse.json();
      
      // 新しいログが一覧に含まれることを確認
      expect(secondListData.items.length).toBeGreaterThan(initialCount);
      const newLog = secondListData.items.find((log: any) => log.title === newLogTitle);
      expect(newLog).toBeDefined();
      expect(newLog?.content_md).toBe(newLogContent);
    });

    it('ログを削除した後、一覧から削除される', async () => {
      // セッションを作成（log_owner としてログイン）
      const sessionToken = await createTestSession('user_log_owner');

      // 削除対象のログを作成
      const logToDelete = {
        title: 'Log to Delete',
        content_md: '# Content\nThis log will be deleted.',
        is_public: true,
      };
      
      const createResponse = await app.request('/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`,
        },
        body: JSON.stringify(logToDelete),
      });

      expect(createResponse.status).toBe(201);
      const createdData = await createResponse.json();
      const logId = createdData.id;

      // 削除前の一覧を取得
      const beforeDeleteResponse = await app.request('/logs', {
        method: 'GET',
      });
      
      expect(beforeDeleteResponse.status).toBe(200);
      const beforeDeleteData = await beforeDeleteResponse.json();
      const logBeforeDelete = beforeDeleteData.items.find((log: any) => log.id === logId);
      expect(logBeforeDelete).toBeDefined();

      // ログを削除
      const deleteResponse = await app.request(`/logs/${logId}`, {
        method: 'DELETE',
        headers: {
          Cookie: `session=${sessionToken}`,
        },
      });

      expect(deleteResponse.status).toBe(204);

      // 削除後、一覧を取得（削除されたログが含まれないことを確認）
      const afterDeleteResponse = await app.request('/logs', {
        method: 'GET',
      });
      
      expect(afterDeleteResponse.status).toBe(200);
      const afterDeleteData = await afterDeleteResponse.json();
      const logAfterDelete = afterDeleteData.items.find((log: any) => log.id === logId);
      expect(logAfterDelete).toBeUndefined();

      // 削除されたログの詳細を取得しようとすると404になる
      const detailResponse = await app.request(`/logs/${logId}`, {
        method: 'GET',
      });
      expect(detailResponse.status).toBe(404);
    });

    it('非公開ログを更新してもキャッシュに影響しない', async () => {
      // セッションを作成（log_owner としてログイン）
      const sessionToken = await createTestSession('user_log_owner');

      // 非公開ログを作成
      const privateLog = {
        title: 'Private Log',
        content_md: '# Private Content\nThis is a private log.',
        is_public: false,
      };
      
      const createResponse = await app.request('/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`,
        },
        body: JSON.stringify(privateLog),
      });

      expect(createResponse.status).toBe(201);
      const createdData = await createResponse.json();
      const logId = createdData.id;

      // 非公開ログを更新
      const updatedContent = '# Updated Private Content\nUpdated.';
      
      const updateResponse = await app.request(`/logs/${logId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`,
        },
        body: JSON.stringify({
          title: 'Updated Private Log',
          content_md: updatedContent,
          is_public: false,
        }),
      });

      expect(updateResponse.status).toBe(200);
      const updatedData = await updateResponse.json();
      expect(updatedData.content_md).toBe(updatedContent);

      // 認証なしでは非公開ログにアクセスできない（403 Access denied）
      const unauthResponse = await app.request(`/logs/${logId}`, {
        method: 'GET',
      });
      expect(unauthResponse.status).toBe(403);

      // 認証ありでは更新された内容が表示される
      const authResponse = await app.request(`/logs/${logId}`, {
        method: 'GET',
        headers: {
          Cookie: `session=${sessionToken}`,
        },
      });
      expect(authResponse.status).toBe(200);
      const authData = await authResponse.json();
      expect(authData.content_md).toBe(updatedContent);
    });
  });

  describe('タグ更新時のキャッシュ無効化', () => {
    it('タグを更新した後、最新の内容が表示される', async () => {
      // セッションを作成（tag_ownerとしてログイン）
      const sessionToken = await createTestSession('user_alice');

      // タグを作成
      const createResponse = await app.request('/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`,
        },
        body: JSON.stringify({
          name: 'TestTag',
          description: 'Original description',
        }),
      });

      expect(createResponse.status).toBe(201);
      const createdTag = await createResponse.json();
      const tagId = createdTag.id;

      // タグを取得（初回）
      const firstResponse = await app.request(`/tags/${tagId}`, {
        method: 'GET',
      });
      
      expect(firstResponse.status).toBe(200);
      const firstData = await firstResponse.json();
      expect(firstData.description).toBe('Original description');

      // タグを更新
      const updatedDescription = 'Updated description for cache test';
      
      const updateResponse = await app.request(`/tags/${tagId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`,
        },
        body: JSON.stringify({
          description: updatedDescription,
        }),
      });

      expect(updateResponse.status).toBe(200);
      const updatedData = await updateResponse.json();
      expect(updatedData.description).toBe(updatedDescription);

      // 更新後、再度タグを取得（認証なしでも最新の内容が表示される）
      const secondResponse = await app.request(`/tags/${tagId}`, {
        method: 'GET',
      });
      
      expect(secondResponse.status).toBe(200);
      const secondData = await secondResponse.json();
      
      // 更新された内容が表示されることを確認
      expect(secondData.description).toBe(updatedDescription);
      expect(secondData.description).not.toBe('Original description');
    });

    it('タグを作成した後、一覧に最新のタグが表示される', async () => {
      // セッションを作成
      const sessionToken = await createTestSession('user_alice');

      // 初回のタグ一覧を取得
      const firstListResponse = await app.request('/tags', {
        method: 'GET',
      });
      
      expect(firstListResponse.status).toBe(200);
      const firstListData = await firstListResponse.json();
      const initialCount = firstListData.items.length;

      // 新しいタグを作成
      const newTagName = 'NewTagForCacheTest';
      const newTagDescription = 'This is a new tag for cache invalidation test.';
      
      const createResponse = await app.request('/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`,
        },
        body: JSON.stringify({
          name: newTagName,
          description: newTagDescription,
        }),
      });

      expect(createResponse.status).toBe(201);
      const createdData = await createResponse.json();
      expect(createdData.name).toBe(newTagName);

      // 作成後、再度一覧を取得（新しいタグが含まれることを確認）
      const secondListResponse = await app.request('/tags', {
        method: 'GET',
      });
      
      expect(secondListResponse.status).toBe(200);
      const secondListData = await secondListResponse.json();
      
      // 新しいタグが一覧に含まれることを確認
      expect(secondListData.items.length).toBeGreaterThan(initialCount);
      const newTag = secondListData.items.find((tag: any) => tag.name === newTagName);
      expect(newTag).toBeDefined();
      expect(newTag?.description).toBe(newTagDescription);
    });

    it('タグ名を変更した後、新しい名前でもアクセスできる', async () => {
      // セッションを作成
      const sessionToken = await createTestSession('user_alice');

      // タグを作成
      const originalName = 'OriginalTagName';
      const createResponse = await app.request('/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`,
        },
        body: JSON.stringify({
          name: originalName,
          description: 'Test tag',
        }),
      });

      expect(createResponse.status).toBe(201);
      const createdTag = await createResponse.json();
      const tagId = createdTag.id;

      // 元の名前でアクセスできることを確認
      const firstResponse = await app.request(`/tags/${originalName}`, {
        method: 'GET',
      });
      expect(firstResponse.status).toBe(200);

      // タグ名を変更
      const newName = 'UpdatedTagName';
      const updateResponse = await app.request(`/tags/${tagId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`,
        },
        body: JSON.stringify({
          name: newName,
        }),
      });

      expect(updateResponse.status).toBe(200);

      // 新しい名前でアクセスできることを確認
      const newNameResponse = await app.request(`/tags/${newName}`, {
        method: 'GET',
      });
      expect(newNameResponse.status).toBe(200);
      const newNameData = await newNameResponse.json();
      expect(newNameData.name).toBe(newName);

      // 古い名前ではアクセスできないことを確認（404）
      const oldNameResponse = await app.request(`/tags/${originalName}`, {
        method: 'GET',
      });
      expect(oldNameResponse.status).toBe(404);
    });
  });
});
