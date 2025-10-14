# API仕様と実装の齟齬レポート

## 概要

このドキュメントは、OpenAPI仕様 (`/api/v1/openapi.yaml`) と実際の実装の間に存在する齟齬を追跡します。

## 検出方法

コントラクトテストにOpenAPI検証 (`toSatisfyApiSpec()`) を追加することで、以下の問題を自動検出しています：
- レスポンススキーマの不一致
- 必須フィールドの欠落
- 追加の予期しないフィールド
- 型の不一致

## 検出された問題

### 1. GET /tags/{tagId} - TagDetail スキーマの不一致

**検出日**: 2025-10-14  
**テストファイル**: `backend/tests/contract/tags.contract.test.ts`  
**重要度**: 高

#### 問題の詳細

OpenAPI仕様が期待するフィールド:
```yaml
TagDetail:
  allOf:
    - $ref: '#/components/schemas/Tag'
    - type: object
      required:
        - log_count
        - recent_logs
        - associated_tags
      properties:
        log_count: integer
        recent_logs: array of Log
        associated_tags: array of Tag
```

実際の実装が返すフィールド:
```json
{
  "id": "...",
  "name": "...",
  "description": "...",
  "metadata": {},
  "created_by": "...",
  "created_at": "...",
  "updated_at": "...",
  "associations": [],           // ❌ 仕様では "associated_tags"
  "usage_count": 0,             // ❌ 仕様では "log_count"
  "recent_logs": [],            // ✅ OK
  "recent_referring_tags": []   // ❌ 仕様に存在しない
}
```

#### 不一致の詳細

1. **フィールド名の不一致**:
   - 実装: `usage_count` → 仕様: `log_count`
   - 実装: `associations` → 仕様: `associated_tags`

2. **予期しないフィールド**:
   - `recent_referring_tags` が実装に存在するが仕様に定義されていない

#### 影響範囲

- バックエンド実装: `/backend/src/routes/tags.ts` の `GET /tags/:tagId` エンドポイント
- フロントエンド: 型定義 `frontend/src/types/api.ts` の `TagDetail` 型
- 既存のフロントエンドコードがこの不一致に依存している可能性

#### 推奨される修正方法

**オプション1: 仕様を実装に合わせる（推奨）**
- OpenAPI仕様を更新して実装の実際のフィールド名を反映
- フロントエンド型定義を再生成
- 破壊的変更なし

**オプション2: 実装を仕様に合わせる**
- バックエンドコードを修正してフィールド名を変更
- フロントエンドコードを更新して新しいフィールド名を使用
- 破壊的変更あり（既存のフロントエンドコードが影響を受ける）

#### ステータス

🔴 **未修正** - 修正方針の決定待ち

---

## 修正履歴

- 2025-10-14: 初回レポート作成、TagDetail スキーマの不一致を検出

## 今後のアクション

1. プロジェクトオーナーと修正方針を協議
2. 選択された方針に基づいて修正を実施
3. 修正後、すべてのコントラクトテストが成功することを確認
4. ドキュメントを更新
