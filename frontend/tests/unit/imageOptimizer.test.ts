import { describe, it, expect, beforeEach } from 'vitest';
import {
  getOptimizedImageUrl,
  getLogCardThumbnailUrl,
  getLogDetailImageUrl,
  getOgpImageUrl,
} from '@/utils/imageOptimizer';

describe('imageOptimizer', () => {
  beforeEach(() => {
    // window.location.originをモック
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { origin: 'https://shumilog.dev' },
    });
  });

  describe('getOptimizedImageUrl', () => {
    it('デフォルトオプションでCloudflare Image Resizing URLを生成する', () => {
      const originalUrl = 'http://example.com/image.jpg';
      const result = getOptimizedImageUrl(originalUrl);
      
      // Cloudflareのフォーマット: https://<ZONE>/cdn-cgi/image/<OPTIONS>/<SOURCE-IMAGE>
      expect(result).toMatch(/^https:\/\/shumilog\.dev\/cdn-cgi\/image\//);
      expect(result).toContain('fit=scale-down');
      expect(result).toContain('quality=85');
      expect(result).toContain('format=auto');
      expect(result).toContain('http://example.com/image.jpg');
    });

    it('widthとheightを指定したURLを生成する', () => {
      const originalUrl = 'http://example.com/image.jpg';
      const result = getOptimizedImageUrl(originalUrl, {
        width: 800,
        height: 600,
      });
      
      expect(result).toMatch(/\/cdn-cgi\/image\//);
      expect(result).toContain('width=800');
      expect(result).toContain('height=600');
    });

    it('fitオプションを指定したURLを生成する', () => {
      const originalUrl = 'http://example.com/image.jpg';
      const result = getOptimizedImageUrl(originalUrl, {
        fit: 'cover',
      });
      
      expect(result).toContain('fit=cover');
    });

    it('qualityオプションを指定したURLを生成する', () => {
      const originalUrl = 'http://example.com/image.jpg';
      const result = getOptimizedImageUrl(originalUrl, {
        quality: 90,
      });
      
      expect(result).toContain('quality=90');
    });

    it('formatオプションを指定したURLを生成する', () => {
      const originalUrl = 'http://example.com/image.jpg';
      const result = getOptimizedImageUrl(originalUrl, {
        format: 'webp',
      });
      
      expect(result).toContain('format=webp');
    });

    it('元のURLにクエリパラメータがあっても正しく処理する', () => {
      const originalUrl = 'http://example.com/image.jpg?foo=bar';
      const result = getOptimizedImageUrl(originalUrl, {
        width: 800,
      });
      
      // 元のURLのクエリパラメータは保持される
      expect(result).toContain('foo=bar');
      expect(result).toContain('width=800');
      // Cloudflareのフォーマットを使用
      expect(result).toMatch(/\/cdn-cgi\/image\//);
    });

    it('すべてのオプションを指定したURLを生成する', () => {
      const originalUrl = 'http://example.com/image.jpg';
      const result = getOptimizedImageUrl(originalUrl, {
        width: 1024,
        height: 768,
        fit: 'contain',
        quality: 95,
        format: 'avif',
      });
      
      expect(result).toMatch(/\/cdn-cgi\/image\//);
      expect(result).toContain('width=1024');
      expect(result).toContain('height=768');
      expect(result).toContain('fit=contain');
      expect(result).toContain('quality=95');
      expect(result).toContain('format=avif');
    });

    it('相対パスのURLを絶対URLに変換する', () => {
      const originalUrl = '/api/logs/log_1/images/image_1';
      const result = getOptimizedImageUrl(originalUrl);
      
      expect(result).toMatch(/^https:\/\/shumilog\.dev\/cdn-cgi\/image\//);
      expect(result).toContain('https://shumilog.dev/api/logs/log_1/images/image_1');
    });
  });

  describe('getLogCardThumbnailUrl', () => {
    it('ログカード用のサムネイルURLを生成する', () => {
      const imageUrl = 'http://example.com/image.jpg';
      const result = getLogCardThumbnailUrl(imageUrl);
      
      expect(result).toMatch(/\/cdn-cgi\/image\//);
      expect(result).toContain('width=80');
      expect(result).toContain('height=80');
      expect(result).toContain('fit=cover');
      expect(result).toContain('quality=80');
      expect(result).toContain('format=auto');
    });

    it('元のURLを含む', () => {
      const imageUrl = 'http://example.com/logs/log_1/images/image_1';
      const result = getLogCardThumbnailUrl(imageUrl);
      
      expect(result).toContain('http://example.com/logs/log_1/images/image_1');
    });
  });

  describe('getLogDetailImageUrl', () => {
    it('ログ詳細ページ用の画像URLを生成する', () => {
      const imageUrl = 'http://example.com/image.jpg';
      const result = getLogDetailImageUrl(imageUrl);
      
      expect(result).toMatch(/\/cdn-cgi\/image\//);
      expect(result).toContain('width=1920');
      expect(result).toContain('fit=scale-down');
      expect(result).toContain('quality=85');
      expect(result).toContain('format=auto');
    });

    it('元のURLを含む', () => {
      const imageUrl = 'http://example.com/logs/log_1/images/image_1';
      const result = getLogDetailImageUrl(imageUrl);
      
      expect(result).toContain('http://example.com/logs/log_1/images/image_1');
    });
  });

  describe('getOgpImageUrl', () => {
    it('OGP用の最適化された画像URLを生成する', () => {
      const imageUrl = 'https://example.com/api/logs/log_1/images/image_1';
      const baseUrl = 'https://shumilog.dev';
      const result = getOgpImageUrl(imageUrl, baseUrl);
      
      // Cloudflare Image Resizingのフォーマットを使用
      expect(result).toMatch(/^https:\/\/shumilog\.dev\/cdn-cgi\/image\//);
      // OGP推奨サイズ: 1200x630
      expect(result).toContain('width=1200');
      expect(result).toContain('height=630');
      expect(result).toContain('fit=cover');
      expect(result).toContain('quality=85');
      expect(result).toContain('format=auto');
      expect(result).toContain(imageUrl);
    });

    it('異なるbaseURLでも正しく動作する', () => {
      const imageUrl = 'https://api.shumilog.dev/api/logs/log_1/images/image_1';
      const baseUrl = 'https://frontend.shumilog.dev';
      const result = getOgpImageUrl(imageUrl, baseUrl);
      
      expect(result).toMatch(/^https:\/\/frontend\.shumilog\.dev\/cdn-cgi\/image\//);
      expect(result).toContain(imageUrl);
    });
  });
});
