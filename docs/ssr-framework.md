# SSRフレームワーク アーキテクチャ

## 概要

shumilogは、**Cloudflare Pages Functions**を「SSRフレームワーク」として採用しています。これは軽量・シンプル・オープンなアプローチで、従来のSSRフレームワーク（Next.js、Remix、Astroなど）の代わりに、Cloudflareネイティブの機能を活用しています。

## なぜCloudflare Pages Functionsなのか

### 要件との完全な適合

**プロジェクト要件:**
- ✅ Cloudflare Pagesで動作すること
- ✅ 軽量であること
- ✅ シンプルであること
- ✅ オープンであること

**Cloudflare Pages Functionsの利点:**
- ✅ **Cloudflareネイティブ** - 追加設定不要で完全動作
- ✅ **ゼロ依存** - フレームワーク追加不要、バンドルサイズ最小
- ✅ **標準Web API** - Request/Response、Fetch API等を使用
- ✅ **オープンソース** - Cloudflareのオープンソースプロジェクト
- ✅ **エッジ実行** - 世界中のCloudflareエッジネットワークで高速実行
- ✅ **自動スケーリング** - トラフィック増加時も対応

### 他のSSRフレームワークとの比較

| フレームワーク | Cloudflare Pages対応 | バンドルサイズ | 複雑性 | 学習コスト |
|--------------|---------------------|---------------|--------|-----------|
| **Pages Functions** | ✅ ネイティブ | 最小 (0KB) | 低 | 低 |
| Next.js | ⚠️ Adapter必要 | 大 (500KB+) | 高 | 高 |
| Remix | ⚠️ Adapter必要 | 中 (200KB+) | 中 | 中 |
| Astro | ⚠️ Adapter必要 | 中 (100KB+) | 中 | 中 |
| SvelteKit | ⚠️ Adapter必要 | 中 (150KB+) | 中 | 中 |

## アーキテクチャ

### コンポーネント構成

```
┌─────────────────────────────────────────────────────────┐
│                   Cloudflare Pages                      │
│                                                         │
│  ┌────────────────────────────────────────────────┐   │
│  │  Static Assets (SPA)                           │   │
│  │  - React 19 Application                        │   │
│  │  - Bundled JavaScript                          │   │
│  │  - CSS & Assets                                │   │
│  └────────────────────────────────────────────────┘   │
│                                                         │
│  ┌────────────────────────────────────────────────┐   │
│  │  Pages Functions (SSR Framework)               │   │
│  │  - frontend/functions/_middleware.ts           │   │
│  │    ├─ Bot Detection                            │   │
│  │    ├─ SSR Logic                                │   │
│  │    ├─ OGP Generation                           │   │
│  │    └─ API Integration                          │   │
│  └────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
                          ↓
                    (データ取得)
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Cloudflare Workers (Backend)               │
│              - REST API                                 │
│              - D1 Database                              │
│              - R2 Storage                               │
└─────────────────────────────────────────────────────────┘
```

### リクエストフロー

#### 通常のブラウザアクセス

```
ユーザー
  ↓
Cloudflare Pages
  ↓
_middleware.ts (パス判定)
  ↓ (詳細ページの場合)
SSR処理開始
  ↓
Backend APIにデータリクエスト
  ↓
OGP HTMLを生成
  ↓
完成したHTMLをユーザーに返却
  ↓
ブラウザでJavaScriptが実行され、SPAとして動作
```

#### OGPボット（SSR）

```
OGPボット (Twitter, Facebook, etc)
  ↓
Cloudflare Pages
  ↓
_middleware.ts (パス判定)
  ↓ (詳細ページの場合)
SSR処理開始
  ↓
Backend APIにデータリクエスト
  ↓
OGP HTMLを生成
  ↓
完成したHTMLをボットに返却
```

**注:** ログ詳細ページとタグ詳細ページは、ボットかどうかに関わらず全てのアクセスに対してSSRを実行します。

## 実装詳細

### ミドルウェア構造

`frontend/functions/_middleware.ts`は以下の責務を持ちます：

1. **リクエストインターセプト** - すべてのリクエストを受信
2. **パスルーティング** - パスに応じたSSRハンドラー選択
3. **SSR実行** - ログ・タグ詳細ページのOGP HTML動的生成
4. **フォールバック** - SSR失敗時またはその他のページはSPAへ

### SSRハンドラー

各ページタイプに対応するSSRハンドラー：

#### ログ詳細ページ (`/logs/:logId`)

```typescript
async function handleLogSSR(logId: string, baseUrl: string, apiBaseUrl: string)
```

**処理内容:**
- バックエンドAPIからログデータ取得
- タイトル、説明文、画像を抽出
- OGPメタタグを生成
- HTML応答を返却

**OGP画像最適化:**
- 関連画像がある場合、先頭画像を使用
- Cloudflare Image Resizingで1200x630に最適化
- 品質85、自動フォーマット選択

#### タグ詳細ページ (`/tags/:tagName`)

```typescript
async function handleTagSSR(tagName: string, baseUrl: string, apiBaseUrl: string)
```

**処理内容:**
- バックエンドAPIからタグデータ取得
- タグ名と説明を抽出
- OGPメタタグを生成
- HTML応答を返却

### ボット検出

**注:** 現在は使用されていませんが、将来的に特定のボットに対して異なる動作を実装する可能性があるため、ボット検出コードは保持されています。

以下のUser-Agentパターンを検出可能：

- Twitterbot (Twitter/X)
- facebookexternalhit (Facebook)
- LinkedInBot (LinkedIn)
- Slackbot (Slack)
- Discordbot (Discord)
- WhatsApp
- TelegramBot
- Pinterestbot
- redditbot
- SkypeUriPreview
- vkShare
- W3C_Validator
- Googlebot
- bingbot
- Baiduspider

### セキュリティ対策

1. **XSS防止** - すべての動的コンテンツをHTMLエスケープ
2. **公開データのみ** - 非公開ログはSSR対象外（404）
3. **バックエンド保護** - APIへのアクセスはPages Functionsからのみ
4. **レート制限** - バックエンドの既存ミドルウェアで対応

## パフォーマンス最適化

### エッジでの実行

- **低レイテンシー** - ユーザーに最も近いエッジで実行
- **並列処理** - Isolatesによる効率的な処理
- **自動スケール** - トラフィック急増にも対応

### キャッシュ戦略

```typescript
headers: {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=300, s-maxage=300',
}
```

- **ブラウザキャッシュ**: 5分間（max-age=300）
- **CDNキャッシュ**: 5分間（s-maxage=300）
- **再検証**: キャッシュ期限後に自動更新

### 画像最適化

Cloudflare Image Resizingを活用：

```
元の画像URL → /cdn-cgi/image/width=1200,height=630,fit=cover,quality=85,format=auto/{url}
```

**利点:**
- OGP推奨サイズ（1200x630）に自動変換
- WebP等の最適フォーマットを自動選択
- 品質とサイズのバランス調整
- エッジキャッシュで高速配信

## 開発ワークフロー

### ローカル開発

```bash
# 1. バックエンドを起動
cd backend
npm run dev

# 2. フロントエンドをビルド
cd frontend
npm run build

# 3. Pages Functionsをローカル実行
npx wrangler pages dev dist

# 4. 詳細ページとしてテスト（通常のブラウザまたはボット）
curl http://localhost:8788/logs/log_alice_1
```

### デプロイ

Cloudflare Pagesに自動デプロイ：

```bash
git push origin master
```

**ビルドプロセス:**
1. `npm run build` でReactアプリをビルド → `dist/` ディレクトリに出力
2. `frontend/functions/_middleware.ts` がCloudflare Pagesにより自動検出される
3. Pages Functionsとして自動デプロイ（dist/にコピー不要）

**重要**: `functions` ディレクトリは `dist/` にコピーされません。Cloudflare Pagesは、ビルド出力ディレクトリ（`frontend/dist`）と同じレベルの `frontend/functions` ディレクトリを自動的に検出してPages Functionsとしてデプロイします。

### 環境変数

Cloudflare Pages Dashboardで設定：

- `API_BASE_URL`: バックエンドAPIのベースURL
  - 本番: `https://api.shumilog.dev`
  - 開発: `http://localhost:8787`

## テスト戦略

### ユニットテスト

現在は実装されていませんが、以下のテストを追加可能：

```typescript
// ボット検出のテスト
test('isOgpBot detects Twitter bot', () => {
  expect(isOgpBot('Twitterbot/1.0')).toBe(true);
});

// HTMLエスケープのテスト
test('escapeHtml prevents XSS', () => {
  expect(escapeHtml('<script>alert("XSS")</script>'))
    .toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
});
```

### 統合テスト

```bash
# バックエンドAPIテスト
cd backend
npm test

# フロントエンドビルド検証
cd frontend
npm run build
```

### E2Eテスト

```bash
# 詳細ページのSSRをテスト（通常のUser-Agent）
curl https://shumilog.dev/logs/log_alice_1

# ボットとしてもテスト可能
curl -H "User-Agent: Twitterbot/1.0" https://shumilog.dev/logs/log_alice_1

# レスポンスにOGPメタタグが含まれることを確認
curl https://shumilog.dev/tags/Anime | grep 'og:title'
```

## 拡張性

### 新しいページタイプの追加

1. `_middleware.ts`に新しいパスマッチングを追加
2. 対応するSSRハンドラー関数を実装
3. OGPメタタグ生成ロジックを追加

例：

```typescript
// ユーザープロフィールページのSSR
const userMatch = url.pathname.match(/^\/users\/([^/]+)$/);
if (userMatch) {
  const userId = userMatch[1];
  const ssrResponse = await handleUserSSR(userId, baseUrl, apiBaseUrl);
  if (ssrResponse) {
    return ssrResponse;
  }
}
```

### 新しいボットパターンの追加

`BOT_PATTERNS`配列に正規表現を追加：

```typescript
const BOT_PATTERNS = [
  // 既存のパターン...
  /NewBot/i,  // 新しいボット
];
```

## CSRでのOGPメタデータ

### 概要

SSR対応のOGPボット向けのメタデータに加えて、通常のブラウザ（CSR）でも同じOGP情報を動的に設定しています。これにより、CSR対応のボットや、ブラウザ拡張機能、ブックマークツールなどがページのメタデータを正しく取得できます。

### 実装方法

**カスタムフック: `useOgp`**

`frontend/src/hooks/useOgp.ts`で提供されるカスタムフックを使用して、ページごとにOGPメタデータを動的に設定します。

```typescript
import { useOgp, extractPlainText } from '@/hooks/useOgp';

// ログ詳細ページでの使用例
useOgp({
  title: log.title || 'ログ',
  description: extractPlainText(log.content_md || '', 200),
  url: window.location.href,
  image: log.images?.[0]?.url,
  type: 'article',
});
```

**実装の特徴:**
- ネイティブDOM APIを使用（React 19対応）
- SSRと同じメタタグ構成
- `useEffect`による自動更新
- HTMLエスケープ不要（属性設定時に自動処理）

### 適用ページ

現在、以下のページでOGPメタデータを設定しています：

1. **ログ詳細ページ** (`/logs/:id`)
   - タイトル: ログのタイトル
   - 説明文: コンテンツから抽出（最大200文字）
   - 画像: 関連画像の先頭（存在する場合）
   - タイプ: `article`

2. **タグ詳細ページ** (`/tags/:name`)
   - タイトル: タグ名（`#tagname`形式）
   - 説明文: タグの説明または既定文（最大200文字）
   - タイプ: `website`

### SSRとの一貫性

CSRで設定するメタデータは、SSRで生成される内容と完全に一致しています：

| 項目 | SSR | CSR |
|------|-----|-----|
| タイトル形式 | `{title} - Shumilog` | `{title} - Shumilog` |
| 説明文長さ | 最大200文字 | 最大200文字 |
| OGPタグ | og:*, twitter:* | og:*, twitter:* |
| 画像最適化 | Cloudflare Image Resizing | （同じURL） |

### テスト

`frontend/tests/unit/useOgp.test.ts`でユニットテストを実装しています：

- 基本的なOGPメタタグの設定
- 画像付きメタタグの設定
- 長い説明文の切り詰め
- メタタグの動的更新
- Markdownからのテキスト抽出

## トラブルシューティング

### SSRが動作しない

**確認項目:**
1. `frontend/functions/_middleware.ts`が正しく配置されているか
2. ビルドログで "Functions" セクションが表示されているか
3. Pages Functions のログを確認（Dashboard > Functions > Logs）
4. 環境変数 `API_BASE_URL` が正しく設定されているか

### OGPプレビューが表示されない

**確認項目:**
1. バックエンドAPIが正常に応答しているか
2. OGPメタタグが正しく生成されているか
3. 画像URLが有効か

**デバッグ方法:**
```bash
# レスポンスのHTMLを確認（通常のUser-Agent）
curl https://shumilog.dev/logs/YOUR_LOG_ID

# メタタグの確認
curl https://shumilog.dev/logs/YOUR_LOG_ID | grep -i "og:"
```

## まとめ

Cloudflare Pages Functionsを「SSRフレームワーク」として採用することで、shumilogは以下を実現しています：

✅ **軽量** - 追加フレームワーク不要、ゼロ依存
✅ **シンプル** - 標準Web APIのみ使用
✅ **オープン** - オープンソース、カスタマイズ自由
✅ **高性能** - Cloudflare Edgeで実行、低レイテンシー
✅ **スケーラブル** - 自動スケーリング、無制限トラフィック対応
✅ **保守性** - 単一ファイル、明確な責務分離

このアプローチは、Next.jsやRemixなどの大規模フレームワークを導入することなく、プロジェクトの要件を完全に満たしています。

## 参考リンク

- [Cloudflare Pages Functions ドキュメント](https://developers.cloudflare.com/pages/functions/)
- [Cloudflare Image Resizing](https://developers.cloudflare.com/images/image-resizing/)
- [SSR対応機能 (shumilog)](./ssr-support.md)
- [Cloudflare Pages デプロイメントガイド](./cloudflare-pages-deployment.md)
