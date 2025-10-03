# OpenAPI仕様検証ガイド

## 概要

このプロジェクトでは、API実装がOpenAPI仕様と一致することを自動的に検証するシステムを導入しています。これにより、仕様書と実装の乖離を防ぎ、常に最新で正確なAPI仕様を維持できます。

## 使用技術

- **jest-openapi**: OpenAPI仕様に対するレスポンス検証ライブラリ
- **OpenAPI 3.0**: API仕様の定義形式
- **Vitest**: テストフレームワーク

## OpenAPI仕様ファイル

正規のAPI仕様書は以下にあります：

```
/api/v1/openapi.yaml
```

このファイルは**信頼できる唯一の情報源 (Single Source of Truth)** であり、すべてのAPI開発の基準となります。

## 自動検証の仕組み

### 検証内容

コントラクトテストは以下を自動的に検証します：

- ✅ **ステータスコード**: レスポンスのHTTPステータスコードが仕様と一致
- ✅ **レスポンス構造**: レスポンスボディの構造が定義されたスキーマと一致
- ✅ **必須フィールド**: 必須とされるフィールドがすべて存在
- ✅ **データ型**: 各フィールドのデータ型が仕様と一致
- ✅ **列挙値**: enum型の値が定義された範囲内
- ✅ **制約条件**: 最小値、最大値、文字列長などの制約を満たす

### テストコードでの使用例

```typescript
import { toOpenApiResponse } from '../helpers/openapi-setup';

describe('GET /users/me', () => {
  it('returns the authenticated user profile', async () => {
    // APIリクエストを実行
    const response = await app.request('/users/me', {
      method: 'GET',
      headers: { Cookie: `session=${sessionToken}` }
    });

    // OpenAPI仕様に対して検証
    const openApiResponse = await toOpenApiResponse(response, '/users/me', 'GET');
    expect(openApiResponse).toSatisfyApiSpec();
    
    // 追加の検証を続行
    expect(response.status).toBe(200);
    const user = await response.json();
    expect(user.id).toBeDefined();
  });
});
```

## API開発ワークフロー

### 1. 仕様書を更新

新機能や変更を実装する前に、まずOpenAPI仕様書を更新します。

```yaml
# /api/v1/openapi.yaml
paths:
  /api/new-endpoint:
    get:
      summary: 新しいエンドポイント
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                  name:
                    type: string
```

### 2. コントラクトテストを作成・更新

仕様に基づいてコントラクトテストを作成または更新します。

```typescript
// backend/tests/contract/new-endpoint.test.ts
import { describe, it, expect } from 'vitest';
import { app } from '../helpers/app';
import { toOpenApiResponse } from '../helpers/openapi-setup';

describe('GET /new-endpoint', () => {
  it('returns data matching OpenAPI spec', async () => {
    const response = await app.request('/new-endpoint');
    
    // OpenAPI仕様検証
    const openApiResponse = await toOpenApiResponse(response, '/new-endpoint', 'GET');
    expect(openApiResponse).toSatisfyApiSpec();
  });
});
```

### 3. 実装を行う

仕様書に基づいてAPI実装を行います。

```typescript
// backend/src/routes/new-endpoint.ts
app.get('/new-endpoint', async (c) => {
  return c.json({
    id: 'example-id',
    name: 'Example Name'
  });
});
```

### 4. テストを実行して検証

実装が仕様と一致することを確認します。

```bash
cd backend
npm run test:contract
```

## toOpenApiResponse ヘルパー関数

### 関数シグネチャ

```typescript
async function toOpenApiResponse(
  response: Response,
  requestPath: string,
  requestMethod: string = 'GET'
): Promise<any>
```

### パラメータ

- **response**: Honoから返されたResponse オブジェクト
- **requestPath**: リクエストパス（例: `/users/me`）
- **requestMethod**: HTTPメソッド（例: `GET`, `POST`, `PUT`, `DELETE`）

### 動作

1. Honoのレスポンスを複製してボディを取得
2. JSONレスポンスの場合はパース
3. リクエストパスに `/api` プレフィックスを追加（OpenAPI仕様のサーバーURLに合わせる）
4. jest-openapi が期待する形式にレスポンスを変換

## よくある問題と解決方法

### 問題: "received had request path /xxx, but your API spec has no matching path"

**原因**: OpenAPI仕様にそのパスが定義されていない

**解決方法**:
1. `/api/v1/openapi.yaml` にパスを追加
2. または、テストコードのパスが正しいか確認

### 問題: "expected received to satisfy a '200' response"

**原因**: レスポンスが仕様で定義されたスキーマと一致しない

**解決方法**:
1. 実装が正しいスキーマを返すように修正
2. または、OpenAPI仕様のスキーマ定義を修正

### 問題: 必須フィールドが見つからない

**原因**: レスポンスに必須フィールドが含まれていない

**解決方法**:
```typescript
// 悪い例
return c.json({ id: '123' }); // 'name' フィールドがない

// 良い例
return c.json({
  id: '123',
  name: 'Example',  // 必須フィールドを含める
});
```

## ベストプラクティス

### 1. 仕様ファーストで開発

実装前に必ずOpenAPI仕様を定義しましょう。

### 2. すべてのエンドポイントを検証

すべての公開エンドポイントにOpenAPI検証を追加しましょう。

### 3. 適切なスキーマ定義

- 必須フィールドは `required` で明示
- データ型を正確に定義
- 列挙値は `enum` で制約
- 制約条件（minLength、maxLength等）を活用

### 4. 仕様の継続的な更新

API変更時は必ず仕様書を更新し、テストで検証しましょう。

## 追加リソース

- [OpenAPI Specification](https://swagger.io/specification/)
- [jest-openapi Documentation](https://github.com/openapi-library/OpenAPIValidators/tree/master/packages/jest-openapi)
- [Vitest Documentation](https://vitest.dev/)

## トラブルシューティング

問題が発生した場合：

1. `npm run test:contract` を実行してエラーメッセージを確認
2. OpenAPI仕様ファイル (`/api/v1/openapi.yaml`) が正しいか確認
3. 実装が仕様のスキーマと一致するか確認
4. ヘルパー関数に正しいパスとメソッドを渡しているか確認

より詳細な情報が必要な場合は、`backend/tests/contract/` 内の既存のテストを参照してください。
