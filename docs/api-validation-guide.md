# API仕様検証ガイド

## 概要

このプロジェクトでは、OpenAPI仕様 (`/api/v1/openapi.yaml`) と実装の整合性を保証するため、**二重の検証メカニズム**を採用しています：

1. **バックエンド**: 自動的なOpenAPI検証（個別のテスト実装不要）
2. **フロントエンド**: 型定義の自動生成とCI検証

## バックエンド: 自動的なOpenAPI検証

### 革新的なアプローチ

**重要**: 個別のエンドポイントごとにテストを書く必要はありません。

すべてのAPI応答は `openapi-backend` ライブラリを使用して**自動的に**OpenAPI仕様と照合されます。

### 仕組み

1. **仕様の検証**: `openapi-spec-validation.test.ts` がOpenAPI仕様自体の妥当性を検証
2. **自動応答検証**: `validateAppRequest()` ヘルパー関数がすべてのAPI応答を自動検証
3. **透過的な検証**: 既存のテストは変更不要、自動的に検証が適用される

### 使用方法

#### テストでの自動検証

既存のテストで `validateAppRequest()` を使用するだけ：

```typescript
import { validateAppRequest } from '../helpers/openapi-auto-validator';

it('should return logs', async () => {
  // この呼び出しは自動的にOpenAPI仕様と照合されます
  const response = await validateAppRequest(app, '/logs', { method: 'GET' });
  expect(response.status).toBe(200);
  
  // ビジネスロジックのテストに集中できます
  const data = await response.json();
  expect(data.items).toBeDefined();
});
```

#### 既存のテストを変更せずに検証

`validateAppRequest()` を使わない既存のテストも、そのまま動作します。
必要に応じて、徐々に `validateAppRequest()` に移行できます。

### 検証内容

自動検証は以下をチェックします：

- ✅ レスポンスステータスコードが仕様で定義されている
- ✅ レスポンススキーマが仕様と一致
- ✅ 必須フィールドがすべて存在
- ✅ フィールドの型が正しい
- ✅ 値が制約（min/max、enum等）を満たす

### テストファイル

| ファイル | 目的 |
|---------|------|
| `openapi-spec-validation.test.ts` | OpenAPI仕様自体の妥当性を検証 |
| `openapi-auto-validation-demo.test.ts` | 自動検証の動作デモ |
| `helpers/openapi-auto-validator.ts` | 自動検証ヘルパー関数 |

### CI統合

バックエンドCIでは、OpenAPI仕様の検証を明示的に実行します：

```yaml
- name: Validate OpenAPI specification
  run: npm run test:contract -- tests/contract/openapi-spec-validation.test.ts
- name: Run all tests (includes automatic validation)
  run: npm test
```

### 新しいエンドポイントの追加

新しいエンドポイントを追加する場合：

1. OpenAPI仕様にエンドポイントを定義（`/api/v1/openapi.yaml`）
2. バックエンド実装を追加
3. 通常のビジネスロジックテストを作成（`validateAppRequest()`を使用）
4. 自動的にOpenAPI検証が適用される

**個別の検証テストは不要** - ビジネスロジックのテストだけで十分です。

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
