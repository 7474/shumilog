import { describe, it, expect } from 'vitest';
import { removeHtmlComments, getMarkdownSummary } from '@/utils/markdownUtils';

describe('markdownUtils', () => {
  describe('removeHtmlComments', () => {
    it('HTMLコメントを除去する', () => {
      const markdown = '<!-- AI生成コンテンツ開始 -->\n\nこれはテストコンテンツです。\n\n<!-- AI生成コンテンツ終了 -->';
      const result = removeHtmlComments(markdown);
      
      expect(result).not.toContain('<!-- AI生成コンテンツ開始 -->');
      expect(result).not.toContain('<!-- AI生成コンテンツ終了 -->');
      expect(result).toContain('これはテストコンテンツです。');
    });

    it('複数のHTMLコメントを除去する', () => {
      const markdown = '<!-- コメント1 -->テキスト1<!-- コメント2 -->テキスト2<!-- コメント3 -->';
      const result = removeHtmlComments(markdown);
      
      expect(result).toBe('テキスト1テキスト2');
    });

    it('HTMLコメントがない場合は元の文字列を返す', () => {
      const markdown = 'これは普通のマークダウンテキストです。';
      const result = removeHtmlComments(markdown);
      
      expect(result).toBe(markdown);
    });

    it('改行を含むHTMLコメントを除去する', () => {
      const markdown = `<!-- 
        複数行の
        コメント
      -->
      実際のコンテンツ`;
      const result = removeHtmlComments(markdown);
      
      expect(result).not.toContain('複数行の');
      expect(result).toContain('実際のコンテンツ');
    });
  });

  describe('getMarkdownSummary', () => {
    it('HTMLコメントを除去してサマリを生成する', () => {
      const markdown = '<!-- AI生成コンテンツ開始 -->\n\nこれはテストコンテンツです。\n\n<!-- AI生成コンテンツ終了 -->';
      const result = getMarkdownSummary(markdown, 50);
      
      expect(result).not.toContain('<!--');
      expect(result).not.toContain('-->');
      expect(result).toContain('これはテストコンテンツです。');
    });

    it('maxLength以下の場合は省略記号なしで返す', () => {
      const markdown = 'これは短いテキストです。';
      const result = getMarkdownSummary(markdown, 100);
      
      expect(result).toBe('これは短いテキストです。');
      expect(result).not.toContain('...');
    });

    it('maxLengthを超える場合は省略記号付きで返す', () => {
      const markdown = 'a'.repeat(200);
      const result = getMarkdownSummary(markdown, 150);
      
      expect(result.length).toBe(153); // 150文字 + '...'
      expect(result).toMatch(/^a+\.\.\.$/);
    });

    it('前後の空白を削除する', () => {
      const markdown = '\n\n  これはテストです。  \n\n';
      const result = getMarkdownSummary(markdown, 100);
      
      expect(result).toBe('これはテストです。');
    });

    it('HTMLコメントと空白を除去してから長さをチェックする', () => {
      const markdown = '<!-- コメント -->\n\n' + 'a'.repeat(160);
      const result = getMarkdownSummary(markdown, 150);
      
      expect(result).not.toContain('<!--');
      expect(result.length).toBe(153); // 150文字 + '...'
    });

    it('デフォルトのmaxLengthは150文字', () => {
      const markdown = 'a'.repeat(200);
      const result = getMarkdownSummary(markdown);
      
      expect(result.length).toBe(153); // 150文字 + '...'
    });
  });
});
