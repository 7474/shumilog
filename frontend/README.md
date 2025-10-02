# Shumilog フロントエンド

趣味コンテンツログサービスのReact + Tailwind CSSフロントエンドです。

## 技術スタック

- **React 19** - 最新のUIライブラリ
- **TypeScript 5.9+** - 型安全な開発
- **Vite 7+** - 高速ビルドツール
- **Tailwind CSS 3.4+** - ユーティリティファーストCSSフレームワーク
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
├── models.ts           # TypeScript型定義
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
```

## 設定ファイル

- `tailwind.config.cjs` - Tailwind CSS設定
- `components.json` - shadcn/ui設定
- `postcss.config.cjs` - PostCSS設定
- `vite.config.ts` - Vite設定

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