# Cloudflare Pages デプロイメントガイド（SSR対応）

このガイドでは、SSR機能を含むフロントエンドをCloudflare Pagesにデプロイする手順を説明します。

## 前提条件

- Cloudflareアカウント
- GitHubリポジトリへのアクセス権
- バックエンドがCloudflare Workersにデプロイ済み（例: `https://api.shumilog.dev`）

## デプロイ手順

### 1. Cloudflare Pagesプロジェクトの作成

1. [Cloudflare Dashboard](https://dash.cloudflare.com/)にログイン
2. 左サイドバーから **Workers & Pages** を選択
3. **Create application** ボタンをクリック
4. **Pages** タブを選択
5. **Connect to Git** をクリック

### 2. GitHubリポジトリの接続

1. **GitHub** を選択
2. リポジトリ一覧から `7474/shumilog` を選択
3. **Begin setup** をクリック

### 3. ビルド設定

以下の設定を入力します：

#### プロジェクト名
```
shumilog
```
または任意の名前

#### プロダクションブランチ
```
master
```

#### ビルド設定

- **Framework preset**: `None` または `Vite`
- **Build command**: 
  ```bash
  cd frontend && npm install && npm run build
  ```
- **Build output directory**: 
  ```
  frontend/dist
  ```
- **Root directory**: 
  ```
  /
  ```
  （リポジトリルートを指定）

#### 環境変数（オプション）

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `API_BASE_URL` | `https://api.shumilog.dev` | バックエンドAPIのURL（デフォルト値があるため省略可能） |
| `NODE_VERSION` | `22` | Node.jsのバージョン（推奨） |

### 4. デプロイの実行

1. **Save and Deploy** をクリック
2. 初回ビルドが開始されます（数分かかります）
3. ビルドログを確認して、エラーがないことを確認

### 5. カスタムドメインの設定（オプション）

1. デプロイ完了後、プロジェクトの **Settings** > **Custom domains** を開く
2. **Set up a custom domain** をクリック
3. `shumilog.dev` などのドメインを入力
4. DNSレコードを設定（Cloudflare DNS使用時は自動）

## SSR機能の確認

デプロイ後、以下の方法でSSRが正しく動作しているか確認できます：

### 1. ブラウザでの確認

通常のブラウザでアクセスすると、SPAとして動作します：
```
https://shumilog.dev/logs/log_alice_1
```

### 2. OGPボットとしての確認

curlコマンドでボットとしてアクセスし、OGPメタタグが含まれることを確認：

```bash
# Twitterボットとして確認
curl -H "User-Agent: Twitterbot/1.0" https://shumilog.dev/logs/log_alice_1 | grep "og:title"

# Facebookボットとして確認
curl -H "User-Agent: facebookexternalhit/1.1" https://shumilog.dev/tags/Anime | grep "og:description"
```

期待される出力：
```html
<meta property="og:title" content="進撃の巨人 最終話を見た" />
<meta property="og:description" content="進撃の巨人 最終話の感想..." />
```

### 3. SNSでの確認

実際のSNSでリンクをシェアして、プレビューが表示されることを確認：

- **Twitter**: https://cards-dev.twitter.com/validator
- **Facebook**: https://developers.facebook.com/tools/debug/
- **LinkedIn**: https://www.linkedin.com/post-inspector/

## トラブルシューティング

### ビルドエラー: `npm install` failed

**原因**: Node.jsバージョンの不一致

**解決方法**:
1. Environment variables に `NODE_VERSION=22` を追加
2. Retry deployment

### SSRが動作しない（ボットにもSPAが返される）

**原因**: Pages Functionsが正しくビルドされていない

**解決方法**:
1. `frontend/functions/_middleware.ts` が正しく配置されているか確認
2. ビルドログで "Functions" のセクションを確認
3. Pages Functions のログを確認（Dashboard > Functions > Logs）

### API接続エラー

**原因**: バックエンドAPIのURLが正しくない

**解決方法**:
1. 環境変数 `API_BASE_URL` を確認
2. バックエンドがデプロイされているか確認
3. CORSの設定を確認（バックエンド側）

### 404エラー（ページが見つからない）

**原因**: SPAのルーティングが正しく設定されていない

**解決方法**:
1. `frontend/dist/index.html` が正しく生成されているか確認
2. Build output directory が `frontend/dist` になっているか確認
3. Cloudflare Pages の _routes.json が自動生成されているか確認

## Pages Functionsの仕組み

デプロイされたPages Functionsは以下のように動作します：

```
リクエスト
  ↓
Pages Functions (_middleware.ts)
  ↓
User-Agent判定
  ├─ OGPボット → SSR処理
  │              ↓
  │         Backend APIからデータ取得
  │              ↓
  │         HTML生成（OGPメタタグ付き）
  │              ↓
  │         HTMLレスポンス
  │
  └─ 通常ブラウザ → SPA
                    ↓
                   index.html（React アプリ）
```

## 本番環境の監視

### Pages Functions のログ確認

1. Cloudflare Dashboard > Workers & Pages
2. プロジェクト（shumilog）を選択
3. **Functions** タブ > **Logs** を確認

SSRのログ出力：
```
[SSR] Bot detected: Twitterbot/1.0, generating SSR for: /logs/log_alice_1
```

### アクセス解析

Cloudflare Web Analyticsを有効にすると：
- ページビュー数
- ボットのアクセス状況
- パフォーマンスメトリクス

が確認できます。

## 再デプロイ

コードを更新した場合：

1. GitHubにプッシュ（`master`ブランチ）
2. Cloudflare Pagesが自動的に検出して再デプロイ
3. 数分後に新しいバージョンがデプロイされる

手動で再デプロイする場合：
1. Cloudflare Dashboard > プロジェクト > **Deployments**
2. **Retry deployment** または **Create deployment**

## プレビューデプロイメント

プルリクエストを作成すると、Cloudflare Pagesが自動的にプレビュー環境を作成します：

1. プルリクエストを作成
2. Cloudflare Pagesがコメントを投稿（プレビューURL付き）
3. プレビューURLでSSRの動作を確認
4. 問題なければマージ

## セキュリティ設定

### 環境変数の管理

本番環境とプレビュー環境で異なる設定が可能：

1. Settings > Environment variables
2. **Production** と **Preview** で別々に設定
3. 機密情報（APIキーなど）は Environment variables に保存

### アクセス制限（オプション）

開発中のプレビューへのアクセスを制限：

1. Settings > Access
2. **Enable Access** をオン
3. 許可するメールアドレスを追加

## パフォーマンス最適化

### キャッシュ設定

SSR HTMLは300秒キャッシュされます（`_middleware.ts`で設定済み）：

```typescript
'Cache-Control': 'public, max-age=300, s-maxage=300'
```

必要に応じて調整可能です。

### 静的アセットのキャッシュ

Cloudflare Pagesは自動的に静的アセット（JS, CSS, 画像）をキャッシュします。

## まとめ

このガイドに従うことで、SSR機能を含むフロントエンドをCloudflare Pagesにデプロイできます。

**重要なポイント**:
- ✅ `frontend/functions/_middleware.ts` がPages Functionsとして動作
- ✅ ボット検出とSSRはエッジで実行（高速）
- ✅ バックエンドAPIは公開されない（Pages Functionsからのみアクセス）
- ✅ 通常のブラウザはSPAとして動作

**参考リンク**:
- [Cloudflare Pages ドキュメント](https://developers.cloudflare.com/pages/)
- [Pages Functions ドキュメント](https://developers.cloudflare.com/pages/functions/)
- [プロジェクトREADME](../README.md)
- [SSR機能詳細](./ssr-support.md)
