# 画像アップロード405エラー修正の概要

## 問題の原因

フロントエンドの`LogForm.tsx`で画像アップロード時に、相対URL (`/api/logs/${logId}/images`) を使用していました。

```typescript
// 修正前のコード
const response = await fetch(`/api/logs/${logId}/images`, {
  method: 'POST',
  body: formData,
  credentials: 'include',
});
```

### なぜ405エラーが発生したのか？

1. **開発環境**: Viteのプロキシ機能により、`/api/*`へのリクエストは`http://localhost:8787`にプロキシされるため問題なし
2. **本番環境**: 
   - フロントエンド: `https://shumilog.dev` (Cloudflare Pages)
   - バックエンド: `https://api.shumilog.dev` (Cloudflare Workers)
   - 相対URLを使用すると、リクエストは`https://shumilog.dev/api/...`に送信される
   - Cloudflare Pagesはこのエンドポイントを認識せず、**405 Method Not Allowed**を返す

## 修正内容

`VITE_API_BASE_URL`環境変数を使用して、正しいバックエンドURLにリクエストを送信するように修正しました。

```typescript
// 修正後のコード
const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

const response = await fetch(`${baseUrl}/logs/${logId}/images`, {
  method: 'POST',
  body: formData,
  credentials: 'include',
});
```

## 本番環境への適用手順

**重要**: この修正を本番環境に適用するには、以下の手順が必要です。

### 1. Cloudflare Pagesの環境変数を設定

1. Cloudflare Pagesダッシュボードにアクセス
2. プロジェクト (shumilog-frontend) を選択
3. **Settings** > **Environment variables** に移動
4. 以下の環境変数を追加:

   | 変数名 | 値 | 環境 |
   |--------|-----|------|
   | `VITE_API_BASE_URL` | `https://api.shumilog.dev/api` | Production |

5. 保存

### 2. フロントエンドを再ビルド・再デプロイ

環境変数はビルド時に静的にバンドルされるため、再ビルドが必要です:

- Cloudflare Pagesダッシュボードで **Deployments** > **View build**
- 右上の **Retry deployment** をクリックして再デプロイ
- または、`master`ブランチに新しいコミットをプッシュして自動デプロイ

### 3. 動作確認

1. ブラウザで https://shumilog.dev にアクセス
2. ログインして新しいログを作成
3. 画像をアップロード
4. 開発者ツールのネットワークタブで以下を確認:
   - リクエストURL: `https://api.shumilog.dev/api/logs/{logId}/images`
   - ステータスコード: `201 Created` (成功) または `500` (R2設定エラー、405以外)

## トラブルシューティング

### 再デプロイ後も405エラーが続く場合

1. Cloudflare Pagesの環境変数が正しく設定されているか確認
2. ビルドログを確認し、環境変数が認識されているか確認
3. ブラウザのキャッシュをクリア (Ctrl+Shift+R / Cmd+Shift+R)

### CORSエラーが発生する場合

バックエンドのCORS設定を確認してください。`backend/src/index.ts`で、フロントエンドのオリジン (`https://shumilog.dev`) が許可されている必要があります。

```typescript
const allowedOrigins = new Set([
  // ...
  'https://shumilog.dev', // これが含まれていることを確認
]);
```

## 参考ドキュメント

- [フロントエンドデプロイメントガイド](./frontend-deployment.md)
- [Vite環境変数](https://vitejs.dev/guide/env-and-mode.html)
- [Cloudflare Pages環境変数](https://developers.cloudflare.com/pages/configuration/build-configuration/#environment-variables)
