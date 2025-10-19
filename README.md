# Shumilog - 趣味コンテンツログサービス

趣味コンテンツのログ記録のためのCloudflare Workerバックエンドと、Tailwind CSS + React 19ベースのレスポンシブフロントエンドです。

## 運用環境

https://shumilog.dev/

## ドキュメント

- [システムアーキテクチャ](./docs/architecture.md) - システム全体構成の概観（Mermaid図解付き）

## 技術スタック

### バックエンド
- Cloudflare Workers + Hono - サーバーレスAPI
- Cloudflare D1 - SQLiteベースマネージドデータベース
- Cloudflare R2 - オブジェクトストレージ（画像アップロード用）
- TypeScript 5.9+ - 型安全な開発

### フロントエンド
- React 19 - UIライブラリ
- Vite 7+ - 高速ビルドツール
- Tailwind CSS 4.1+ - ユーティリティファーストCSSフレームワーク
- shadcn/ui - アクセシブルなUIコンポーネントライブラリ
- PostCSS + Autoprefixer - CSS処理
- スマートフォンファーストのレスポンシブデザイン

### 開発・テスト
- Vitest - 高速テストフレームワーク
- ESLint + Prettier - コード品質とフォーマット
- TypeScript - 型チェック

## 必要な環境

- Node.js 22 LTS – [`.nvmrc`](./.nvmrc)で定義されたバージョンを`nvm use`で使用
- npm 10+ (Node 22にバンドル済み)
- Wrangler CLI 3+ ローカルWorkerとD1開発用 (`npm install -g wrangler`)
- *(オプション)* 共有エンドポイントを使用する場合はTwitter API認証情報

## クイックスタート

### 1. 依存関係のインストール

```bash
git clone <repository-url>
cd shumilog
nvm use

npm install --prefix backend
npm install --prefix frontend
```

### 2. ローカルデータベースの準備 (Cloudflare D1)

```bash
cd backend
npm run db:migrate
npm run db:seed
```

シードデータには以下が含まれます:
- 4人のユーザー: Alice (アニメ好き), Bob (ゲーマー), Carol (音楽愛好家), Dave (マンガ読者)
- 8個のタグ: Anime, Manga, Gaming, Music, Attack on Titan, RPG, J-POP, Shonen
- 10個のログエントリ: 公開ログ8個、非公開ログ2個（各種趣味のコンテンツ）
- 5個の画像メタデータ: ログに添付された画像のサンプルメタデータ（実際のファイルはR2バケットが必要）

### 3. ローカル環境でのスタック実行

- ターミナル A – Worker API

  ```bash
  cd backend
  npm run dev
  ```

- ターミナル B – フロントエンド UI

  ```bash
  cd frontend
  npm run dev
  ```

フロントエンドは`/api`リクエストを`http://localhost:8787`にプロキシし、Worker開発サーバーと連携します。

### 4. セットアップの検証

```bash
# backend/ で実行
npm run test:contract

# frontend/ で実行
npm run test:smoke
```

手動確認:

- フロントエンドUI → http://localhost:5173
- ヘルスチェック → http://localhost:8787/health
- パブリックログAPI → http://localhost:8787/api/logs

### 5. 認証が必要なAPIのテスト

特定のユーザーでログインした状態でAPIをテストするには、セッショントークンを発行します:

```bash
cd backend
npm run dev:create-session alice
```

発行されたトークンを使用してAPIをテストできます:

```bash
# curlの例
curl -X GET http://localhost:8787/api/users/me \
  -H "Cookie: session=<発行されたトークン>"

# または、ブラウザの開発者ツールでCookieを設定
# 名前: session
# 値: <発行されたトークン>
# ドメイン: localhost
# パス: /
```

利用可能なユーザー:
- `alice` (user_alice) - アニメ好き
- `bob` (user_bob) - ゲーマー
- `carol` (user_carol) - 音楽愛好家
- `dave` (user_dave) - マンガ読者

## 有用なスクリプト

| 場所 | コマンド | 目的 |
|------|----------|------|
| `backend/` | `npm run dev` | ローカルD1永続化を使用してWranglerでWorkerを実行 |
| `backend/` | `npm run test:contract` | VitestでAPIコントラクトスイートを実行 |
| `backend/` | `npm run db:migrate` | 再シードなしでマイグレーションを適用 |
| `backend/` | `npm run db:seed` | スキーマを再作成し、実用的なシードデータ（4ユーザー、8タグ、10ログ）を読み込み |
| `backend/` | `npm run dev:create-session <user_id>` | 開発用セッショントークンを発行（例: `alice`, `user_bob`） |
| `frontend/` | `npm run dev` | HMR + APIプロキシでVite開発サーバーを起動 |
| `frontend/` | `npm run build` | `frontend/dist/`への本番ビルドを生成 |
| `frontend/` | `npm run test:smoke` | 最小UIスモークテストハーネスを実行 |
| `frontend/` | `npm run generate:types` | OpenAPI仕様からTypeScript型定義を生成 |

## テストとリンティング

```bash
# バックエンドAPIコントラクトテスト
cd backend
npm run test:contract

# フロントエンド型定義生成（OpenAPI仕様から）
cd frontend
npm run generate:types

# フロントエンドスモークテスト
cd frontend
npm run test:smoke

# 型チェック (backend/)
cd backend
npm run build

# バックエンドソースのリント
cd backend
npm run lint

# フロントエンドソースのリント
cd frontend
npm run lint
```

バックエンドはOpenAPI仕様に対する自動検証を実装しており、フロントエンドはOpenAPI仕様からTypeScript型定義を自動生成することで、API実装とクライアントコードが常に仕様と一致していることを保証します。

CI/CD統合:
- バックエンドCI: コントラクトテスト（OpenAPI検証）を明示的に実行
- フロントエンドCI: 型定義を再生成し、差分がある場合はビルドを失敗させる

## API開発

正規のAPI仕様書は`/api/v1/openapi.yaml`にあります。このファイルはすべてのAPI開発の信頼できる情報源であり、継続的に保守する必要があります。

### OpenAPI仕様の自動検証

バックエンドにはOpenAPI仕様の自動検証機能が組み込まれており、API実装が定義された仕様と一致することを保証します。

コントラクトテストは以下を自動的に検証します：
- ✅ レスポンスステータスコードが仕様と一致
- ✅ レスポンスボディの構造が定義されたスキーマと一致
- ✅ 必須フィールドが存在
- ✅ フィールドの型が正しい
- ✅ 列挙値が有効

### API開発ワークフロー

1. 最初に仕様書を更新 - 計画した変更を反映するため`/api/v1/openapi.yaml`を修正
2. コントラクトテストを更新 - `backend/tests/contract/`のテストが仕様書と一致することを確認
3. 変更を実装 - 仕様書に合わせてバックエンド実装を更新
4. 適合性を検証 - `npm run test:contract`を実行して実装が仕様書と一致することを確認

仕様書は常に実際のAPI実装と最新の状態に保つ必要があります。OpenAPI検証により、仕様と実装の乖離を早期に発見できます。

## プロジェクト構造

```
shumilog/
├── api/                     # 正規API仕様書（信頼できる情報源）
│   └── v1/openapi.yaml      # OpenAPI 3.0仕様書 - 常に最新に保つ必要あり
├── backend/                 # Cloudflare Worker + D1ロジック
│   ├── src/
│   │   ├── routes/          # Honoルートハンドラー
│   │   ├── services/        # ドメインサービス (ImageService含む)
│   │   ├── models/          # データモデル (Image含む)
│   │   └── db/              # マイグレーション + シードヘルパー
│   └── tests/               # コントラクト、統合、ユニットテストスイート
├── frontend/                # React + Tailwind CSSフロントエンド
│   ├── src/
│   │   ├── components/      # shadcn/ui + カスタムUIコンポーネント (ImageUpload, LogImages含む)
│   │   ├── pages/           # ページコンポーネント
│   │   ├── services/        # API クライアント
│   │   ├── hooks/           # カスタムReactフック
│   │   ├── lib/             # ユーティリティと設定
│   │   ├── api-types.ts     # OpenAPI仕様から生成される型定義
│   │   └── models.ts        # アプリケーション固有の型定義
│   ├── vite.config.ts       # Vite設定（Tailwind CSS 4.1+含む）
│   └── components.json      # shadcn/ui設定
└── README.md                # このファイル
```

## 主要機能

### ログ記録
- Markdown形式でのコンテンツ記録
- タイトルと本文での詳細な記録
- 公開/非公開の設定
- タグによる分類

### 画像添付
- ログに画像を添付可能
- 対応形式: JPEG, PNG, GIF, WebP
- Cloudflare R2ストレージを使用
- 画像のプレビューとグリッド表示
- 画像の並び順カスタマイズ

### SSR対応（Cloudflare Pages Functions）
- SSRフレームワーク: Cloudflare Pages Functionsを採用（軽量・シンプル・オープン）
- Twitter、Facebook、Slackなどのリンクプレビュー対応
- ログ詳細ページとタグ詳細ページのOGPメタタグ自動生成

### タグシステム
- ハッシュタグ形式でのタグ付け
- タグ間の関連付け
- 人気タグの表示

### ユーザー管理
- Twitter OAuth認証
- ユーザープロフィール
- ログの所有権管理

## デプロイメント

### フロントエンド (Cloudflare Pages)

Cloudflare Pagesを使用してフロントエンドをデプロイします。GitHubリポジトリと連携することで、プッシュ時に自動的にビルドとデプロイが行われます。

ビルド設定:
- ビルドコマンド: `npm run build`
- ビルド出力ディレクトリ: `frontend/dist`
- ルートディレクトリ: `frontend`

環境変数:
- `VITE_API_BASE_URL`: バックエンドAPIのエンドポイントURL

### バックエンド (Cloudflare Workers)

バックエンドのデプロイはGitHub Actionsで自動化されています。`master`ブランチへのマージ時に自動的にデプロイされます。

## ライセンス

MIT Licenseの下でライセンスされています。詳細は[LICENSE](./LICENSE)をご覧ください。
