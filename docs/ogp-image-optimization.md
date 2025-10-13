# OGP画像最適化機能

## 概要

ログのSSR時に関連画像がある場合、Cloudflare Image Resizingを使用してOGP（Open Graph Protocol）に最適なサイズで提供します。

## 機能詳細

### 画像最適化の仕様

- **対象サイズ**: 1200x630px（Twitter/Facebook推奨サイズ）
- **フィット方法**: cover（アスペクト比を保ちながら領域を埋める）
- **品質**: 85
- **フォーマット**: auto（ブラウザが対応している最適なフォーマット）

### Twitter Cardの自動切り替え

- 画像がある場合: `summary_large_image`（大きな画像プレビュー）
- 画像がない場合: `summary`（テキストのみのプレビュー）

## 実装例

### ログに画像がある場合のOGPタグ

```html
<!-- Open Graph -->
<meta property="og:type" content="article" />
<meta property="og:url" content="https://shumilog.dev/logs/log_alice_1" />
<meta property="og:title" content="進撃の巨人 最終話を見た" />
<meta property="og:description" content="進撃の巨人 最終話の感想..." />
<meta property="og:site_name" content="Shumilog" />
<meta property="og:image" content="https://shumilog.dev/cdn-cgi/image/width=1200,height=630,fit=cover,quality=85,format=auto/https://shumilog.dev/api/logs/log_alice_1/images/image_1" />

<!-- Twitter Card -->
<meta property="twitter:card" content="summary_large_image" />
<meta property="twitter:title" content="進撃の巨人 最終話を見た" />
<meta property="twitter:description" content="進撃の巨人 最終話の感想..." />
<meta property="twitter:image" content="https://shumilog.dev/cdn-cgi/image/width=1200,height=630,fit=cover,quality=85,format=auto/https://shumilog.dev/api/logs/log_alice_1/images/image_1" />
```

### 画像URL変換フロー

```
元の画像URL（相対パス）:
  /api/logs/log_alice_1/images/image_1

↓ getOgpImageUrl() で変換

最適化された画像URL:
  https://shumilog.dev/cdn-cgi/image/width=1200,height=630,fit=cover,quality=85,format=auto/https://shumilog.dev/api/logs/log_alice_1/images/image_1
```

## Cloudflare Image Resizingについて

Cloudflare Image Resizingは、Cloudflare WorkersとPagesで利用可能な画像最適化機能です。

### 特徴

- **オンデマンド変換**: リクエスト時にリアルタイムで画像を変換
- **CDNキャッシュ**: 変換後の画像はCDNにキャッシュされ、高速配信
- **フォーマット自動選択**: ブラウザがWebPやAVIFに対応していれば自動的に最適なフォーマットを選択
- **コスト効率**: 従来の画像サーバーと比較して低コスト

### URLフォーマット

```
https://<ZONE>/cdn-cgi/image/<OPTIONS>/<SOURCE-IMAGE>
```

### 利用可能なオプション

- `width`: 幅（ピクセル）
- `height`: 高さ（ピクセル）
- `fit`: フィット方法（scale-down, contain, cover, crop, pad）
- `quality`: 品質（1-100）
- `format`: フォーマット（auto, webp, avif, json）

## コード実装

### imageOptimizer.ts

```typescript
/**
 * OGP用の画像URLを生成します（サーバーサイド用）
 * TwitterやFacebookのOGPに最適なサイズの画像を生成します
 */
export function getOgpImageUrl(imageUrl: string, baseUrl: string): string {
  const optionParts: string[] = [];
  
  // OGP推奨サイズ: 1200x630
  optionParts.push('width=1200');
  optionParts.push('height=630');
  optionParts.push('fit=cover');
  optionParts.push('quality=85');
  optionParts.push('format=auto');

  const optionsString = optionParts.join(',');

  // 相対パスの場合は絶対URLに変換
  const absoluteImageUrl = imageUrl.startsWith('http') 
    ? imageUrl 
    : `${baseUrl}${imageUrl}`;

  return `${baseUrl}/cdn-cgi/image/${optionsString}/${absoluteImageUrl}`;
}
```

### _middleware.ts（SSR）

```typescript
async function handleLogSSR(logId: string, baseUrl: string, apiBaseUrl: string) {
  // ... ログデータ取得 ...
  
  // 先頭の関連画像をOGP画像として使用
  let image: string | undefined = undefined;
  if (log.images && log.images.length > 0) {
    const firstImage = log.images[0];
    // 画像URLを構築（相対パス形式、フロントエンドと同じロジック）
    const imageUrl = `/api/logs/${logId}/images/${firstImage.id}`;
    // Cloudflare Image Resizingで最適化（絶対URLに変換される）
    image = getOgpImageUrl(imageUrl, baseUrl);
  }
  
  // OGP HTMLを生成
  const html = generateOgpHtml({ title, description, url, image, type: 'article' });
  return new Response(html, { ... });
}
```

## テスト

### ユニットテスト

```bash
cd frontend
npm test tests/unit/imageOptimizer.test.ts
npm test tests/unit/middleware.test.ts
```

### 手動テスト

1. ログに画像を追加
2. OGPボットのUser-Agentでアクセス（例: `curl -A "Twitterbot"`）
3. 生成されたHTMLのメタタグを確認

## 参考資料

- [Cloudflare Image Resizing Documentation](https://developers.cloudflare.com/images/transform-images/transform-via-url/)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
