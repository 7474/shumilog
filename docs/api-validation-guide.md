# API仕様検証ガイド

## 概要

このプロジェクトでは、OpenAPI仕様 (`/api/v1/openapi.yaml`) と実装の整合性を保証するため、**二重の検証メカニズム**を採用しています：

1. **バックエンド**: コントラクトテストによるOpenAPI検証
2. **フロントエンド**: 型定義の自動生成とCI検証

## バックエンド: コントラクトテストによる検証

### 仕組み

コントラクトテストに `toSatisfyApiSpec()` マッチャーを使用することで、APIレスポンスがOpenAPI仕様に準拠しているかを自動検証します。

### 使用方法

```typescript
import { toOpenApiResponse } from '../helpers/openapi-setup';

it('should return valid response', async () => {
  const response = await app.request('/api/logs', { method: 'GET' });
  
  expect(response.status).toBe(200);
  
  // OpenAPI仕様に対して検証
  const openApiResponse = await toOpenApiResponse(response, '/logs', 'GET');
  expect(openApiResponse).toSatisfyApiSpec();
  
  // 追加の具体的なアサーション...
});
```

### 検証内容

- ✅ ステータスコードが仕様で定義されている
- ✅ レスポンススキーマが仕様と一致
- ✅ 必須フィールドがすべて存在
- ✅ フィールドの型が正しい
- ✅ 追加の予期しないフィールドがない（`additionalProperties: false` の場合）

### 現在の検証状況

| テストファイル | 検証数 | 状態 |
|-------------|-------|------|
| tags.contract.test.ts | 6 | ✅ 実装（1件の齟齬を検出） |
| users.contract.test.ts | 2 | ✅ 実装済み |
| logs-related.test.ts | 2 | ✅ 実装済み |
| logs.contract.test.ts | 1 | ✅ 実装済み |
| support.contract.test.ts | 1 | ✅ 実装済み |
| health.test.ts | 1 | ✅ 実装済み |
| auth.contract.test.ts | 0 | ⚠️ リダイレクトレスポンスのため検証困難 |
| その他 | 0 | 📝 必要に応じて追加 |

### CI統合

バックエンドCIでは、コントラクトテストを**明示的に**実行します：

```yaml
- name: Run contract tests (OpenAPI validation)
  run: npm run test:contract
- name: Run all tests
  run: npm test
```

これにより、API仕様の検証が確実に実行され、結果が可視化されます。

## フロントエンド: 型定義の自動生成と検証

### 仕組み

1. OpenAPI仕様からTypeScript型定義を自動生成 (`openapi-typescript`)
2. 生成された型定義をgitにコミット
3. CI内で型定義を再生成し、差分がないことを確認

### CI検証プロセス

```yaml
- name: Generate API types from OpenAPI spec
  run: npm run generate:types
  
- name: Check for uncommitted API type changes
  run: |
    if ! git diff --exit-code src/types/api.ts; then
      echo "❌ Error: API types are out of sync with OpenAPI specification"
      exit 1
    fi
```

### メリット

- ✅ OpenAPI仕様が更新されたら型定義も更新される
- ✅ CI内で差分検出により、型定義の更新忘れを防止
- ✅ TypeScriptの型チェックにより、コンパイル時にAPI使用の誤りを検出
- ✅ IDEの自動補完とインライン型情報

### 型定義の更新手順

```bash
cd frontend
npm run generate:types
git add src/types/api.ts
git commit -m "Update API types from OpenAPI spec"
```

## 検出された齟齬の扱い

APIレスポンスとOpenAPI仕様に齟齬が見つかった場合、以下のドキュメントに記録します：

- [`docs/api-spec-discrepancies.md`](./api-spec-discrepancies.md)

### 対処方針

齟齬が検出された場合、以下の2つの選択肢があります：

**オプション1: 仕様を実装に合わせる（推奨）**
- OpenAPI仕様を更新
- フロントエンド型定義を再生成
- 破壊的変更なし

**オプション2: 実装を仕様に合わせる**
- バックエンドコードを修正
- フロントエンドコードを更新
- 破壊的変更の可能性あり

## ベストプラクティス

### API変更時の手順

1. **仕様を先に更新**: `/api/v1/openapi.yaml` を修正
2. **フロントエンド型定義を再生成**: `npm run generate:types`
3. **コントラクトテストを更新**: 新しい仕様に合わせてテストを追加/修正
4. **実装を更新**: バックエンドコードを変更
5. **検証**: `npm run test:contract` で仕様との整合性を確認

### 新しいエンドポイントの追加

1. OpenAPI仕様にエンドポイントを定義
2. フロントエンド型定義を再生成
3. コントラクトテストを作成（OpenAPI検証を含む）
4. バックエンド実装を追加
5. コントラクトテストで検証

### OpenAPI検証をスキップすべきケース

- リダイレクトレスポンス（302）でボディがない場合
- エラーレスポンスで仕様が詳細に定義されていない場合
- ファイルダウンロードなどバイナリレスポンス

これらの場合は、基本的なステータスコードとヘッダーの検証にとどめます。

## トラブルシューティング

### "response must NOT have additional properties"

実装が仕様に定義されていないフィールドを返しています。

**解決方法**:
1. フィールドが必要なら仕様に追加
2. 不要なら実装から削除

### "response must have required property"

仕様で必須と定義されたフィールドが実装から返されていません。

**解決方法**:
1. 実装にフィールドを追加
2. または、仕様で必須を外す（非推奨）

### "received did not match any path or method defined"

OpenAPI仕様にエンドポイントが定義されていません。

**解決方法**:
1. 仕様にエンドポイントを追加
2. または、テストのパスが間違っている可能性を確認

## 参考リンク

- [jest-openapi ドキュメント](https://github.com/openapi-library/OpenAPIValidators/tree/master/packages/jest-openapi)
- [openapi-typescript ドキュメント](https://github.com/drwpow/openapi-typescript)
- [OpenAPI 3.0 仕様](https://swagger.io/specification/)
