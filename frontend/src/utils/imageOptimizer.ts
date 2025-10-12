/**
 * Cloudflare Image Resizing用のユーティリティ
 * 
 * Cloudflare Workersの画像リサイジング機能を使用して、
 * サムネイルなどの最適化された画像URLを生成します。
 * 
 * @see https://developers.cloudflare.com/images/transform-images/transform-via-url/
 */

export interface ImageResizeOptions {
  /**
   * 画像の幅（ピクセル）
   */
  width?: number;
  
  /**
   * 画像の高さ（ピクセル）
   */
  height?: number;
  
  /**
   * フィット方法
   * - scale-down: 元の画像より大きくしない（デフォルト）
   * - contain: アスペクト比を保持して全体を表示
   * - cover: アスペクト比を保持して領域を埋める
   * - crop: 指定サイズにクロップ
   * - pad: アスペクト比を保持してパディングを追加
   */
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
  
  /**
   * 画像品質（1-100）
   * デフォルトは85
   */
  quality?: number;
  
  /**
   * フォーマット
   * - auto: ブラウザが対応している最適なフォーマット（デフォルト）
   * - webp: WebP形式
   * - avif: AVIF形式
   * - json: メタデータのみ
   */
  format?: 'auto' | 'webp' | 'avif' | 'json';
}

/**
 * Cloudflare Image Resizing用のURLを生成します
 * 
 * Cloudflareの画像最適化は `/cdn-cgi/image/<OPTIONS>/<SOURCE-IMAGE>` のフォーマットを使用します。
 * 
 * @param originalUrl - 元の画像URL
 * @param options - リサイジングオプション
 * @returns 最適化された画像URL
 */
export function getOptimizedImageUrl(
  originalUrl: string,
  options: ImageResizeOptions = {}
): string {
  // デフォルト値
  const {
    width,
    height,
    fit = 'scale-down',
    quality = 85,
    format = 'auto',
  } = options;

  // オプションをカンマ区切りの文字列に変換
  const optionParts: string[] = [];
  
  if (width) {
    optionParts.push(`width=${width}`);
  }
  
  if (height) {
    optionParts.push(`height=${height}`);
  }
  
  optionParts.push(`fit=${fit}`);
  optionParts.push(`quality=${quality}`);
  optionParts.push(`format=${format}`);

  const optionsString = optionParts.join(',');

  // フロントエンドのベースURLを取得（環境変数から、なければ現在のオリジンを使用）
  const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
  
  // Cloudflare Image Resizing URLフォーマット: https://<ZONE>/cdn-cgi/image/<OPTIONS>/<SOURCE-IMAGE>
  // 元のURLが相対パスの場合は絶対URLに変換
  const absoluteUrl = originalUrl.startsWith('http') 
    ? originalUrl 
    : `${frontendUrl}${originalUrl}`;

  return `${frontendUrl}/cdn-cgi/image/${optionsString}/${absoluteUrl}`;
}

/**
 * ログカード用のサムネイルURLを生成します
 * 中心をスクエアにクロップした控えめなサイズのサムネイルを生成します
 * 
 * @param imageUrl - 元の画像URL
 * @returns サムネイル用に最適化された画像URL
 */
export function getLogCardThumbnailUrl(imageUrl: string): string {
  return getOptimizedImageUrl(imageUrl, {
    width: 80,
    height: 80,
    fit: 'cover',
    quality: 80,
    format: 'auto',
  });
}

/**
 * ログ詳細ページ用の画像URLを生成します
 * 
 * @param imageUrl - 元の画像URL
 * @returns 詳細ページ用に最適化された画像URL
 */
export function getLogDetailImageUrl(imageUrl: string): string {
  return getOptimizedImageUrl(imageUrl, {
    width: 1920,
    fit: 'scale-down',
    quality: 85,
    format: 'auto',
  });
}

/**
 * OGP用の画像URLを生成します（サーバーサイド用）
 * TwitterやFacebookのOGPに最適なサイズの画像を生成します
 * 
 * 推奨サイズ:
 * - Twitter: 1200x630px (アスペクト比 1.91:1)
 * - Facebook: 1200x630px (アスペクト比 1.91:1)
 * 
 * @param imageUrl - 元の画像URL（完全なURL）
 * @param baseUrl - フロントエンドのベースURL
 * @returns OGP用に最適化された画像URL
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

  // Cloudflare Image Resizing URLフォーマット
  return `${baseUrl}/cdn-cgi/image/${optionsString}/${imageUrl}`;
}
