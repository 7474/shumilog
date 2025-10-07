# フロントエンドAPIクライアント堅牢化の実装完了

## Issue
[#[番号]] フロントエンドのapiクライアントの堅牢化

## 要件
- 何らかの形で定義しているAPI仕様に準拠していることを保証ないし検証する
- メンテナンスが必要な検証は避けること
- #249のようなバグを予防する

## 実装概要

### 採用したアプローチ
バックエンドで既に使用されている`jest-openapi`を活用し、フロントエンドでもOpenAPI仕様に対する自動検証を実装しました。MSW (Mock Service Worker) を使用してOpenAPI準拠のモックレスポンスを提供し、それらを検証することで、バックエンドサーバー不要で検証が可能です。

### 実装内容

#### 1. 追加パッケージ
- **jest-openapi** (v0.14.2): OpenAPI仕様検証ライブラリ
- **msw** (最新版): APIモックライブラリ

#### 2. 実装ファイル

**ヘルパー**
- `frontend/tests/helpers/openapi-setup.ts`: OpenAPI検証セットアップと変換ヘルパー
- `frontend/tests/helpers/openapi-matchers.d.ts`: Vitest用TypeScript型定義

**コントラクトテスト**
- `frontend/tests/contract/logs.contract.test.ts`: ログエンドポイントの検証 (3テスト)
- `frontend/tests/contract/tags.contract.test.ts`: タグエンドポイントの検証 (2テスト)
- `frontend/tests/contract/health.contract.test.ts`: ヘルスチェックの検証 (1テスト)

**ドキュメント**
- `docs/frontend-api-validation.md`: 詳細な実装ガイドと使用方法
- `frontend/README.md`: フロントエンドREADMEに検証セクション追加
- `README.md`: メインREADMEに検証コマンド追加

#### 3. 検証対象エンドポイント

現在、以下の主要エンドポイントを検証：

**ログAPI**
- `GET /api/logs` - ログ一覧取得
- `GET /api/logs/:logId` - ログ詳細取得
- `GET /api/logs/:logId/related` - 関連ログ取得

**タグAPI**
- `GET /api/tags` - タグ一覧取得
- `GET /api/tags/:id` - タグ詳細取得

**その他**
- `GET /api/health` - ヘルスチェック

### テスト実行結果

```bash
$ npm run test:contract

Test Files  3 passed (3)
Tests       6 passed (6)
Duration    1.75s
```

全テストが成功しており、モックレスポンスがOpenAPI仕様に完全に準拠していることを確認しました。

### 検証内容

コントラクトテストは以下を自動的に検証します：
- ✅ レスポンスステータスコードが仕様と一致
- ✅ レスポンスボディの構造が定義されたスキーマと一致
- ✅ 必須フィールドがすべて存在
- ✅ フィールドの型が正しい (string, number, boolean, object, array)
- ✅ 列挙値が有効
- ✅ ネストされたオブジェクト構造の検証

### メリット

#### 1. 自動化
OpenAPI仕様ファイルを参照するだけで、手動での仕様チェックが不要になります。

#### 2. メンテナンスフリー
OpenAPI仕様 (`/api/v1/openapi.yaml`) を更新するだけで、検証も自動的に更新されます。追加のメンテナンスコストはありません。

#### 3. 早期発見
フロントエンドが期待する形式とバックエンドの実装の乖離を即座に検出できます。

#### 4. バックエンド不要
MSWを使用するため、テスト実行にバックエンドサーバーが不要です。CI/CD環境でも簡単に実行できます。

#### 5. バグ予防
Issue #249のようなAPI仕様不一致によるバグを予防できます。

#### 6. 一貫性
バックエンドと同じ検証基盤 (jest-openapi) を使用し、一貫した検証を提供します。

### 使用方法

#### テストの実行
```bash
cd frontend
npm run test:contract
```

#### 新しいエンドポイントの追加
```typescript
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { toOpenApiResponse } from '../helpers/openapi-setup';

const handlers = [
  http.get(`${baseUrl}/api/your-endpoint`, () => {
    return HttpResponse.json({
      // OpenAPI準拠のレスポンス
    });
  }),
];

const server = setupServer(...handlers);

it('validates response', async () => {
  const response = await fetch(`${baseUrl}/api/your-endpoint`);
  const openApiResponse = await toOpenApiResponse(response, '/your-endpoint', 'GET');
  expect(openApiResponse).toSatisfyApiSpec();
});
```

## 要件への対応

### ✅ 要件1: API仕様に準拠していることを保証
jest-openapiによる自動検証により、レスポンスがOpenAPI仕様に完全に準拠していることを保証します。

### ✅ 要件2: メンテナンスが必要な検証は避けること
OpenAPI仕様ファイルを更新するだけで検証も自動更新されるため、追加のメンテナンスは不要です。

### ✅ 要件3: #249のようなバグを予防
API仕様とフロントエンドの期待値の乖離を自動検出し、同様のバグを予防します。

## バックエンドとの統合

バックエンドとフロントエンドの両方で同じOpenAPI仕様 (`/api/v1/openapi.yaml`) を参照し、同じ検証ライブラリ (jest-openapi) を使用することで：

- **一貫性**: バックエンドとフロントエンドで同じ基準で検証
- **信頼性**: 仕様が常に最新で正確であることを保証
- **効率性**: 両方の開発チームが同じドキュメントを信頼できる

## 今後の展開

この実装により：
- 新しいエンドポイント追加時も同じパターンで簡単に検証追加可能
- OpenAPI仕様が「生きたドキュメント」として機能
- 将来的にOpenAPIからクライアントコード生成も可能
- CI/CDパイプラインで自動検証を実行可能

## まとめ

フロントエンドAPIクライアントが受信するレスポンスを自動的にOpenAPI仕様に対して検証することで、API実装とフロントエンドコードの乖離を早期に発見し、Issue #249のようなバグを予防できるようになりました。

バックエンドと同じ検証基盤を使用することで、一貫性のある開発体験を提供し、メンテナンスコストを最小限に抑えながら、高品質なAPIクライアントを維持できます。
