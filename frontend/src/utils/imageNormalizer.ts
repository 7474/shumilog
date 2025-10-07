/**
 * 画像正規化ユーティリティ
 *
 * アップロード前に画像を正規化します：
 * - 1MB未満: 未加工
 * - 1MB以上: 長編を1920px以下に縮小し、WebPの不可逆圧縮クオリティ90に変換
 */

const SIZE_THRESHOLD = 1 * 1024 * 1024; // 1MB
const MAX_DIMENSION = 1920; // 長編の最大サイズ
const WEBP_QUALITY = 0.9; // WebP圧縮クオリティ

/**
 * 画像ファイルを正規化します
 *
 * @param file - 正規化する画像ファイル
 * @returns 正規化された画像ファイル（1MB未満の場合は元のファイル）
 */
export async function normalizeImage(file: File): Promise<File> {
  // 1MB未満の場合は未加工
  if (file.size < SIZE_THRESHOLD) {
    return file;
  }

  try {
    // 画像を読み込む
    const image = await loadImage(file);

    // リサイズが必要かチェック（長編が1920pxを超える場合）
    const { width, height } = calculateResizeDimensions(image.width, image.height);

    // Canvas APIを使用してリサイズ＆WebP変換
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    // 高品質なリサイズのための設定
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 画像を描画
    ctx.drawImage(image, 0, 0, width, height);

    // WebPに変換（Blobを取得）
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert image to WebP'));
          }
        },
        'image/webp',
        WEBP_QUALITY
      );
    });

    // 元のファイル名をWebP拡張子に変更
    const originalName = file.name.replace(/\.[^.]+$/, '');
    const webpFileName = `${originalName}.webp`;

    // BlobをFileに変換して返す
    return new File([blob], webpFileName, { type: 'image/webp' });
  } catch (error) {
    console.error('Failed to normalize image, using original:', error);
    // エラー時は元のファイルを返す
    return file;
  }
}

/**
 * 画像ファイルをHTMLImageElementとして読み込みます
 *
 * @param file - 読み込む画像ファイル
 * @returns HTMLImageElement
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * リサイズ後の寸法を計算します
 * 長編が1920pxを超える場合、アスペクト比を維持しながら縮小します
 *
 * @param originalWidth - 元の幅
 * @param originalHeight - 元の高さ
 * @returns リサイズ後の幅と高さ
 */
function calculateResizeDimensions(
  originalWidth: number,
  originalHeight: number
): { width: number; height: number } {
  // 長編を取得
  const longerEdge = Math.max(originalWidth, originalHeight);

  // 長編が1920px以下の場合はそのまま
  if (longerEdge <= MAX_DIMENSION) {
    return { width: originalWidth, height: originalHeight };
  }

  // アスペクト比を維持しながら縮小
  const scale = MAX_DIMENSION / longerEdge;
  return {
    width: Math.round(originalWidth * scale),
    height: Math.round(originalHeight * scale),
  };
}
