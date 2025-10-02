# shumilog Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-01-08

## 必須開発指針

**重要**: 以下の指針は必須であり、競合する内容はこの指針に従って廃止されます。

1. **日本語での応答**: 全ての応答・説明・コメントは日本語で行う
2. **npmパッケージ管理**: パッケージの追加・変更・削除は必ずnpmコマンドで行う。パッケージ操作目的でpackage.jsonを直接編集することは禁止
3. **ランタイム・ライブラリ版本選択**: LTS版を最優先とし、LTSが存在しない場合のみ最新版を使用する
4. **日本語ドキュメント作成**: 人間が確認する全てのドキュメント（仕様書、計画書、README、コメント等）は日本語で記述する。特に`.specify/templates`配下のテンプレートやspec kitの出力は必ず日本語とする

## Active Technologies
- Node.js 22 LTS + npm 10+ (ランタイム)
- TypeScript 5.9+ (コンパイラ・開発言語)
- Cloudflare Workers + Hono (バックエンドフレームワーク)
- Cloudflare D1 (SQLiteベースデータベース)
- React 19 (フロントエンドライブラリ)
- Vite 7+ (フロントエンドビルドツール)
- Tailwind CSS 3.4+ (ユーティリティファーストCSSフレームワーク)
- shadcn/ui (アクセシブルUIコンポーネントライブラリ)
- PostCSS + Autoprefixer (CSS処理)
- Vitest (テストフレームワーク)
- Wrangler CLI (Cloudflare開発ツール)
- ESLint + Prettier (コード品質)

## プロジェクト構造
```
api/                    # 正規API仕様書（信頼できる情報源）
backend/                # Cloudflare Workers バックエンド
frontend/               # React 19 + Tailwind CSS フロントエンド
tests/                  # テストファイル
```

## デザイン指針
- **スマートフォンファーストのレスポンシブデザイン** - モバイル端末での利用を最優先
- **ライトテーマ** - 清涼感のある明るいデザイン
- **シンプルで軽量** - 最小限のUIコンポーネントで直感的な操作性
- **アクセシビリティ** - shadcn/uiによる標準準拠のアクセシブルコンポーネント

## API開発ガイドライン
- 正規のAPI仕様書は `/api/v1/openapi.yaml` にあり、これを最新に保つ必要があります
- 変更実装前に必ずAPI仕様書を更新する
- コントラクトテストは正規仕様を参照する
- 仕様書はすべてのAPI開発の信頼できる情報源です

## パッケージ管理とコマンド

### npmパッケージ管理（必須遵守）
- パッケージ追加: `npm install <package-name>`
- パッケージ削除: `npm uninstall <package-name>`
- devDependencies追加: `npm install --save-dev <package-name>`
- **package.jsonの直接編集は禁止** - 必ずnpmコマンドを使用

### 開発コマンド
- `npm test` - テスト実行
- `npm run lint` - リント実行
- `npm run dev` - 開発サーバー起動
- `npm run build` - ビルド実行

## コードスタイル
- TypeScript: 標準的な規約に従う
- ESLint設定に準拠
- Prettierによる自動フォーマット
- 日本語コメント推奨

## 開発時の動作確認手順（必須）

### シードデータの投入
**重要**: 開発中に画面や動作を確認する際は、**必ず**シードデータを投入してから確認すること。

```bash
cd backend
npm run db:migrate  # 初回またはスキーマ変更時
npm run db:seed     # シードデータを投入（毎回実行可能）
npm run dev         # 開発サーバー起動
```

シードデータには以下が含まれます:
- **4人のユーザー**: Alice, Bob, Carol, Dave（各種趣味を持つキャラクター）
- **8個のタグ**: Anime, Manga, Gaming, Music, Attack on Titan, RPG, J-POP, Shonen
- **10個のログエントリ**: 公開ログ8個、非公開ログ2個

### 更新系操作のセッション指定

#### 開発時のセッション発行（手動テスト用）

特定のユーザーでログインした状態を作成するには、npmコマンドでセッショントークンを発行します:

```bash
cd backend
npm run dev:create-session alice

# 出力例:
# ==========================================
# セッショントークン:
# RmLPtgoNSPNt4lSZ0zUPcWag7fcvtdWY
# ==========================================
```

利用可能なユーザー:
- `alice` (user_alice) - アニメ好き
- `bob` (user_bob) - ゲーマー
- `carol` (user_carol) - 音楽愛好家
- `dave` (user_dave) - マンガ読者

発行されたトークンを使用してAPIをテストできます:

```bash
# curlでの例
curl -X GET http://localhost:8787/api/users/me \
  -H "Cookie: session=RmLPtgoNSPNt4lSZ0zUPcWag7fcvtdWY"

curl -X POST http://localhost:8787/api/logs \
  -H "Content-Type: application/json" \
  -H "Cookie: session=RmLPtgoNSPNt4lSZ0zUPcWag7fcvtdWY" \
  -d '{"title":"Test","content_md":"# Test","is_public":true}'
```

**ブラウザでの設定:**
開発者ツールでCookieを設定:
- 名前: `session`
- 値: `<発行されたトークン>`
- ドメイン: `localhost`
- パス: `/`

#### テストコード内でのセッション作成

```bash
# テストヘルパーでセッション作成する場合（テストコード内）
const sessionToken = await createTestSession('user_alice');

# APIリクエスト時にセッションを指定
const response = await app.request('/logs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Cookie: `session=${sessionToken}`  // セッションをCookieで指定
  },
  body: JSON.stringify({
    title: 'New Log',
    content_md: '# Content',
    is_public: true
  })
});
```

## 最新の変更
- 2025-01-08: Copilotインストラクション見直し - 日本語応答・npmパッケージ管理・LTS優先の必須指針追加
- Node.js 22 LTS + npm 10+への統一（.nvmrc: 22.20.0）
- TypeScript 5.9+、React 19、Vite 7+への更新
- Tailwind CSS 3.4+ + shadcn/ui導入によるレスポンシブデザイン実装
- スマートフォンファーストのライトテーマUIコンポーネント体系構築

<!-- MANUAL ADDITIONS START -->
## API仕様の管理

正規のAPI仕様書は `/api/v1/openapi.yaml` にあり、すべてのAPI開発の**信頼できる情報源**として機能します。この仕様書は実装と常に同期して保守する必要があります。

### API変更時の手順:
1. `/api/v1/openapi.yaml` を最初に更新
2. 仕様に合わせてコントラクトテストを更新
3. バックエンドでAPI変更を実装
4. `npm run test:contract` で仕様と実装の適合性を検証

### 重要なポイント:
- 正規仕様は常に `/api/v1/openapi.yaml` を参照
- `specs/001-web-x-twitter/contracts/api.yaml` の旧ロケーションは非推奨
- コントラクトテストは正規仕様に対して検証を行う
- APIエンドポイント、スキーマ、動作が変更された際は仕様を更新
<!-- MANUAL ADDITIONS END -->
