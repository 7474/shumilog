# フロントエンドデプロイメントガイド

## 本番環境への配置

フロントエンドはCloudflare Pagesにデプロイされます。正しく動作させるために、ビルド時に環境変数を設定する必要があります。

### 必要な環境変数

#### `VITE_API_BASE_URL`

APIリクエストの送信先となるバックエンドのベースURLを指定します。

**設定例:**
- 本番環境: `https://api.shumilog.dev/api`
- 開発環境: `https://api.shumilog.dev/api` (development環境のWorker)

### Cloudflare Pagesでの設定方法

1. Cloudflare Pagesダッシュボードにアクセス
2. プロジェクト (shumilog-frontend) を選択
3. **Settings** > **Environment variables** に移動
4. 以下の環境変数を追加:

   | 変数名 | 値 | 環境 |
   |--------|-----|------|
   | `VITE_API_BASE_URL` | `https://api.shumilog.dev/api` | Production |
   | `VITE_API_BASE_URL` | `https://api.shumilog.dev/api` | Preview (optional) |

5. 保存後、次回のデプロイから新しい環境変数が適用されます

### ビルドコマンド

Cloudflare Pagesのビルド設定:

```
# Build command
npm run build

# Build output directory
dist

# Root directory
frontend
```

### ローカル開発

ローカル開発では、`frontend/.env`ファイルで環境変数を設定します:

```bash
# frontend/.env
VITE_API_BASE_URL=http://localhost:8787/api
```

開発サーバーはViteのプロキシ機能により、`/api/*`へのリクエストを自動的にローカルのWorkerにプロキシします。

## トラブルシューティング

### 405 Method Not Allowedエラー

画像アップロードなど、特定のAPIエンドポイントで405エラーが発生する場合:

**原因:** `VITE_API_BASE_URL`が設定されていないか、不正な値が設定されている

**解決方法:**
1. Cloudflare Pagesの環境変数を確認
2. `VITE_API_BASE_URL`が正しいバックエンドURL (`https://api.shumilog.dev/api`)に設定されていることを確認
3. 再デプロイして変更を適用

### CORSエラー

APIリクエストでCORSエラーが発生する場合:

**原因:** バックエンドのCORS設定がフロントエンドのオリジンを許可していない

**解決方法:**
1. `backend/wrangler.toml`の`APP_BASE_URL`環境変数を確認
2. バックエンドの`src/index.ts`のCORS設定で、フロントエンドのオリジンが許可されていることを確認
3. バックエンドを再デプロイ

## 関連リンク

- [Vite環境変数ドキュメント](https://vitejs.dev/guide/env-and-mode.html)
- [Cloudflare Pages環境変数](https://developers.cloudflare.com/pages/configuration/build-configuration/#environment-variables)
