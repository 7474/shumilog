# タグ編集履歴機能

## 概要

タグの編集履歴を自動的に記録する機能です。タグの作成時と更新時に、そのタグの完全な状態がリビジョンとして保存されます。

## データベース構造

### tag_revisions テーブル

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | TEXT | リビジョンID（UUID） |
| tag_id | TEXT | 対象タグのID |
| revision_number | INTEGER | リビジョン番号（0から始まる連番） |
| name | TEXT | タグ名（その時点での値） |
| description | TEXT | タグの説明（その時点での値） |
| metadata | TEXT | メタデータJSON（その時点での値） |
| created_at | TEXT | リビジョン作成日時 |
| created_by | TEXT | 更新を行ったユーザーのID |

**制約:**
- `(tag_id, revision_number)` の組み合わせはユニーク
- `tag_id` は `tags.id` への外部キー
- `created_by` は `users.id` への外部キー

## 動作仕様

### タグ作成時

タグが新規作成されると、自動的にリビジョン番号0の履歴が作成されます。

```typescript
// タグ作成API呼び出し
POST /tags
{
  "name": "新しいタグ",
  "description": "説明文",
  "metadata": {"key": "value"}
}

// 内部処理
// 1. tags テーブルにタグを挿入
// 2. tag_revisions テーブルにリビジョン0を作成
//    - revision_number = 0
//    - name, description, metadata は作成時の値
```

### タグ更新時

タグが更新されると、更新後の状態で新しいリビジョンが作成されます。

```typescript
// タグ更新API呼び出し
PUT /tags/{tagId}
{
  "description": "更新された説明文"
}

// 内部処理
// 1. tags テーブルのタグを更新
// 2. 最新のリビジョン番号を取得（例: 現在のmax = 0）
// 3. tag_revisions テーブルに新しいリビジョンを作成
//    - revision_number = 1 (max + 1)
//    - name, description, metadata は更新後の完全な状態
```

## リビジョン番号

- リビジョン番号は0から始まる連番
- タグごとに独立して管理される
- 更新のたびに1ずつ増加

## データ設計の特徴

### 完全な状態の保存

各リビジョンには、その時点でのタグの完全な状態が保存されます。これにより：

1. **任意のリビジョン間で差分を計算可能**
   ```typescript
   // リビジョン0とリビジョン1を比較
   const rev0 = await getTagRevision(tagId, 0);
   const rev1 = await getTagRevision(tagId, 1);
   
   const changes = {
     name: rev0.name !== rev1.name,
     description: rev0.description !== rev1.description,
     metadata: JSON.stringify(rev0.metadata) !== JSON.stringify(rev1.metadata)
   };
   ```

2. **特定時点の状態を復元可能**
   ```typescript
   // リビジョン5の状態を取得
   const historicalState = await getTagRevision(tagId, 5);
   ```

## 現在の実装状況

### 実装済み

- ✅ データベースマイグレーション（0008_add_tag_revisions.sql）
- ✅ Drizzle ORMスキーマ定義
- ✅ TagRevisionモデル
- ✅ 自動的なリビジョン作成（作成時・更新時）
- ✅ 内部ヘルパーメソッド
  - `createRevision()` - リビジョン作成
  - `getNextRevisionNumber()` - 次のリビジョン番号取得
  - `getTagRevisions()` - タグの全リビジョン取得
  - `getTagRevision()` - 特定リビジョン取得
- ✅ 統合テスト

### 未実装（将来の拡張）

以下の機能は要件により当面実装しません：

- ❌ 履歴参照API（`GET /tags/{tagId}/revisions`）
- ❌ 特定リビジョン取得API（`GET /tags/{tagId}/revisions/{revisionNumber}`）
- ❌ 差分表示API（`GET /tags/{tagId}/revisions/{rev1}/diff/{rev2}`）
- ❌ UI上での履歴表示
- ❌ リビジョンの復元機能

## 実装コード例

### TagService での実装

```typescript
// タグ作成時
async createTag(data: CreateTagData, createdBy: string): Promise<Tag> {
  // ... タグ作成処理 ...
  
  // リビジョン0を作成
  await this.createRevision(tagId, tag, createdBy, 0);
  
  return tag;
}

// タグ更新時
async updateTag(tagId: string, data: UpdateTagData): Promise<Tag> {
  // ... タグ更新処理 ...
  
  // 次のリビジョン番号を取得して新しいリビジョンを作成
  const nextRevisionNumber = await this.getNextRevisionNumber(tagId);
  await this.createRevision(tagId, updatedTag, updatedTag.created_by, nextRevisionNumber);
  
  return updatedTag;
}

// リビジョン作成（private）
private async createRevision(
  tagId: string, 
  tag: Tag, 
  createdBy: string, 
  revisionNumber: number
): Promise<void> {
  const revisionId = this.generateTagId();
  const now = new Date().toISOString();
  
  await this.db.insert(tagRevisions).values({
    id: revisionId,
    tagId,
    revisionNumber,
    name: tag.name,
    description: tag.description || null,
    metadata: TagModel.serializeMetadata(tag.metadata),
    createdAt: now,
    createdBy,
  });
}
```

## テスト

統合テストで以下のシナリオを検証：

1. タグ作成時にリビジョン0が作成される
2. タグ更新時に新しいリビジョンが作成される
3. 各リビジョンに完全な状態が保存される
4. 複数タグの履歴が独立して管理される
5. リビジョン間で差分を計算できる

テストファイル: `backend/tests/integration/tag-revisions.test.ts`

## パフォーマンス考慮事項

### インデックス

以下のインデックスが作成されています：

```sql
CREATE INDEX idx_tag_revisions_tag_id ON tag_revisions(tag_id);
CREATE INDEX idx_tag_revisions_created_at ON tag_revisions(created_at);
```

### ストレージ

- 各リビジョンは完全な状態を保存するため、頻繁に更新されるタグはリビジョンが増加します
- 必要に応じて古いリビジョンのアーカイブや削除を検討できます（現在は未実装）

## 参考

- マイグレーションファイル: `backend/migrations/0008_add_tag_revisions.sql`
- モデル定義: `backend/src/models/TagRevision.ts`
- サービス実装: `backend/src/services/TagService.ts`
- テスト: `backend/tests/integration/tag-revisions.test.ts`
