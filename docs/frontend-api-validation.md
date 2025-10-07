# フロントエンドAPIクライアントの堅牢化

## 概要

フロントエンドのAPIクライアントが使用する型定義をOpenAPI仕様から自動生成することで、API仕様との整合性を保証します。

## 実装内容

### 1. OpenAPI型生成の導入

- **openapi-typescript**: OpenAPI仕様からTypeScript型定義を自動生成するツール

### 2. 自動生成される型定義

OpenAPI仕様 (`/api/v1/openapi.yaml`) から以下のファイルが自動生成されます：

- `frontend/src/types/api.ts`: 完全なAPI型定義（自動生成、直接編集禁止）
- `frontend/src/api-types.ts`: よく使う型の再エクスポート

### 3. 使用方法

#### 型定義の生成

OpenAPI仕様が更新されたら、以下のコマンドで型を再生成します：

```bash
cd frontend
npm run generate:types
```

#### コード内での使用

```typescript
import { Log, Tag, User } from '@/api-types';

// 型安全なAPIクライアント使用
const response = await api.logs.$get();
const data: { items: Log[]; total: number } = await response.json();
```

## メリット

### 1. 自動化とメンテナンスフリー
OpenAPI仕様を更新して型を再生成するだけで、フロントエンドの型定義も自動的に更新されます。手動でのメンテナンスは不要です。

### 2. コンパイル時の型安全性
TypeScriptのコンパイラがAPI仕様に基づいた型チェックを行うため、仕様と実装の乖離をコンパイル時に検出できます。

### 3. IDEサポート
生成された型定義により、エディタの自動補完やインラインドキュメントが利用できます。

### 4. シンプルな構成
複雑なテストコードやモックの保守が不要で、型定義ファイルの自動生成のみで完結します。

## ワークフロー

### API変更時の手順

1. **OpenAPI仕様を更新**: `/api/v1/openapi.yaml` を編集
2. **バックエンド実装**: API実装を更新
3. **型を再生成**: `npm run generate:types` を実行
4. **フロントエンド更新**: TypeScriptコンパイラが型エラーを報告するため、それに従って修正
5. **ビルド確認**: `npm run build` で最終確認

### 日常的な開発

フロントエンド開発者は自動生成された型定義をインポートして使用するだけです：

```typescript
import { LogCreate, TagDetail } from '@/api-types';

const newLog: LogCreate = {
  title: 'タイトル',
  content_md: '# 内容',
  is_public: true,
};
```

## 技術詳細

### 生成される型の構造

`openapi-typescript` は以下の形式で型を生成します：

```typescript
// パス定義
export interface paths {
  "/logs": {
    get: {
      responses: {
        200: {
          content: {
            "application/json": {
              items: Log[];
              total: number;
            };
          };
        };
      };
    };
  };
}

// コンポーネントスキーマ
export interface components {
  schemas: {
    Log: { ... };
    Tag: { ... };
    User: { ... };
  };
}
```

### 型の再エクスポート

よく使う型は `api-types.ts` で再エクスポートしており、簡潔にインポートできます：

```typescript
// api-types.ts
export type Log = components['schemas']['Log'];
export type Tag = components['schemas']['Tag'];
// ...
```

## 既存の実装からの移行

以前のMSWベースのコントラクトテストは削除され、OpenAPI型生成に置き換えられました。これにより：

- ✅ テストコードのメンテナンス不要
- ✅ モックレスポンスの保守不要
- ✅ コンパイル時の型チェックで十分な安全性
- ✅ シンプルで理解しやすい構成

## 関連ドキュメント

- [OpenAPI仕様書](/api/v1/openapi.yaml)
- [openapi-typescript ドキュメント](https://github.com/drwpow/openapi-typescript)

## まとめ

OpenAPI仕様から型定義を自動生成することで、メンテナンスコストを最小限に抑えながら、TypeScriptの型システムを活用してAPI仕様との整合性を保証できます。

