# API仕様検証ガイド

## 概要

このプロジェクトでは、OpenAPI仕様 (`/api/v1/openapi.yaml`) と実装の整合性を保証するため、**二重の検証メカニズム**を採用しています：

1. **バックエンド**: 一元化されたコントラクトテストによるOpenAPI検証
2. **フロントエンド**: 型定義の自動生成とCI検証

## バックエンド: 一元化されたOpenAPI検証

### 新しいアプローチ

すべてのAPI endpointの OpenAPI 検証は **単一の専用テストファイル** で集中管理されています：

**`backend/tests/contract/openapi-validation.test.ts`**

このアプローチの利点：
- ✅ **一元管理**: すべてのエンドポイントの検証が1箇所に集約
- ✅ **保守性の向上**: 個別のテストファイルに検証コードを追加する必要なし
- ✅ **網羅的**: すべてのCRUD操作と主要なエンドポイントを自動検証
- ✅ **CI統合**: 専用のCIステップで明示的に実行

### 対象範囲

一元化されたテストは以下をカバーします：

**公開エンドポイント:**
- `GET /health`
- `GET /logs`, `GET /logs/{logId}`, `GET /logs/{logId}/related`
- `GET /tags`, `GET /tags/{tagId}`, `GET /tags/{tagId}/associations`

**認証が必要なエンドポイント:**
- `GET /users/me`, `GET /users/me/logs`, `GET /users/me/stats`
- `POST /logs`, `PUT /logs/{logId}`
- `POST /tags`, `PUT /tags/{tagId}`
- `POST /support/tags`

### 個別テストでの検証は不要

**重要**: 個別のコントラクトテスト（例: `logs.contract.test.ts`, `tags.contract.test.ts`）に `toSatisfyApiSpec()` を追加する必要は**ありません**。

すべてのエンドポイントは `openapi-validation.test.ts` で自動的に検証されます。個別テストはビジネスロジックや特定の動作の検証に専念できます。

### 既知の制限事項

1. **GET /tags/{tagId}**: スキーマ不一致のため検証がスキップされています（`docs/api-spec-discrepancies.md` 参照）
2. **エラーレスポンス**: OpenAPI 仕様にエラーレスポンスのスキーマが定義されていないため、エラーレスポンスの検証はスキップされています

### CI統合

バックエンドCIでは、一元化されたOpenAPI検証テストを**明示的に**実行します：

```yaml
- name: Run comprehensive OpenAPI validation
  run: npm run test:contract -- tests/contract/openapi-validation.test.ts
- name: Run all tests
  run: npm test
```

これにより、API仕様の検証が確実に実行され、結果が可視化されます。

### 新しいエンドポイントの追加

新しいエンドポイントを追加する場合：

1. OpenAPI仕様にエンドポイントを定義（`/api/v1/openapi.yaml`）
2. `backend/tests/contract/openapi-validation.test.ts` に検証テストを追加
3. バックエンド実装を追加
4. テストを実行して検証

```typescript
it('GET /new-endpoint - validates against spec', async () => {
  const response = await app.request('/new-endpoint', { method: 'GET' });
  expect(response.status).toBe(200);
  
  const openApiResponse = await toOpenApiResponse(response, '/new-endpoint', 'GET');
  expect(openApiResponse).toSatisfyApiSpec();
});
```

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
