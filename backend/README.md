# Shumilog Backend

ShumilogのバックエンドAPIサーバーです。Cloudflare Workers上で動作するサーバーレスAPIを提供します。

## 概要

このバックエンドは、趣味コンテンツのログ記録と共有のためのRESTful APIを提供します。Twitter認証、ログ管理、タグ管理、画像アップロードなどの機能を備えています。

## 技術スタック

- **ランタイム**: Cloudflare Workers (Node.js互換)
- **フレームワーク**: Hono v4
- **ORM**: Drizzle ORM
- **データベース**: Cloudflare D1 (SQLite)
- **ストレージ**: Cloudflare R2 (画像ファイル)
- **AI**: Cloudflare Workers AI (タグ支援機能)
- **言語**: TypeScript 5.9+
- **テスト**: Vitest
- **コード品質**: ESLint + Prettier

## 主な機能

### 認証・認可
- Twitter OAuth 2.0認証
- セッションベースの認可
- ユーザー管理

### ログ管理
- ログの作成・編集・削除
- 公開/非公開設定
- Markdownコンテンツ対応
- タグ付け機能
- 関連ログ検索

### タグ管理
- タグの作成・編集・削除
- AI支援によるタグ説明生成 (Wikipedia連携)
- タグ関連付け管理
- タグ統計
- 最近の参照タグ表示

### 画像管理
- 画像アップロード・管理
- Cloudflare R2ストレージ連携
- ログへの画像添付

## 開発環境セットアップ

### 前提条件

- Node.js 22 LTS以上
- npm 10以上
- Wrangler CLI (`npm install -g wrangler`)

### インストール

```bash
cd backend
npm install
```

### データベース準備

```bash
# マイグレーション実行
npm run db:migrate

# シードデータ投入
npm run db:seed
```

### Drizzle ORM

このプロジェクトではDrizzle ORMを使用してデータベース操作を行っています：

- **スキーマ定義**: `src/db/schema.ts`
- **マイグレーション**: `migrations/` ディレクトリ
- **クエリビルダー**: 型安全なSQLクエリ生成

### 開発サーバー起動

```bash
npm run dev
```

サーバーが `http://localhost:8787` で起動します。

## テスト実行

### 全テスト実行

```bash
npm test
```

### 契約テスト実行

```bash
npm run test:contract
```

### ウォッチモード

```bash
npm run test:watch
```

## API仕様

API仕様は `/api/v1/openapi.yaml` で定義されています。

### 主なエンドポイント

- `GET /auth/twitter` - Twitter認証開始
- `GET /auth/callback` - OAuthコールバック処理
- `GET /users/me` - ユーザー情報取得
- `GET /logs` - ログ一覧取得
- `POST /logs` - ログ作成
- `GET /logs/{id}` - ログ詳細取得
- `GET /tags` - タグ一覧取得
- `POST /tags` - タグ作成
- `POST /support/tags` - AI支援タグ生成

詳細なAPI仕様は [OpenAPIドキュメント](../../api/v1/openapi.yaml) を参照してください。

## 環境設定

### 環境変数

開発環境では `wrangler.toml` で設定されます：

```toml
[vars]
ENVIRONMENT = "development"
APP_BASE_URL = "http://localhost:5173"
APP_LOGIN_URL = "http://localhost:5173/login"
TWITTER_REDIRECT_URI = "http://localhost:8787/api/auth/callback"
```

### バインディング

- **DB**: Cloudflare D1データベース
- **AI**: Cloudflare Workers AI
- **IMAGES**: Cloudflare R2バケット

## 開発ワークフロー

### 機能開発の流れ

1. **仕様更新**: `/api/v1/openapi.yaml` を更新
2. **実装**: APIエンドポイントを実装
3. **テスト**: 契約テストを追加/更新
4. **検証**: `npm run test:contract` で仕様準拠を確認
5. **デプロイ**: 本番環境にデプロイ

### コード品質

```bash
# 型チェック
npm run typecheck

# リント
npm run lint

# フォーマット
npm run format
```

## テストカバレッジ

- **契約テスト**: OpenAPI仕様との準拠検証
- **ユニットテスト**: 個別機能のテスト
- **統合テスト**: エンドポイント間の連携テスト

## トラブルシューティング

### よくある問題

#### データベース接続エラー
```bash
# D1データベースのリセット
npm run db:migrate
npm run db:seed
```

#### Drizzle ORM関連の問題
```bash
# スキーマの型生成（必要な場合）
npx drizzle-kit generate

# マイグレーションの作成（スキーマ変更時）
npx drizzle-kit migrate
```

#### AI機能が動作しない
AI機能はCloudflare環境でのみ動作します。ローカル開発ではモックレスポンスが返されます。

#### 画像アップロードが失敗する
R2バケットが設定されているか確認してください。
