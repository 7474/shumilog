import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { normalizeImage } from '../../src/utils/imageNormalizer';

describe('imageNormalizer', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    // Canvas APIのモック
    mockContext = {
      drawImage: vi.fn(),
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
    } as unknown as CanvasRenderingContext2D;

    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockContext),
      toBlob: vi.fn((callback: BlobCallback) => {
        // WebPのBlobを模擬
        const blob = new Blob(['fake-image-data'], { type: 'image/webp' });
        callback(blob);
      }),
    } as unknown as HTMLCanvasElement;

    // document.createElementのモック
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return mockCanvas as unknown as HTMLCanvasElement;
      }
      return document.createElement(tagName);
    });

    // URL.createObjectURLとrevokeObjectURLのモック
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Imageのモック
    global.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      width = 0;
      height = 0;

      constructor() {
        // srcが設定されたら即座にonloadを呼ぶ
        setTimeout(() => {
          if (this.onload) {
            this.onload();
          }
        }, 0);
      }
    } as unknown as typeof Image;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('normalizeImage', () => {
    it('1MB未満の画像は未加工で返す', async () => {
      // 500KBの画像ファイルを作成
      const smallFile = new File(['x'.repeat(500 * 1024)], 'small.jpg', {
        type: 'image/jpeg',
      });

      const result = await normalizeImage(smallFile);

      // 元のファイルがそのまま返される
      expect(result).toBe(smallFile);
      expect(result.name).toBe('small.jpg');
      expect(result.type).toBe('image/jpeg');
    });

    it('1MB以上の画像をWebPに変換する', async () => {
      // 2MBの画像ファイルを作成
      const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });

      // Imageのモックを更新（1920px以下）
      global.Image = class MockImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src = '';
        width = 1600;
        height = 1200;

        constructor() {
          setTimeout(() => {
            if (this.onload) {
              this.onload();
            }
          }, 0);
        }
      } as unknown as typeof Image;

      const result = await normalizeImage(largeFile);

      // WebPファイルに変換される
      expect(result.name).toBe('large.webp');
      expect(result.type).toBe('image/webp');
    });

    it('長編が1920pxを超える画像をリサイズする', async () => {
      // 3MBの大きな画像ファイルを作成
      const largeFile = new File(['x'.repeat(3 * 1024 * 1024)], 'huge.png', {
        type: 'image/png',
      });

      // Imageのモックを更新（大きな寸法）
      global.Image = class MockImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src = '';
        width = 3840;
        height = 2160;

        constructor() {
          setTimeout(() => {
            if (this.onload) {
              this.onload();
            }
          }, 0);
        }
      } as unknown as typeof Image;

      const result = await normalizeImage(largeFile);

      // リサイズされてWebPに変換される
      expect(result.name).toBe('huge.webp');
      expect(result.type).toBe('image/webp');

      // Canvasのサイズがリサイズ後の寸法になっているか確認
      expect(mockCanvas.width).toBe(1920); // 長編が1920pxに
      expect(mockCanvas.height).toBe(1080); // アスペクト比維持
    });

    it('縦長の画像も正しくリサイズする', async () => {
      // 縦長の大きな画像
      const largeFile = new File(['x'.repeat(3 * 1024 * 1024)], 'tall.jpg', {
        type: 'image/jpeg',
      });

      // Imageのモックを更新（縦長）
      global.Image = class MockImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src = '';
        width = 1080;
        height = 2160;

        constructor() {
          setTimeout(() => {
            if (this.onload) {
              this.onload();
            }
          }, 0);
        }
      } as unknown as typeof Image;

      const result = await normalizeImage(largeFile);

      // リサイズされてWebPに変換される
      expect(result.name).toBe('tall.webp');
      expect(result.type).toBe('image/webp');

      // Canvasのサイズがリサイズ後の寸法になっているか確認
      expect(mockCanvas.width).toBe(960); // アスペクト比維持
      expect(mockCanvas.height).toBe(1920); // 長編が1920pxに
    });

    it('1MB以上でも1920px以下の画像はリサイズせずWebP変換のみ行う', async () => {
      const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'medium.jpg', {
        type: 'image/jpeg',
      });

      // Imageのモックを更新（1920px以下）
      global.Image = class MockImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src = '';
        width = 1600;
        height = 1200;

        constructor() {
          setTimeout(() => {
            if (this.onload) {
              this.onload();
            }
          }, 0);
        }
      } as unknown as typeof Image;

      const result = await normalizeImage(largeFile);

      // WebPに変換されるがリサイズはしない
      expect(result.name).toBe('medium.webp');
      expect(result.type).toBe('image/webp');
      expect(mockCanvas.width).toBe(1600); // 元のサイズを維持
      expect(mockCanvas.height).toBe(1200);
    });

    it('エラー時は元のファイルを返す', async () => {
      const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'error.jpg', {
        type: 'image/jpeg',
      });

      // エラーを発生させる
      vi.spyOn(document, 'createElement').mockImplementation(() => {
        throw new Error('Canvas creation failed');
      });

      const result = await normalizeImage(largeFile);

      // エラー時は元のファイルを返す
      expect(result).toBe(largeFile);
      expect(result.name).toBe('error.jpg');
      expect(result.type).toBe('image/jpeg');
    });

    it('高品質なリサイズ設定を使用する', async () => {
      const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'quality.jpg', {
        type: 'image/jpeg',
      });

      // Imageのモックを更新
      global.Image = class MockImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src = '';
        width = 1600;
        height = 1200;

        constructor() {
          setTimeout(() => {
            if (this.onload) {
              this.onload();
            }
          }, 0);
        }
      } as unknown as typeof Image;

      await normalizeImage(largeFile);

      // 高品質なリサイズ設定が使用される
      expect(mockContext.imageSmoothingEnabled).toBe(true);
      expect(mockContext.imageSmoothingQuality).toBe('high');
    });
  });
});
