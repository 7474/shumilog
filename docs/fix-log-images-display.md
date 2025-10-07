# ログ詳細画像表示修正

## 問題

ログ詳細ページで添付画像が表示されない問題がありました。

### 原因

`frontend/src/components/LogImages.tsx`コンポーネントが、画像URLに相対パス（`/api/logs/${logId}/images/${image.id}`）を使用していました。

- **開発環境**: Viteのプロキシ機能により、`/api/*`へのリクエストは`http://localhost:8787`にプロキシされるため正常に動作
- **本番環境**: 
  - フロントエンド: `https://shumilog.dev` (Cloudflare Pages)
  - バックエンド: `https://api.shumilog.dev` (Cloudflare Workers)
  - 相対URLを使用すると、リクエストは`https://shumilog.dev/api/...`に送信され、404エラーが発生

## 修正内容

`LogImages.tsx`を`VITE_API_BASE_URL`環境変数を使用するように修正しました。

```typescript
// 修正前
<img src={`/api/logs/${logId}/images/${image.id}`} />

// 修正後
const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
<img src={`${baseUrl}/logs/${logId}/images/${image.id}`} />
```

この修正により：
- 開発環境: `VITE_API_BASE_URL=http://localhost:8787/api` → `http://localhost:8787/api/logs/.../images/...`
- 本番環境: `VITE_API_BASE_URL=https://api.shumilog.dev/api` → `https://api.shumilog.dev/api/logs/.../images/...`

## 関連修正

同様の問題が`LogForm.tsx`で既に修正されていました（画像アップロード時）。今回の修正により、画像の表示と取得も同じ環境変数を使用するようになり、一貫性が保たれます。

参考: [docs/fix-image-upload-405.md](./fix-image-upload-405.md)

## テスト

新しいテストファイル`frontend/tests/unit/LogImages.test.tsx`を作成し、以下をテストしています：

- 画像がない場合の表示
- 画像がある場合の添付画像セクション表示
- ファイル名と寸法の表示
- 環境変数からのAPI base URL使用
- 異なる環境変数での動作
- lazy loading属性の設定

## 本番環境への適用

この修正を本番環境に適用するには、Cloudflare Pagesで以下の環境変数が設定されている必要があります：

| 変数名 | 値 | 環境 |
|--------|-----|------|
| `VITE_API_BASE_URL` | `https://api.shumilog.dev/api` | Production |

環境変数はビルド時に静的にバンドルされるため、環境変数を設定または変更した後は再ビルド・再デプロイが必要です。

## 影響範囲

この修正は以下のコンポーネントに影響します：

- `LogImages.tsx`: 画像表示コンポーネント（修正対象）
- `LogDetailPage.tsx`: ログ詳細ページ（LogImagesを使用）

画像のアップロード機能（`LogForm.tsx`）は既に修正済みのため、影響を受けません。
