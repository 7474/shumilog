import { describe, it, expect } from 'vitest';
import { generateOgpHtml, extractPlainTextFromMarkdown } from '../../src/utils/ssrTemplate.js';

describe('ssrTemplate', () => {
  describe('extractPlainTextFromMarkdown', () => {
    it('should extract plain text from headers', () => {
      const markdown = '# Title\n## Subtitle\nContent';
      const result = extractPlainTextFromMarkdown(markdown);
      expect(result).toBe('Title Subtitle Content');
    });

    it('should extract plain text from links', () => {
      const markdown = 'Check out [this link](https://example.com) for more info.';
      const result = extractPlainTextFromMarkdown(markdown);
      expect(result).toBe('Check out this link for more info.');
    });

    it('should remove images', () => {
      const markdown = 'Here is an image: ![alt text](https://example.com/image.jpg)';
      const result = extractPlainTextFromMarkdown(markdown);
      expect(result).toBe('Here is an image:');
    });

    it('should remove bold and italic markers', () => {
      const markdown = '**bold** and *italic* text';
      const result = extractPlainTextFromMarkdown(markdown);
      expect(result).toBe('bold and italic text');
    });

    it('should remove code markers', () => {
      const markdown = 'Use `code` here and ```block code``` there';
      const result = extractPlainTextFromMarkdown(markdown);
      expect(result).toBe('Use code here and block code there');
    });

    it('should truncate long text', () => {
      const longText = 'a'.repeat(300);
      const markdown = `# ${longText}`;
      const result = extractPlainTextFromMarkdown(markdown, 50);
      expect(result.length).toBe(50);
      expect(result).toContain('...');
    });

    it('should handle complex markdown', () => {
      const markdown = `# Heading
      
**Bold text** with *italic* and [link](url).

- List item 1
- List item 2

\`\`\`code
block
\`\`\`

![image](url)`;
      const result = extractPlainTextFromMarkdown(markdown);
      expect(result).toContain('Heading');
      expect(result).toContain('Bold text');
      expect(result).toContain('italic');
      expect(result).toContain('link');
      expect(result).not.toContain('![');
      expect(result).not.toContain('**');
      expect(result).not.toContain('```');
    });
  });

  describe('generateOgpHtml', () => {
    it('should generate HTML with OGP meta tags', () => {
      const html = generateOgpHtml({
        title: 'Test Title',
        description: 'Test Description',
        url: 'https://example.com/test',
      });

      expect(html).toContain('<!doctype html>');
      expect(html).toContain('<meta property="og:title" content="Test Title" />');
      expect(html).toContain('<meta property="og:description" content="Test Description" />');
      expect(html).toContain('<meta property="og:url" content="https://example.com/test" />');
      expect(html).toContain('<meta property="twitter:title" content="Test Title" />');
    });

    it('should include image meta tag when image is provided', () => {
      const html = generateOgpHtml({
        title: 'Test',
        description: 'Desc',
        url: 'https://example.com',
        image: 'https://example.com/image.jpg',
      });

      expect(html).toContain('<meta property="og:image" content="https://example.com/image.jpg" />');
      expect(html).toContain('<meta property="twitter:image" content="https://example.com/image.jpg" />');
      expect(html).toContain('summary_large_image');
    });

    it('should not include image meta tag when image is not provided', () => {
      const html = generateOgpHtml({
        title: 'Test',
        description: 'Desc',
        url: 'https://example.com',
      });

      expect(html).not.toContain('<meta property="og:image"');
      expect(html).not.toContain('<meta property="twitter:image"');
      expect(html).toContain('summary');
      expect(html).not.toContain('summary_large_image');
    });

    it('should escape HTML entities in content', () => {
      const html = generateOgpHtml({
        title: '<script>alert("XSS")</script>',
        description: 'Test & "quotes" and \'apostrophes\'',
        url: 'https://example.com?param=value&other=test',
      });

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&amp;');
      expect(html).toContain('&quot;');
      expect(html).toContain('&#x27;');
    });

    it('should truncate long descriptions', () => {
      const longDescription = 'a'.repeat(300);
      const html = generateOgpHtml({
        title: 'Test',
        description: longDescription,
        url: 'https://example.com',
      });

      // Check that description is truncated
      const descMatch = html.match(/og:description" content="([^"]+)"/);
      expect(descMatch).toBeTruthy();
      if (descMatch) {
        expect(descMatch[1].length).toBeLessThanOrEqual(200);
        expect(descMatch[1]).toContain('...');
      }
    });

    it('should use custom type and siteName', () => {
      const html = generateOgpHtml({
        title: 'Article',
        description: 'Content',
        url: 'https://example.com',
        type: 'article',
        siteName: 'My Site',
      });

      expect(html).toContain('<meta property="og:type" content="article" />');
      expect(html).toContain('<meta property="og:site_name" content="My Site" />');
    });
  });
});
