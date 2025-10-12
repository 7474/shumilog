import { describe, it, expect } from 'vitest';
import { isOgpBot } from '../src/utils/botDetection.js';
import { generateOgpHtml, extractPlainTextFromMarkdown } from '../src/utils/ssrTemplate.js';

describe('SSR Functionality', () => {
  describe('Bot Detection', () => {
    it('should detect OGP bots', () => {
      expect(isOgpBot('Twitterbot/1.0')).toBe(true);
      expect(isOgpBot('facebookexternalhit/1.1')).toBe(true);
      expect(isOgpBot('Slackbot-LinkExpanding 1.0')).toBe(true);
    });

    it('should not detect regular browsers', () => {
      expect(isOgpBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false);
    });
  });

  describe('OGP HTML Generation', () => {
    it('should generate valid HTML with OGP tags for log', () => {
      const html = generateOgpHtml({
        title: 'Test Log',
        description: 'This is a test log description',
        url: 'https://shumilog.dev/logs/test-id',
        type: 'article',
      });

      expect(html).toContain('<!doctype html>');
      expect(html).toContain('<meta property="og:title" content="Test Log" />');
      expect(html).toContain('<meta property="og:description" content="This is a test log description" />');
      expect(html).toContain('<meta property="og:url" content="https://shumilog.dev/logs/test-id" />');
      expect(html).toContain('<meta property="og:type" content="article" />');
    });

    it('should generate valid HTML with OGP tags for tag', () => {
      const html = generateOgpHtml({
        title: '#TestTag',
        description: 'Test tag description',
        url: 'https://shumilog.dev/tags/TestTag',
        type: 'website',
      });

      expect(html).toContain('<meta property="og:title" content="#TestTag" />');
      expect(html).toContain('<meta property="og:type" content="website" />');
    });

    it('should extract plain text from markdown', () => {
      const markdown = '# Heading\n\n**Bold** text with [link](url).\n\n![image](url)';
      const result = extractPlainTextFromMarkdown(markdown);
      
      expect(result).toContain('Heading');
      expect(result).toContain('Bold');
      expect(result).toContain('link');
      expect(result).not.toContain('**');
      expect(result).not.toContain('![');
      expect(result).not.toContain('[');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle log with HTML entities', () => {
      const html = generateOgpHtml({
        title: '<script>alert("XSS")</script>',
        description: 'Test & "quotes"',
        url: 'https://example.com',
      });

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&amp;');
      expect(html).toContain('&quot;');
    });

    it('should truncate long descriptions', () => {
      const longText = 'a'.repeat(300);
      const html = generateOgpHtml({
        title: 'Test',
        description: longText,
        url: 'https://example.com',
      });

      const descMatch = html.match(/og:description" content="([^"]+)"/);
      expect(descMatch).toBeTruthy();
      if (descMatch) {
        expect(descMatch[1].length).toBeLessThanOrEqual(200);
      }
    });
  });
});
