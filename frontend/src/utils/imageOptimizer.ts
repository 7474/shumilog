/**
 * Cloudflare Image Resizing用のユーティリティ
 * 
 * Cloudflare Workersの画像リサイジング機能を使用して、
 * サムネイルなどの最適化された画像URLを生成します。
 * 
 * @see https://developers.cloudflare.com/images/image-resizing/
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

  // オプションをクエリパラメータに変換
  const params = new URLSearchParams();
  
  if (width) {
    params.append('width', width.toString());
  }
  
  if (height) {
    params.append('height', height.toString());
  }
  
  params.append('fit', fit);
  params.append('quality', quality.toString());
  params.append('format', format);

  // URLにパラメータを追加
  const separator = originalUrl.includes('?') ? '&' : '?';
  return `${originalUrl}${separator}${params.toString()}`;
}

/**
 * ログカード用のサムネイルURLを生成します
 * 
 * @param imageUrl - 元の画像URL
 * @returns サムネイル用に最適化された画像URL
 */
export function getLogCardThumbnailUrl(imageUrl: string): string {
  return getOptimizedImageUrl(imageUrl, {
    width: 400,
    height: 225,
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
