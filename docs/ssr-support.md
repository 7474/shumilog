# SSR対応機能

## 概要

OGPボット（Twitter、Facebook、Slackなど）がリンクをプレビューする際に、適切なメタデータを取得できるようにSSR（Server-Side Rendering）機能を実装しました。

## 主な機能

### 1. ボット検出

`backend/src/utils/botDetection.ts`に実装されたボット検出機能は、以下のUser-Agentを検出します：

- Twitterbot（Twitter）
- facebookexternalhit（Facebook）
- LinkedInBot（LinkedIn）
- Slackbot（Slack）
- Discordbot（Discord）
- その他主要なOGPクローラー

### 2. OGPメタタグ生成

`backend/src/utils/ssrTemplate.ts`に実装されたテンプレート生成機能は：

- Open GraphとTwitter Cardのメタタグを生成
- HTMLエスケープによるXSS対策
- 説明文の自動切り詰め（200文字まで）
- Markdownからプレーンテキストへの変換

### 3. SSRエンドポイント

`backend/src/routes/ssr.ts`に実装された以下のエンドポイント：

#### `/logs/:logId`
- ログのタイトル、内容の抜粋、画像をOGPメタタグとして出力
- 公開ログのみ対応
- 非公開ログや存在しないログはSPAにフォールバック

#### `/tags/:name`
- タグ名と説明をOGPメタタグとして出力
- タグ名はURL-encoded形式に対応

## 動作フロー

```
1. リクエスト受信
   ↓
2. User-Agent判定
   ├─ ボット → SSR処理
   └─ 通常ブラウザ → SPA (404またはフロントエンドへ)
   ↓
3. データ取得（LogService/TagService）
   ↓
4. OGP HTMLテンプレート生成
   ↓
5. HTML応答を返す
```

## デプロイメント設定

### 現在の構成

現在、バックエンドとフロントエンドは分離してデプロイされています：

- バックエンド: Cloudflare Workers（`api.shumilog.dev`）
- フロントエンド: Cloudflare Pages（`shumilog.dev`）

### SSRの有効化

SSR機能を有効にするには、以下のいずれかの方法を選択してください：

#### 方法1: Cloudflare Pages Functions（推奨）

フロントエンド（Cloudflare Pages）に`functions/_middleware.ts`を追加して、ボットリクエストをバックエンドのSSRエンドポイントにプロキシします：

```typescript
// frontend/functions/_middleware.ts
export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const userAgent = request.headers.get('User-Agent') || '';
  
  // ボットの場合、バックエンドのSSRエンドポイントにプロキシ
  const botPatterns = [
    /Twitterbot/i,
    /facebookexternalhit/i,
    /LinkedInBot/i,
    /Slackbot/i,
    /Discordbot/i,
  ];
  
  const isBot = botPatterns.some(pattern => pattern.test(userAgent));
  
  if (isBot && (url.pathname.startsWith('/logs/') || url.pathname.startsWith('/tags/'))) {
    // バックエンドのSSRエンドポイントを呼び出し
    const backendUrl = `https://api.shumilog.dev${url.pathname}`;
    return fetch(backendUrl, {
      headers: {
        'User-Agent': userAgent,
      },
    });
  }
  
  return next();
}
```

#### 方法2: _routes.json設定

Cloudflare Pagesの`_routes.json`を使用して、特定のパスをバックエンドにルーティング：

```json
{
  "version": 1,
  "include": ["/*"],
  "exclude": []
}
```

注: この方法では、ボット検出ロジックをフロントエンド側で実装する必要があります。

#### 方法3: 統合デプロイ（将来的な選択肢）

バックエンドとフロントエンドを単一のWorkerとして統合デプロイすることも可能です。

## テスト

全310個のテストが成功しています：

```bash
cd backend
npm test
```

主なテスト：

- `tests/utils/botDetection.test.ts`: ボット検出ロジック（8テスト）
- `tests/utils/ssrTemplate.test.ts`: テンプレート生成（13テスト）
- `tests/ssr.test.ts`: SSR統合シナリオ（7テスト）

## 開発時の確認

ローカルでSSRの動作を確認するには：

```bash
# バックエンドを起動
cd backend
npm run dev

# ボットとしてアクセス
curl -H "User-Agent: Twitterbot/1.0" http://localhost:8787/logs/test-log-id
curl -H "User-Agent: facebookexternalhit/1.1" http://localhost:8787/tags/TestTag
```

## セキュリティ

- HTMLエスケープによるXSS対策
- 公開ログのみSSR対応（非公開ログは404）
- 入力値の検証とサニタイゼーション

## パフォーマンス

- ボット検出は正規表現による高速判定
- データベースクエリは既存のサービス層を利用
- HTMLテンプレートは静的生成（キャッシュ可能）

## 今後の改善案

1. OGP画像の自動生成（タグやログのサムネイル）
2. キャッシュ戦略の最適化
3. より多くのボットパターンへの対応
4. リッチスニペット対応（JSON-LD）
5. トップページのSSR対応
