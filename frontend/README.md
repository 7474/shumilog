# Shumilog フロントエンド

ShumilogのReact + Tailwind CSSフロントエンドです。

## 技術スタック

- **React 19** - 最新のUIライブラリ
- **TypeScript 5.9+** - 型安全な開発
- **Vite 7+** - 高速ビルドツール
- **Tailwind CSS 4.1+** - ユーティリティファーストCSSフレームワーク
- **shadcn/ui** - アクセシブルなUIコンポーネントライブラリ
- **React Router v7** - クライアントサイドルーティング
- **React Hook Form** - フォーム状態管理
- **Zod** - スキーマバリデーション
- **Lucide React** - アイコンライブラリ

## デザインシステム

### スマートフォンファーストデザイン
- レスポンシブブレークポイント: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- モバイル端末での利用を最優先とした設計

### カラーパレット
- **ライトテーマ**: 清涼感のある明るいデザイン
- **プライマリカラー**: Fresh (青緑系) - `fresh-500` (#14b8a6)
- **セカンダリカラー**: Sky (青系) - `sky-500` (#0ea5e9)
- **CSS変数**: shadcn/ui標準のHSLベースのカラーシステム

### UIコンポーネント
shadcn/uiをベースとしたアクセシブルなコンポーネント体系：

- **基本コンポーネント** (`src/components/ui/`)
  - Button, Input, Label
  - Card, Badge
  - Dialog, Sheet (モーダル/サイドバー)

- **アプリケーションコンポーネント** (`src/components/`)
  - `AppLayout.tsx` - 全体レイアウト
  - `Header.tsx` - ナビゲーションヘッダー
  - `LogForm.tsx` - ログ作成フォーム
  - `TagForm.tsx` - タグ作成フォーム
  - `ProtectedRoute.tsx` - 認証ガード

## ディレクトリ構造

```
src/
├── components/          # UIコンポーネント
│   ├── ui/             # shadcn/ui基本コンポーネント
│   ├── AppLayout.tsx   # アプリレイアウト
│   ├── Header.tsx      # ヘッダーコンポーネント
│   └── *.tsx           # その他アプリケーションコンポーネント
├── pages/              # ページコンポーネント
├── hooks/              # カスタムReactフック
├── lib/                # ユーティリティ関数
├── services/           # API クライアント
├── api-types.ts        # OpenAPI仕様から生成される型定義
├── models.ts           # アプリケーション固有の型定義
├── Router.tsx          # ルーティング設定
├── index.css           # Tailwind CSSインポート
└── main.tsx            # Reactエントリーポイント
```

## 開発コマンド

```bash
# 開発サーバー起動 (http://localhost:5173)
npm run dev

# 本番ビルド
npm run build

# プレビュー
npm run preview

# テスト実行
npm run test

# スモークテスト
npm run test:smoke

# OpenAPI型定義生成
npm run generate:types

# リント実行
npm run lint

# リント自動修正
npm run lint:fix

# コードフォーマット
npm run format
```

## OpenAPI型定義の自動生成

フロントエンドの型定義は**OpenAPI仕様から自動生成**されます。これにより、API仕様との整合性を保証し、TypeScriptの型チェックによってコンパイル時にAPI仕様との乖離を検出できます。

### 型定義の生成

OpenAPI仕様が更新されたら、以下のコマンドで型を再生成します：

```bash
npm run generate:types
```

### 使用方法

**openapi-fetch**による型安全なAPIクライアントを使用します：

```typescript
import { Log, Tag, User } from '@/api-types';

// GET リクエスト
const { data, error } = await api.GET('/logs', {
  params: { query: { search: 'anime' } }
});

if (data) {
  // dataは自動的に型付けされる
  data.items.forEach(log => console.log(log.title));
}

// POST リクエスト
const result = await api.POST('/logs', {
  body: {
    title: 'タイトル',
    content_md: '# 内容',
  }
});
```

### メリット

- ✅ **完全な型安全性**: レスポンス型がunknownではなく具体的な型に
- ✅ **コンパイル時検証**: パス・クエリ・ボディパラメータの型チェック
- ✅ **自動化**: OpenAPI仕様の更新だけで型定義も自動更新
- ✅ **軽量**: わずか6kbのライブラリサイズ
- ✅ **IDEサポート**: 自動補完とインラインドキュメント

詳細は [フロントエンドAPI検証ガイド](../docs/frontend-api-validation.md) を参照してください。


## 設定ファイル

- `vite.config.ts` - Vite設定（Tailwind CSS 4.1+ 統合を含む）
- `components.json` - shadcn/ui設定

## APIプロキシ

開発時、`/api`へのリクエストは自動的に`http://localhost:8787`（Cloudflare Worker）にプロキシされます。

## スタイリングガイドライン

### Tailwind CSS使用方針
- **ユーティリティファースト** - カスタムCSSよりもTailwindユーティリティクラスを優先
- **レスポンシブデザイン** - `sm:`, `md:`などのブレークポイント修飾子を活用
- **一貫性** - shadcn/uiのデザイントークンとCSS変数を基準とする

### 推奨クラス例
```tsx
// スマートフォンファーストレイアウト
<div className="flex flex-col gap-4 p-4 md:flex-row md:gap-6 md:p-6">

// カードコンポーネント
<div className="rounded-lg border bg-card p-6 shadow-sm">

// ボタンスタイル
<button className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">
```

## アクセシビリティ

shadcn/uiコンポーネントはWCAG準拠のアクセシビリティを提供：
- キーボードナビゲーション対応
- スクリーンリーダー対応
- 適切なARIAラベル
- フォーカス管理

## パフォーマンス

- **Vite** による高速な開発サーバーとビルド
- **React 19** の新機能による最適化
- **Tree shaking** による不要コードの除去
- **Code splitting** による動的インポート対応