# SSR対応機能

## 概要

OGPボット（Twitter、Facebook、Slackなど）がリンクをプレビューする際に、適切なメタデータを取得できるようにSSR（Server-Side Rendering）機能をCloudflare Pages Functions上で実装しました。

## 主な機能

### 1. ボット検出

Cloudflare Pages Functionsのミドルウェアで以下のUser-Agentを検出します：

- Twitterbot（Twitter）
- facebookexternalhit（Facebook）
- LinkedInBot（LinkedIn）
- Slackbot（Slack）
- Discordbot（Discord）
- その他主要なOGPクローラー

### 2. OGPメタタグ生成

`frontend/functions/_middleware.ts`に実装されたSSR機能は：

- Open GraphとTwitter Cardのメタタグを生成
- HTMLエスケープによるXSS対策
- 説明文の自動切り詰め（200文字まで）
- Markdownからプレーンテキストへの変換

### 3. SSR処理

Pages Functions上で以下の処理を実行：

#### `/logs/:logId`
- バックエンドAPIからログデータを取得
- ログのタイトル、内容の抜粋、画像をOGPメタタグとして出力
- 公開ログのみ対応
- 非公開ログや存在しないログはSPAにフォールバック

#### `/tags/:name`
- バックエンドAPIからタグデータを取得
- タグ名と説明をOGPメタタグとして出力
- タグ名はURL-encoded形式に対応

## 動作フロー

```
1. リクエスト受信（Cloudflare Pages）
   ↓
2. User-Agent判定（Pages Functions）
   ├─ ボット → SSR処理
   └─ 通常ブラウザ → SPA
   ↓
3. バックエンドAPIからデータ取得
   ↓
4. Pages Functions上でOGP HTMLを生成
   ↓
5. HTML応答を返す
   ↓
6. ボットがメタデータを解析
   ↓
7. リンクプレビューが表示される
```

通常のブラウザの場合:
```
1. ユーザーがブラウザでアクセス
   ↓
2. Pages Functions で通常ブラウザと判定
   ↓
3. 既存のSPAを提供
   ↓
4. React アプリケーションが動作
```

## アーキテクチャの特徴

### エッジでのSSR実行

- **セキュリティ**: バックエンドURLがユーザーに露出しない
- **パフォーマンス**: Cloudflare Edgeネットワーク上で実行されるため高速
- **スケーラビリティ**: Pages Functionsの自動スケーリング
- **シンプル**: バックエンドに専用SSRエンドポイントが不要

### データフロー

```
OGPボット → Pages Functions → Backend API → Pages Functions → HTML応答
                    ↓                ↓
               SSR実行        データ取得のみ
```

## デプロイメント設定

### 現在の構成

- バックエンド: Cloudflare Workers（`api.shumilog.dev`） - データAPIのみ提供
- フロントエンド: Cloudflare Pages（`shumilog.dev`） - SPA配信とSSR実行

### 環境変数

Cloudflare Pagesで以下の環境変数を設定：

- `API_BASE_URL`: バックエンドAPIのURL（例: `https://api.shumilog.dev`）
  - デフォルト: `https://api.shumilog.dev`
  - 開発環境では `http://localhost:8787` を設定可能

## テスト

ユーティリティ関数のテストは引き続きバックエンドで実施：

```bash
cd backend
npm test -- tests/utils/
```

主なテスト：

- `tests/utils/botDetection.test.ts`: ボット検出ロジック（8テスト）
- `tests/utils/ssrTemplate.test.ts`: テンプレート生成（13テスト）

## 開発時の確認

ローカルでSSRの動作を確認するには：

```bash
# バックエンドを起動
cd backend
npm run dev

# フロントエンドをビルド＆プレビュー（Pages Functionsを含む）
cd frontend
npm run build
npx wrangler pages dev dist

# ボットとしてアクセス
curl -H "User-Agent: Twitterbot/1.0" http://localhost:8788/logs/log_alice_1
curl -H "User-Agent: facebookexternalhit/1.1" http://localhost:8788/tags/TestTag
```

## セキュリティ

- HTMLエスケープによるXSS対策
- 公開ログのみSSR対応（非公開ログは404）
- バックエンドAPIへのアクセスはPages Functionsからのみ
- APIレート制限は既存のバックエンドミドルウェアで対応

## パフォーマンス

- ボット検出: 正規表現による高速判定（O(1)）
- SSR生成: Cloudflare Edgeで実行（低レイテンシー）
- データ取得: バックエンドAPI経由（キャッシュ対応）
- HTMLキャッシュ: 300秒のCDNキャッシュ

## 今後の改善案

1. OGP画像の自動生成（タグやログのサムネイル）
2. より多くのボットパターンへの対応
3. リッチスニペット対応（JSON-LD）
4. トップページのSSR対応
5. Pages Functionsでのキャッシュ戦略最適化
