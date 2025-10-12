/**
 * SSR HTMLテンプレート生成
 * OGPボット向けのメタタグを含むHTMLを生成
 */

export interface OgpMetadata {
  title: string;
  description: string;
  url: string;
  image?: string;
  type?: string;
  siteName?: string;
}

/**
 * OGPメタタグを含むHTMLテンプレートを生成
 * @param metadata OGPメタデータ
 * @returns HTMLテンプレート
 */
export function generateOgpHtml(metadata: OgpMetadata): string {
  const {
    title,
    description,
    url,
    image,
    type = 'website',
    siteName = 'Shumilog - Your Personal Hobby Logger',
  } = metadata;

  // descriptionを200文字に制限（OGPの推奨）
  const truncatedDescription = description.length > 200 
    ? description.substring(0, 197) + '...' 
    : description;

  // HTMLエスケープ
  const escape = (str: string) => 
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

  const escapedTitle = escape(title);
  const escapedDescription = escape(truncatedDescription);
  const escapedUrl = escape(url);
  const escapedSiteName = escape(siteName);

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#06aedd" />
    
    <!-- Primary Meta Tags -->
    <title>${escapedTitle} - ${escapedSiteName}</title>
    <meta name="title" content="${escapedTitle}" />
    <meta name="description" content="${escapedDescription}" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="${escape(type)}" />
    <meta property="og:url" content="${escapedUrl}" />
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDescription}" />
    <meta property="og:site_name" content="${escapedSiteName}" />
    ${image ? `<meta property="og:image" content="${escape(image)}" />` : ''}
    
    <!-- Twitter -->
    <meta property="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />
    <meta property="twitter:url" content="${escapedUrl}" />
    <meta property="twitter:title" content="${escapedTitle}" />
    <meta property="twitter:description" content="${escapedDescription}" />
    ${image ? `<meta property="twitter:image" content="${escape(image)}" />` : ''}
  </head>
  <body>
    <div id="root">
      <div style="max-width: 800px; margin: 40px auto; padding: 20px; font-family: system-ui, -apple-system, sans-serif;">
        <h1 style="color: #06aedd; margin-bottom: 20px;">${escapedTitle}</h1>
        <p style="color: #666; line-height: 1.6;">${escapedDescription}</p>
        <p style="margin-top: 20px; color: #999;">
          このページをブラウザで表示するには、JavaScriptを有効にしてください。
        </p>
      </div>
    </div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
}

/**
 * Markdownコンテンツからプレーンテキストの抜粋を生成
 * @param markdown Markdown文字列
 * @param maxLength 最大文字数
 * @returns プレーンテキスト
 */
export function extractPlainTextFromMarkdown(markdown: string, maxLength = 200): string {
  // Markdownの記号を削除してプレーンテキストに変換
  let text = markdown
    // 画像を削除（これを最初に処理）
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    // ヘッダー記号を削除
    .replace(/^#{1,6}\s+/gm, '')
    // リンクをテキストのみに変換 [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // ボールド/イタリックの記号を削除
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')
    // コードブロック記号を削除
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
    // 改行を空白に変換
    .replace(/\n+/g, ' ')
    // 複数の空白を1つに
    .replace(/\s+/g, ' ')
    .trim();

  // 最大文字数で切り詰め
  if (text.length > maxLength) {
    text = text.substring(0, maxLength - 3) + '...';
  }

  return text;
}
