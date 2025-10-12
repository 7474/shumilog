import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOgp, extractPlainText } from '@/hooks/useOgp';

describe('useOgp', () => {
  beforeEach(() => {
    // Clear any existing meta tags
    document.head.innerHTML = '';
  });

  it('should set basic OGP meta tags', () => {
    const options = {
      title: 'Test Title',
      description: 'Test Description',
      url: 'https://example.com/test',
      type: 'article' as const,
    };

    renderHook(() => useOgp(options));

    // Check document title
    expect(document.title).toBe('Test Title - Shumilog');

    // Check basic meta tags
    expect(document.querySelector('meta[name="title"]')?.getAttribute('content')).toBe('Test Title');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Test Description');

    // Check OGP tags
    expect(document.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe('article');
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe('https://example.com/test');
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Test Title');
    expect(document.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe('Test Description');
    expect(document.querySelector('meta[property="og:site_name"]')?.getAttribute('content')).toBe('Shumilog');

    // Check Twitter Card tags
    expect(document.querySelector('meta[property="twitter:card"]')?.getAttribute('content')).toBe('summary');
    expect(document.querySelector('meta[property="twitter:url"]')?.getAttribute('content')).toBe('https://example.com/test');
    expect(document.querySelector('meta[property="twitter:title"]')?.getAttribute('content')).toBe('Test Title');
    expect(document.querySelector('meta[property="twitter:description"]')?.getAttribute('content')).toBe('Test Description');
  });

  it('should set image OGP tags when image is provided', () => {
    const options = {
      title: 'Test Title',
      description: 'Test Description',
      url: 'https://example.com/test',
      image: 'https://example.com/image.jpg',
    };

    renderHook(() => useOgp(options));

    // Check image tags
    expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('https://example.com/image.jpg');
    expect(document.querySelector('meta[property="twitter:image"]')?.getAttribute('content')).toBe('https://example.com/image.jpg');
    expect(document.querySelector('meta[property="twitter:card"]')?.getAttribute('content')).toBe('summary_large_image');
  });

  it('should truncate long descriptions', () => {
    const longDescription = 'a'.repeat(250);
    const options = {
      title: 'Test Title',
      description: longDescription,
      url: 'https://example.com/test',
    };

    renderHook(() => useOgp(options));

    const descriptionContent = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
    expect(descriptionContent).toBeDefined();
    expect(descriptionContent!.length).toBeLessThanOrEqual(200);
    expect(descriptionContent).toMatch(/\.\.\.$/);
  });

  it('should update meta tags when options change', () => {
    const options1 = {
      title: 'First Title',
      description: 'First Description',
      url: 'https://example.com/first',
    };

    const { rerender } = renderHook((props) => useOgp(props), { initialProps: options1 });

    expect(document.title).toBe('First Title - Shumilog');
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('First Title');

    const options2 = {
      title: 'Second Title',
      description: 'Second Description',
      url: 'https://example.com/second',
    };

    rerender(options2);

    expect(document.title).toBe('Second Title - Shumilog');
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Second Title');
  });
});

describe('extractPlainText', () => {
  it('should extract plain text from markdown', () => {
    const markdown = '# Header\n\nThis is **bold** and *italic* text with [link](url).';
    const result = extractPlainText(markdown);
    expect(result).toBe('Header This is bold and italic text with link.');
  });

  it('should remove images', () => {
    const markdown = 'Text with ![alt](image.jpg) image.';
    const result = extractPlainText(markdown);
    expect(result).toBe('Text with image.');
  });

  it('should truncate to max length', () => {
    const markdown = 'a'.repeat(300);
    const result = extractPlainText(markdown, 100);
    expect(result.length).toBeLessThanOrEqual(100);
    expect(result).toMatch(/\.\.\.$/);
  });

  it('should normalize whitespace', () => {
    const markdown = 'Text   with\n\nmultiple\n\n\nspaces';
    const result = extractPlainText(markdown);
    expect(result).toBe('Text with multiple spaces');
  });

  it('should remove code blocks', () => {
    const markdown = 'Text with `inline code` and ```block code```';
    const result = extractPlainText(markdown);
    expect(result).toBe('Text with inline code and block code');
  });
});
