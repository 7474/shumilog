# Cache API 実装ガイド

## 概要

Cloudflare Workers の Cache API を使用して、バックエンド API のレスポンスをキャッシュする機能を実装しました。これにより、パフォーマンスの向上とオリジンサーバーへの負荷軽減を実現します。

## 実装内容

### 1. Cache API ミドルウェアの追加

`backend/src/middleware/cache.ts` に `cacheApi()` ミドルウェアを追加しました。

**主な機能:**
- GETリクエストかつ認証不要のエンドポイントを自動的にキャッシュ
- キャッシュヒット時は `X-Cache-Status: HIT` ヘッダーを付加
- キャッシュミス時は `X-Cache-Status: MISS` ヘッダーを付加
- Cache-Control ヘッダーに従ってキャッシュの有効期限を管理

**キャッシュの条件:**
- ✅ GETリクエスト
- ✅ 認証情報なし（Cookie: session が設定されていない）
- ✅ 成功レスポンス（2xx）
- ✅ 非公開データを含まない（`hasPrivateData` フラグが設定されていない）
- ❌ POSTなどの変更リクエストはキャッシュしない
- ❌ 認証が必要なエンドポイントはキャッシュしない
- ❌ エラーレスポンスはキャッシュしない

### 2. 既存の Cache-Control ミドルウェアとの統合

Cache API ミドルウェアは既存の `cacheControl()` ミドルウェアと併用されます：

```typescript
app.use('*', cacheApi());      // Cache API によるキャッシュ
app.use('*', cacheControl());  // Cache-Control ヘッダーの設定
```

**役割分担:**
- `cacheApi()`: Cloudflare Workers のエッジキャッシュに応答を保存
- `cacheControl()`: ブラウザキャッシュとCDNキャッシュの挙動を制御するヘッダーを設定

### 3. テスト環境への対応

テスト環境では Cache API が利用できない場合があるため、以下の対応を実施：

```typescript
// Cache API が利用可能かチェック
if (typeof caches === 'undefined') {
  await next();
  return;
}
```

また、ESLint の設定に `caches` グローバル変数を追加：

```javascript
globals: {
  ...globals.node,
  ...globals.webworker,
  ExecutionContext: 'readonly',
  caches: 'readonly',  // ← 追加
},
```

### 4. 新しいコントラクトテストの追加

`backend/tests/contract/cache-api.test.ts` を追加し、Cache API の動作を検証：

- ✅ 公開エンドポイントが正しくキャッシュされること
- ✅ X-Cache-Status ヘッダーが正しく設定されること
- ✅ Cache-Control ヘッダーと併用されること
- ✅ 認証必要エンドポイントがキャッシュされないこと

## 動作の流れ

### キャッシュミス時（初回リクエスト）

```
1. クライアント → GET /logs
2. cacheApi ミドルウェア
   ↓ キャッシュを確認 → なし
3. 次のミドルウェア・ハンドラーを実行
4. レスポンス生成
5. cacheApi: レスポンスをキャッシュに保存
   - X-Cache-Status: MISS を付加
6. cacheControl: Cache-Control ヘッダーを設定
   - Cache-Control: public, max-age=300, s-maxage=300, stale-while-revalidate=60
7. クライアント ← レスポンス
```

### キャッシュヒット時（2回目以降）

```
1. クライアント → GET /logs
2. cacheApi ミドルウェア
   ↓ キャッシュを確認 → あり
3. キャッシュからレスポンスを返す
   - X-Cache-Status: HIT を付加
4. クライアント ← レスポンス（高速）
```

## キャッシュされるエンドポイント

以下のエンドポイントが自動的にキャッシュされます：

- `GET /health` - ヘルスチェック
- `GET /logs` - 公開ログ一覧
- `GET /logs/:id` - 公開ログ詳細
- `GET /tags` - タグ一覧

## キャッシュされないエンドポイント

以下のエンドポイントはキャッシュされません：

- `GET /users/me` - 認証必要
- `POST /logs` - 変更操作
- `PUT /logs/:id` - 変更操作
- `DELETE /logs/:id` - 変更操作
- 認証が必要なすべてのエンドポイント
- エラーレスポンス（4xx, 5xx）

## キャッシュの有効期限

Cache-Control ヘッダーにより制御されます：

- **ブラウザキャッシュ**: 5分間（max-age=300）
- **CDN/エッジキャッシュ**: 5分間（s-maxage=300）
- **再検証中**: 古いコンテンツを60秒間提供可能（stale-while-revalidate=60）

## デバッグ方法

### X-Cache-Status ヘッダーの確認

レスポンスヘッダーの `X-Cache-Status` を確認することで、キャッシュの状態を把握できます：

```bash
curl -I http://localhost:8787/api/logs
```

```
HTTP/1.1 200 OK
Cache-Control: public, max-age=300, s-maxage=300, stale-while-revalidate=60
Vary: Origin
X-Cache-Status: MISS  # または HIT
```

### ローカル開発環境での動作

ローカル開発環境（`wrangler dev`）では、Miniflare が Cache API をエミュレートします。ただし、テスト環境では Cache API が利用できない場合があり、その場合は `X-Cache-Status` ヘッダーは設定されません。

## 参考資料

- [Cloudflare Workers Cache API ドキュメント](https://developers.cloudflare.com/workers/runtime-apis/cache/)
- [Cloudflare Workers Cache API サンプル（Hono）](https://developers.cloudflare.com/workers/examples/cache-api/)
- [Cache-Control ヘッダーの仕様](https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Cache-Control)

## まとめ

この実装により、以下の効果が期待できます：

1. **パフォーマンス向上**: キャッシュヒット時はオリジンサーバーへのリクエストが不要
2. **負荷軽減**: データベースクエリの削減
3. **コスト削減**: Cloudflare Workers の実行時間削減
4. **透過的**: 既存のAPIに変更不要で自動的にキャッシュ

キャッシュは適切なタイミングで自動的に期限切れになるため、データの鮮度とパフォーマンスのバランスが取れています。
