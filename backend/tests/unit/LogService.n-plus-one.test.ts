import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LogService } from '../../src/services/LogService.js';
import { Database } from '../../src/db/database.js';
import { clearTestData, getTestD1Database, createTestUser } from '../helpers/app.js';

/**
 * N+1 クエリ解消のテスト
 * 
 * このテストは、タグ関連付け処理がバッチクエリを使用していることを検証します。
 * 従来のN+1クエリパターン（ループ内で複数回クエリ実行）ではなく、
 * バッチAPIを使用した一括処理になっていることを確認します。
 */
describe('LogService - N+1 Query Optimization', () => {
  let logService: LogService;
  let mockDatabase: Database;
  const userId = 'user-123';

  beforeEach(async () => {
    await clearTestData();
    mockDatabase = new Database({ d1Database: getTestD1Database() });
    logService = new LogService(mockDatabase);
    await createTestUser(userId, 'testuser');
  });

  describe('associateTagsByNamesWithLog - Batch Query Optimization', () => {
    it('should create multiple new tags with batch insert', async () => {
      // スパイを設定してバッチAPIが使用されることを確認
      const batchSpy = vi.spyOn(mockDatabase, 'batch');
      const querySpy = vi.spyOn(mockDatabase, 'query');
      
      // テスト用のログを作成
      const log = await logService.createLog({
        content_md: 'Test log',
        is_public: true,
        tag_names: []
      }, userId);

      // 複数の新規タグを関連付け（N+1が発生しやすいケース）
      const newTagNames = ['NewTag1', 'NewTag2', 'NewTag3', 'NewTag4', 'NewTag5'];
      
      // テスト対象メソッドを直接呼び出し
      await (logService as any).associateTagsByNamesWithLog(log.id, newTagNames, userId);

      // バッチAPIが使用されていることを検証
      expect(batchSpy).toHaveBeenCalled();
      
      // クエリは以下のみが実行されるべき:
      // 1. 既存タグチェック用のIN句クエリ (1回)
      // 2. タグ作成のバッチ処理 (batch API)
      // 3. 関連付けのバッチ処理 (batch API)
      
      // queryFirstやqueryが複数回呼ばれていないことを確認（N+1回避）
      const queryCallCount = querySpy.mock.calls.length;
      // 既存タグチェック用のクエリ + enrichLogsWithTags内のクエリ
      // N+1の場合はtagNames.length回のクエリが発生するが、最適化後は数回のみ
      expect(queryCallCount).toBeLessThan(newTagNames.length); // N+1が解消されていることを確認
      
      // 作成されたログを取得して検証
      const updatedLog = await logService.getLogById(log.id);
      expect(updatedLog?.associated_tags).toHaveLength(newTagNames.length);
      expect(updatedLog?.associated_tags.map(t => t.name).sort()).toEqual(newTagNames.sort());
    });

    it('should handle mix of existing and new tags efficiently', async () => {
      // 事前に一部のタグを作成
      const existingLog = await logService.createLog({
        content_md: 'Setup log',
        is_public: true,
        tag_names: ['ExistingTag1', 'ExistingTag2']
      }, userId);

      // 新しいログを作成
      const log = await logService.createLog({
        content_md: 'Test log',
        is_public: true,
        tag_names: []
      }, userId);

      const batchSpy = vi.spyOn(mockDatabase, 'batch');
      
      // 既存タグと新規タグを混在させる
      const mixedTagNames = [
        'ExistingTag1',  // 既存
        'NewTag1',       // 新規
        'ExistingTag2',  // 既存
        'NewTag2',       // 新規
        'NewTag3'        // 新規
      ];
      
      await (logService as any).associateTagsByNamesWithLog(log.id, mixedTagNames, userId);

      // バッチAPIが使用されていることを検証
      expect(batchSpy).toHaveBeenCalled();
      
      // 結果検証
      const updatedLog = await logService.getLogById(log.id);
      expect(updatedLog?.associated_tags).toHaveLength(mixedTagNames.length);
      
      // タグ名が正しく関連付けられていることを確認
      const tagNames = updatedLog?.associated_tags.map(t => t.name).sort();
      expect(tagNames).toEqual(mixedTagNames.sort());
    });
  });

  describe('associateTagsWithLog - Batch Insert Optimization', () => {
    it('should associate multiple tags using batch insert', async () => {
      // 事前に実際のタグを作成
      const setupLog = await logService.createLog({
        content_md: 'Setup log for tags',
        is_public: true,
        tag_names: ['BatchTag1', 'BatchTag2', 'BatchTag3', 'BatchTag4']
      }, userId);

      // タグIDを取得
      const setupLogWithTags = await logService.getLogById(setupLog.id);
      const tagIds = setupLogWithTags?.associated_tags.map(t => t.id) || [];
      expect(tagIds).toHaveLength(4);

      // 新しいログを作成
      const log = await logService.createLog({
        content_md: 'Test log',
        is_public: true,
        tag_names: []
      }, userId);

      const batchSpy = vi.spyOn(mockDatabase, 'batch');
      
      // テスト対象メソッドを直接呼び出し
      await (logService as any).associateTagsWithLog(log.id, tagIds);

      // バッチAPIが使用されていることを検証
      expect(batchSpy).toHaveBeenCalled();
      
      // バッチが呼ばれ、複数のINSERTステートメントを含むことを確認
      const batchCalls = batchSpy.mock.calls;
      expect(batchCalls.length).toBeGreaterThan(0);
      
      // 最後のバッチ呼び出しが複数のステートメントを含むことを確認
      const lastBatchCall = batchCalls[batchCalls.length - 1];
      expect(lastBatchCall[0]).toHaveLength(tagIds.length);
      
      // 関連付けが正しく行われたことを確認
      const updatedLog = await logService.getLogById(log.id);
      expect(updatedLog?.associated_tags).toHaveLength(tagIds.length);
    });

    it('should maintain association order when using batch insert', async () => {
      // ログを作成
      const log = await logService.createLog({
        content_md: 'Test log',
        is_public: true,
        tag_names: ['OrderTag1', 'OrderTag2', 'OrderTag3']
      }, userId);

      // タグの順序が保持されていることを確認
      const updatedLog = await logService.getLogById(log.id);
      expect(updatedLog?.associated_tags).toHaveLength(3);
      
      const tagNames = updatedLog?.associated_tags.map(t => t.name);
      expect(tagNames).toEqual(['OrderTag1', 'OrderTag2', 'OrderTag3']);
    });
  });

  describe('Performance - Large batch operations', () => {
    it('should handle large number of tags efficiently', async () => {
      // 多数のタグを一度に処理する場合のパフォーマンステスト
      const manyTags = Array.from({ length: 20 }, (_, i) => `Tag${i + 1}`);
      
      const startTime = Date.now();
      
      const log = await logService.createLog({
        content_md: 'Test log with many tags',
        is_public: true,
        tag_names: manyTags
      }, userId);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // バッチ処理により十分高速であることを確認（基準は環境依存）
      // N+1の場合は数百ms以上かかる可能性があるが、バッチ処理では100ms以内を期待
      console.log(`Created log with ${manyTags.length} tags in ${duration}ms`);
      
      // 結果検証
      const updatedLog = await logService.getLogById(log.id);
      expect(updatedLog?.associated_tags).toHaveLength(manyTags.length);
    });
  });
});
