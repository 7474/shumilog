# フロントエンドAPIクライアントの堅牢化

## 概要

フロントエンドのAPIクライアントが受信するレスポンスがOpenAPI仕様に準拠していることを自動検証するシステムを実装しました。これにより、バックエンドAPIから予期しない形式のデータが返される問題を早期に発見できます。

## 実装内容

### 1. 技術構成

```
/api/v1/openapi.yaml                           # 正規のAPI仕様書（信頼できる唯一の情報源）
/frontend/tests/helpers/openapi-setup.ts       # OpenAPI検証セットアップ
/frontend/tests/helpers/openapi-matchers.d.ts  # TypeScript型定義
/frontend/tests/contract/*.test.ts             # 自動検証を含むコントラクトテスト
```

### 2. 使用ライブラリ

- **jest-openapi**: OpenAPI 3.0仕様に対してレスポンスを自動検証するライブラリ
- **MSW (Mock Service Worker)**: APIレスポンスをモックするライブラリ
- **Vitest**: テストフレームワーク

### 3. 検証内容

コントラクトテストで以下を自動検証：
- ✅ レスポンスステータスコード
- ✅ レスポンスボディの構造
- ✅ 必須フィールドの存在
- ✅ データ型の正確性
- ✅ 列挙値の有効性
- ✅ ネストされたオブジェクトの構造

## 使用方法

### コントラクトテストの実行

```bash
cd frontend
npm run test:contract
```

### 新しいエンドポイントの検証追加

新しいAPIエンドポイントのコントラクトテストを追加する場合：

```typescript
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { toOpenApiResponse } from '../helpers/openapi-setup';

const baseUrl = 'http://localhost:8787';

// MSWハンドラーでOpenAPI準拠のモックレスポンスを定義
const handlers = [
  http.get(`${baseUrl}/api/your-endpoint`, () => {
    return HttpResponse.json({
      // OpenAPI仕様に準拠したレスポンス
      field1: 'value1',
      field2: 123,
    });
  }),
];

const server = setupServer(...handlers);

describe('Contract: Your Endpoint', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
    import('../helpers/openapi-setup');
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('validates response against OpenAPI spec', async () => {
    const response = await fetch(`${baseUrl}/api/your-endpoint`);
    
    expect(response.ok).toBe(true);
    
    // OpenAPI仕様に対して自動検証
    const openApiResponse = await toOpenApiResponse(response, '/your-endpoint', 'GET');
    expect(openApiResponse).toSatisfyApiSpec();
  });
});
```

## メリット

1. **自動化**: OpenAPI仕様との整合性を自動チェック
2. **メンテナンスフリー**: OpenAPI仕様を更新するだけで検証も更新
3. **早期発見**: フロントエンドが期待する形式とバックエンドの実装の乖離を即座に検出
4. **バックエンド不要**: MSWを使用するため、テスト実行にバックエンドサーバー不要
5. **CI統合**: 既存テストフレームワーク（Vitest）に統合済み
6. **バグ予防**: Issue #249のようなAPI仕様不一致によるバグを予防

## 実装例

現在、以下のエンドポイントのコントラクトテストを実装済み：

### ログエンドポイント
- `GET /api/logs` - ログ一覧取得
- `GET /api/logs/:logId` - ログ詳細取得
- `GET /api/logs/:logId/related` - 関連ログ取得

### タグエンドポイント
- `GET /api/tags` - タグ一覧取得
- `GET /api/tags/:id` - タグ詳細取得

### その他
- `GET /api/health` - ヘルスチェック

## テスト結果

```bash
$ npm run test:contract

Test Files  3 passed (3)
     Tests  6 passed (6)
```

すべてのコントラクトテストが成功しており、モックレスポンスがOpenAPI仕様に準拠していることを確認済みです。

## ワークフロー

### フロントエンド開発時

1. **API仕様確認**: `/api/v1/openapi.yaml` で正規のAPI仕様を確認
2. **コントラクトテスト作成**: 新しいエンドポイント用のテストを追加
3. **実装**: フロントエンドコードを実装
4. **検証**: `npm run test:contract` で仕様との一致を確認

### API変更時

1. **仕様更新**: `/api/v1/openapi.yaml` を更新
2. **テスト実行**: `npm run test:contract` を実行
3. **エラー確認**: 仕様変更によりテストが失敗した場合、フロントエンドコードを修正
4. **再検証**: テストが成功することを確認

## 注意事項

- コントラクトテストはMSWを使用してモックレスポンスを検証します
- 実際のバックエンドサーバーとの通信をテストする場合は、別途E2Eテストを実装してください
- OpenAPI仕様が最新であることを常に確認してください

## 関連ドキュメント

- [バックエンドのOpenAPI検証](../backend/README.md#openapi-specification-validation)
- [OpenAPI仕様書](/api/v1/openapi.yaml)
- [OpenAPI検証ガイド](/docs/openapi-validation-guide.md)

## まとめ

フロントエンドAPIクライアントが受信するレスポンスを自動的にOpenAPI仕様に対して検証することで、バックエンドとフロントエンドの実装の乖離を早期に発見し、Issue #249のようなバグを予防できるようになりました。
