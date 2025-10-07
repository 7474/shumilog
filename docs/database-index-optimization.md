# データベースインデックス最適化

## 概要

このドキュメントは、検索パフォーマンス向上のために実装されたデータベースインデックスの最適化について説明します。

## 実装されたインデックス

### 1. logs(created_at DESC)

**インデックス名**: `idx_logs_created_at`

**目的**: ログを時系列降順で取得するクエリの最適化

**最適化されるクエリ**:
- `getPublicLogs()` - 公開ログ一覧の取得
- `getRecentLogs()` - 最新ログの取得
- `searchLogs()` - ログ検索（時系列ソート）

**使用例**:
```sql
SELECT * FROM logs 
WHERE is_public = 1 
ORDER BY created_at DESC 
LIMIT 20;
```

### 2. logs(user_id, created_at DESC)

**インデックス名**: `idx_logs_user_created`

**目的**: 特定ユーザーのログを時系列降順で取得するクエリの最適化

**最適化されるクエリ**:
- `getUserLogs()` - ユーザーのログ一覧取得
- `searchLogs({ user_id })` - ユーザーでフィルタリングした検索

**使用例**:
```sql
SELECT * FROM logs 
WHERE user_id = ? 
ORDER BY created_at DESC 
LIMIT 20;
```

### 3. log_tag_associations(tag_id, log_id)

**インデックス名**: `idx_log_tag_assoc_tag_log`

**目的**: タグによるログ検索の最適化

**最適化されるクエリ**:
- `getLogsByTag()` - タグでフィルタリングされたログ取得
- `searchLogs({ tag_ids })` - タグIDでフィルタリングした検索
- `getRelatedLogs()` - 関連ログの取得

**使用例**:
```sql
SELECT DISTINCT l.* 
FROM logs l
JOIN log_tag_associations lta ON l.id = lta.log_id
WHERE lta.tag_id IN (?, ?, ?)
ORDER BY l.created_at DESC;
```

## 設計上の考慮事項

### is_publicをインデックスに含めない理由

現在のシステムでは、ログは原則として公開（is_public = 1）であるため、以下の理由により複合インデックスにis_publicを含めていません：

1. **選択性の低さ**: ほとんどのログが公開であるため、is_publicでのフィルタリングによる絞り込み効果が低い
2. **インデックスサイズの削減**: is_publicを含めることでインデックスサイズが増加するが、効果は限定的
3. **シンプルさの維持**: より単純なインデックス構造で管理が容易

既存の単一カラムインデックス `idx_logs_is_public` は、is_public単独での検索のために残しています。

### 降順インデックス（DESC）の重要性

SQLiteでは、インデックス作成時にソート順（ASC/DESC）を明示的に指定することが重要です：

- `created_at DESC` を指定することで、`ORDER BY created_at DESC` クエリが最適化されます
- 指定しない場合、SQLiteはインデックスを逆順にスキャンする必要があり、パフォーマンスが低下する可能性があります

## 期待される効果

### パフォーマンス改善

- **DBクエリ時間**: 30-50%削減（20-50ms改善）を期待
- **キャッシュミス時のレスポンス**: 50-100ms改善を期待

### 具体的な改善シナリオ

1. **ログ一覧表示**:
   - 改善前: 全テーブルスキャン + ソート
   - 改善後: インデックススキャンのみ

2. **ユーザーのログ表示**:
   - 改善前: 全テーブルスキャン + user_idフィルタ + ソート
   - 改善後: 複合インデックス(user_id, created_at)での直接アクセス

3. **タグによる検索**:
   - 改善前: log_tag_associationsの全スキャン + logs結合
   - 改善後: tag_idインデックスでの直接アクセス + logs結合

## マイグレーション

### ローカル環境

```bash
npm run db:migrate
```

### 本番環境

```bash
wrangler d1 migrations apply shumilog-db --remote
```

## 検証方法

### インデックスの確認

```bash
# logsテーブルのインデックス一覧
npx wrangler d1 execute shumilog-db-dev --local \
  --command "SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='logs';"

# log_tag_associationsテーブルのインデックス一覧
npx wrangler d1 execute shumilog-db-dev --local \
  --command "SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='log_tag_associations';"
```

### クエリプランの確認

SQLiteの`EXPLAIN QUERY PLAN`を使用して、インデックスが使用されていることを確認できます：

```sql
EXPLAIN QUERY PLAN
SELECT * FROM logs 
WHERE is_public = 1 
ORDER BY created_at DESC 
LIMIT 20;
```

期待される結果: `SEARCH logs USING INDEX idx_logs_created_at`

## 関連ドキュメント

- [docs/api-performance-optimization-plan.md](../docs/api-performance-optimization-plan.md) - API応答高速化計画
- [backend/migrations/0005_add_search_indexes.sql](../backend/migrations/0005_add_search_indexes.sql) - マイグレーションファイル

## 今後の検討事項

1. **パフォーマンスモニタリング**: 本番環境でのクエリ実行時間の計測
2. **追加の複合インデックス**: ユースケースに応じた追加最適化の検討
3. **インデックスメンテナンス**: 定期的なインデックス統計の更新
