# 本番環境セットアップガイド

## 概要

このドキュメントは、Shumilogを本番環境（Cloudflare Platform）にデプロイするための設定方法を説明します。

## アーキテクチャ

```
┌─────────────────────────┐
│  https://shumilog.dev   │  ← フロントエンド (Cloudflare Pages)
└───────────┬─────────────┘
            │
            │ API呼び出し
            ↓
┌──────────────────────────────┐
│ https://api.shumilog.dev/api │  ← バックエンド (Cloudflare Workers)
└──────────────────────────────┘
```

**重要**: フロントエンドとバックエンドは異なるサブドメインに配置されているため、CORS設定が重要です。

## 本番環境の環境変数設定

### フロントエンド (Cloudflare Pages)

Cloudflare Pagesダッシュボードで以下の環境変数を設定してください：

#### 必須の環境変数

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `VITE_API_BASE_URL` | `https://api.shumilog.dev/api` | バックエンドAPIのエンドポイント |
| `VITE_FRONTEND_URL` | `https://shumilog.dev` | フロントエンドのURL（画像最適化用） |

#### 設定手順

1. Cloudflare Dashboardにログイン
2. Pages → shumilog → Settings → Environment variables
3. Production環境に上記の環境変数を追加
4. ビルドをトリガー（または次回のデプロイ時に自動適用）

### バックエンド (Cloudflare Workers)

バックエンドの環境変数は `backend/wrangler.toml` で管理されています：

```toml
[env.production.vars]
ENVIRONMENT = "production"
APP_BASE_URL = "https://shumilog.dev"
APP_LOGIN_URL = "https://shumilog.dev/login"
TWITTER_REDIRECT_URI = "https://api.shumilog.dev/api/auth/callback"
```

#### シークレット（Cloudflare Dashboard で設定）

以下のシークレットは `wrangler secret put` コマンドまたはCloudflare Dashboardで設定してください：

- `TWITTER_CLIENT_ID` - Twitter OAuth Client ID
- `TWITTER_CLIENT_SECRET` - Twitter OAuth Client Secret
- `DMM_API_ID` - DMM API ID（オプション）
- `DMM_AFFILIATE_ID` - DMM Affiliate ID（オプション）

## CORS設定

バックエンドのCORS設定は自動的に `APP_BASE_URL` を許可するように構成されています（`backend/src/index.ts`）。

```typescript
const allowedOrigins = new Set([
  'http://localhost:5173',      // ローカル開発
  'http://127.0.0.1:5173',      // ローカル開発
  'http://localhost:8787',      // ローカル開発
  runtimeConfig.appBaseUrl,     // 本番: https://shumilog.dev
]);
```

## セッション管理

セッションCookieは以下の設定で発行されます：

```typescript
{
  httpOnly: true,
  secure: true,
  sameSite: 'None',  // クロスサイトリクエストを許可
  path: '/',
  maxAge: 30 days
}
```

`sameSite: 'None'` は、フロントエンド（`shumilog.dev`）とバックエンド（`api.shumilog.dev`）が異なるサブドメインであるため必要です。

## トラブルシューティング

### 画像アップロードが失敗する

**症状**: ログは作成されるが、画像のアップロードに失敗する

**原因の可能性**:

1. **環境変数が未設定**
   - Cloudflare Pagesで `VITE_API_BASE_URL` が設定されているか確認
   - 値が `https://api.shumilog.dev/api` になっているか確認

2. **CORS エラー**
   - バックエンドの `APP_BASE_URL` が `https://shumilog.dev` に設定されているか確認
   - ブラウザの開発者ツールでCORSエラーがないか確認

3. **セッション Cookie が送信されない**
   - ブラウザの開発者ツール → Network → 画像アップロードリクエスト → Headers で `Cookie` ヘッダーが含まれているか確認
   - `SameSite=None; Secure` が設定されているか確認

4. **R2バケットの権限不足**
   - Cloudflare R2バケット（`shumilog-images`）が存在するか確認
   - Workerがバケットにアクセスできるか確認

### デバッグ手順

1. **ブラウザの開発者ツールを開く**
   ```
   F12 → Network タブ
   ```

2. **ログを作成し、画像をアップロード**

3. **失敗したリクエストを確認**
   - Status Code: 401 → 認証エラー（セッションCookieの問題）
   - Status Code: 403 → 権限エラー（R2バケットまたはログ所有権の問題）
   - Status Code: 500 → サーバーエラー（バックエンドログを確認）
   - Status Code: 0 or (failed) → CORS エラー

4. **Console タブでエラーメッセージを確認**

## 本番環境へのデプロイ

### 自動デプロイ

`master` ブランチへのマージで自動的にデプロイされます：

1. **フロントエンド**: Cloudflare Pages が自動的にビルド・デプロイ
2. **バックエンド**: GitHub Actions が D1 マイグレーションを実行

### 手動デプロイ

必要に応じて手動でデプロイできます：

```bash
# バックエンドのデプロイ
cd backend
wrangler deploy --env production

# マイグレーションの実行
wrangler d1 migrations apply shumilog-db --env production --remote
```

## 参考リンク

- [Cloudflare Pages Dashboard](https://dash.cloudflare.com/)
- [Cloudflare Workers Dashboard](https://dash.cloudflare.com/)
- [GitHub Actions](https://github.com/7474/shumilog/actions)
- [システムアーキテクチャ](./architecture.md)
