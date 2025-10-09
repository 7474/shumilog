# フロントエンドAPIクライアント移行ガイド

## 概要

このドキュメントは、Hono ClientからOpenAPI型定義に基づくopenapi-fetchへの移行について説明します。

## 変更理由

### 課題

Honoクライアントには以下の問題がありました：

1. **型の不完全性**: レスポンスの型が `unknown` となり、静的型解析が十分に機能しない
2. **実行時エラー**: 型の問題がコンパイル時に検出されず、実行時にエラーが発生
3. **保守性**: API仕様との同期が取りにくい

### 解決策

**openapi-fetch**を採用することで以下を実現：

- ✅ OpenAPI仕様から自動生成された型定義による完全な型安全性
- ✅ パス、クエリ、ボディパラメータの厳密な型チェック
- ✅ コンパイル時のAPI仕様検証
- ✅ IDEによる強力な自動補完サポート

## 技術選定

### openapi-fetch

- **公式サポート**: openapi-typescriptの公式コンパニオンライブラリ
- **軽量**: わずか6kbのバンドルサイズ
- **型安全**: 完全なTypeScript型推論
- **依存なし**: 追加のコード生成不要

## API使用パターンの変更

### Before（Hono Client）

```typescript
// GET リクエスト
const response = await api.logs.$get({ query: { search } });
if (!response.ok) {
  throw new Error('Failed to fetch logs');
}
const data = await response.json(); // 型: unknown

// POST リクエスト
const response = await api.logs.$post({ json: { title, content_md } });
const result = await response.json(); // 型: unknown

// Path パラメータ
const response = await api.logs[':id'].$get({ param: { id } });

// PUT リクエスト
const response = await api.logs[':id'].$put({ 
  param: { id }, 
  json: { title, content_md } 
});
```

### After（openapi-fetch）

```typescript
// GET リクエスト
const { data, error } = await api.GET('/logs', {
  params: { query: { search } }
});
// data: { items: Log[], total: number } | undefined
// error: OpenAPIエラー型 | undefined

// POST リクエスト
const { data, error } = await api.POST('/logs', {
  body: { title, content_md }
});
// data: Log | undefined

// Path パラメータ
const { data, error } = await api.GET('/logs/{id}', {
  params: { path: { id } }
});

// PUT リクエスト
const { data, error } = await api.PUT('/logs/{id}', {
  params: { path: { id } },
  body: { title, content_md }
});
```

## 主な違い

### 1. メソッド名の変更

- `.$get()` → `.GET()`
- `.$post()` → `.POST()`
- `.$put()` → `.PUT()`
- `.$delete()` → `.DELETE()`

### 2. パラメータの構造

**Hono Client:**
- `{ query }` - クエリパラメータ
- `{ param }` - パスパラメータ
- `{ json }` - リクエストボディ

**openapi-fetch:**
- `{ params: { query } }` - クエリパラメータ
- `{ params: { path } }` - パスパラメータ
- `{ body }` - リクエストボディ

### 3. レスポンス処理

**Hono Client:**
```typescript
const response = await api.logs.$get();
if (!response.ok) {
  // エラーハンドリング
}
const data = await response.json(); // unknown型
```

**openapi-fetch:**
```typescript
const { data, error } = await api.GET('/logs', {});
if (error) {
  // error は型付けされている
}
if (data) {
  // data は具体的な型
}
```

### 4. パス指定

**Hono Client:**
- ネストした構造: `api.logs[':id'].$get()`

**openapi-fetch:**
- 文字列パス: `api.GET('/logs/{id}')`
- TypeScriptがパスの存在を検証

## 型安全性の例

### コンパイル時検証

```typescript
// ✅ 正しい使用
const { data } = await api.GET('/logs', {
  params: { query: { search: 'anime' } }
});

// ❌ TypeScriptエラー: 存在しないパス
const { data } = await api.GET('/invalid-path', {});

// ❌ TypeScriptエラー: 不正なクエリパラメータ
const { data } = await api.GET('/logs', {
  params: { query: { invalidParam: 'test' } }
});

// ❌ TypeScriptエラー: 必須パラメータの欠落
const { data } = await api.POST('/logs', {
  body: { title: 'Test' } // content_mdが必須
});
```

### IDEサポート

openapi-fetchを使用すると、以下のIDEサポートが得られます：

- **自動補完**: パス、パラメータ、レスポンスフィールド
- **インライン型情報**: カーソルホバーで型情報を表示
- **エラー検出**: タイプミスや型の不一致を即座に検出
- **リファクタリング**: 安全な名前変更とコード整理

## 移行チェックリスト

- [x] openapi-fetchパッケージのインストール
- [x] APIクライアントの書き換え（`src/services/api.ts`）
- [x] 全ページコンポーネントの更新
- [x] 全共有コンポーネントの更新
- [x] カスタムフックの更新
- [x] ユニットテストの更新
- [x] 統合テストの更新
- [x] テストモックの更新
- [x] ドキュメントの更新
- [x] ビルド確認
- [x] テスト実行（全テスト成功）

## ベストプラクティス

### 1. エラーハンドリング

```typescript
const { data, error, response } = await api.GET('/logs', {});

if (error) {
  // errorは型付けされている
  if (response?.status === 401) {
    // 認証エラー
    navigate('/login');
    return;
  }
  throw new Error('Failed to fetch logs');
}

if (data) {
  // dataは具体的な型
  setLogs(data.items);
}
```

### 2. 型の再利用

```typescript
import { Log, LogCreate } from '@/api-types';

// 型定義を再利用
const newLog: LogCreate = {
  title: 'タイトル',
  content_md: '# 内容',
};

const { data } = await api.POST('/logs', { body: newLog });
```

### 3. レスポンス型の活用

```typescript
// レスポンス型は自動的に推論される
const { data } = await api.GET('/logs/{logId}', {
  params: { path: { logId: '123' } }
});

// dataはLogDetail型（またはundefined）
if (data) {
  console.log(data.title); // ✅ 型安全
  console.log(data.user.display_name); // ✅ ネストされた型も安全
}
```

## トラブルシューティング

### Q: 型生成が正しく動作しない

A: OpenAPI仕様を更新後、必ず型を再生成してください：
```bash
cd frontend
npm run generate:types
```

### Q: パスパラメータの型エラー

A: パスパラメータは `params.path` オブジェクト内に指定します：
```typescript
// ❌ 誤り
api.GET('/logs/{id}', { params: { id } })

// ✅ 正しい
api.GET('/logs/{id}', { params: { path: { id } } })
```

### Q: オプショナルパラメータの扱い

A: TypeScriptがオプショナル性を認識します：
```typescript
// searchはオプショナル
const { data } = await api.GET('/logs', {
  params: { query: {} } // OK
});

const { data } = await api.GET('/logs', {
  params: { query: { search: 'test' } } // OK
});
```

## 参考資料

- [openapi-fetch GitHub](https://github.com/drwpow/openapi-typescript/tree/main/packages/openapi-fetch)
- [openapi-typescript ドキュメント](https://openapi-ts.dev/)
- [フロントエンドAPI検証ガイド](./frontend-api-validation.md)
