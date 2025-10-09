import { describe, it, expect } from 'vitest';
import {
  getOptimizedImageUrl,
  getLogCardThumbnailUrl,
  getLogDetailImageUrl,
} from '@/utils/imageOptimizer';

describe('imageOptimizer', () => {
  describe('getOptimizedImageUrl', () => {
    it('デフォルトオプションでURLを生成する', () => {
      const originalUrl = 'http://example.com/image.jpg';
      const result = getOptimizedImageUrl(originalUrl);
      
      expect(result).toContain('fit=scale-down');
      expect(result).toContain('quality=85');
      expect(result).toContain('format=auto');
    });

    it('widthとheightを指定したURLを生成する', () => {
      const originalUrl = 'http://example.com/image.jpg';
      const result = getOptimizedImageUrl(originalUrl, {
        width: 800,
        height: 600,
      });
      
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

    it('既にクエリパラメータがあるURLに追加できる', () => {
      const originalUrl = 'http://example.com/image.jpg?foo=bar';
      const result = getOptimizedImageUrl(originalUrl, {
        width: 800,
      });
      
      expect(result).toContain('foo=bar');
      expect(result).toContain('width=800');
      expect(result).toContain('&');
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
      
      expect(result).toContain('width=1024');
      expect(result).toContain('height=768');
      expect(result).toContain('fit=contain');
      expect(result).toContain('quality=95');
      expect(result).toContain('format=avif');
    });
  });

  describe('getLogCardThumbnailUrl', () => {
    it('ログカード用のサムネイルURLを生成する', () => {
      const imageUrl = 'http://example.com/image.jpg';
      const result = getLogCardThumbnailUrl(imageUrl);
      
      expect(result).toContain('width=400');
      expect(result).toContain('height=225');
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
});
