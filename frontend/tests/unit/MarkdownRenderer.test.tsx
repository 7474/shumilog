import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { Tag } from '@/models';

describe('MarkdownRenderer', () => {
  const mockTags: Tag[] = [
    {
      id: 'tag_1',
      name: 'anime',
      description: 'アニメ関連',
      created_by: 'user_1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'tag_2',
      name: 'Final Fantasy',
      description: 'FFシリーズ',
      created_by: 'user_1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'tag_3',
      name: 'ゲーム',
      description: 'ゲーム全般',
      created_by: 'user_1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  it('should render basic markdown without hashtags', () => {
    const { container } = render(<MarkdownRenderer content="# Hello World\n\nThis is a test." />);

    expect(container.querySelector('h1')).toHaveTextContent('Hello World');
    expect(container.textContent).toContain('This is a test.');
  });

  it('should convert simple hashtags to links when tags are provided', () => {
    const { container } = render(
      <MarkdownRenderer content="I love #anime and #gaming" tags={mockTags} />
    );

    const links = container.querySelectorAll('a.hashtag-link');
    expect(links).toHaveLength(2);

    // Check the anime link (should link to tag name)
    const animeLink = Array.from(links).find((link) => link.textContent === '#anime');
    expect(animeLink).toBeDefined();
    expect(animeLink?.getAttribute('href')).toBe('/tags/anime');

    // Check the gaming link (tag not in list, should still link to tag detail page)
    const gamingLink = Array.from(links).find((link) => link.textContent === '#gaming');
    expect(gamingLink).toBeDefined();
    expect(gamingLink?.getAttribute('href')).toBe('/tags/gaming');
  });

  it('should convert extended hashtags with spaces to links', () => {
    const { container } = render(
      <MarkdownRenderer content="Playing #{Final Fantasy} today!" tags={mockTags} />
    );

    const links = container.querySelectorAll('a.hashtag-link');
    expect(links).toHaveLength(1);

    const ffLink = links[0];
    expect(ffLink.textContent).toBe('#{Final Fantasy}');
    expect(ffLink.getAttribute('href')).toBe('/tags/Final%20Fantasy');
  });

  it('should handle both hashtag formats in the same content', () => {
    const { container } = render(
      <MarkdownRenderer content="I love #anime and #{Final Fantasy}" tags={mockTags} />
    );

    const links = container.querySelectorAll('a.hashtag-link');
    expect(links).toHaveLength(2);

    const animeLink = Array.from(links).find((link) => link.textContent === '#anime');
    expect(animeLink?.getAttribute('href')).toBe('/tags/anime');

    const ffLink = Array.from(links).find((link) => link.textContent === '#{Final Fantasy}');
    expect(ffLink?.getAttribute('href')).toBe('/tags/Final%20Fantasy');
  });

  it('should handle Japanese hashtags', () => {
    const { container } = render(
      <MarkdownRenderer content="今日は #ゲーム をプレイした" tags={mockTags} />
    );

    const links = container.querySelectorAll('a.hashtag-link');
    expect(links).toHaveLength(1);

    const gameLink = links[0];
    expect(gameLink.textContent).toBe('#ゲーム');
    expect(gameLink.getAttribute('href')).toBe('/tags/%E3%82%B2%E3%83%BC%E3%83%A0');
  });

  it('should link to tag detail page when tags prop is not provided', () => {
    const { container } = render(<MarkdownRenderer content="I love #anime and #gaming" />);

    const links = container.querySelectorAll('a.hashtag-link');
    expect(links).toHaveLength(2);

    // Both should link to tag detail page even when no tags provided
    const animeLink = Array.from(links).find((link) => link.textContent === '#anime');
    expect(animeLink?.getAttribute('href')).toBe('/tags/anime');

    const gamingLink = Array.from(links).find((link) => link.textContent === '#gaming');
    expect(gamingLink?.getAttribute('href')).toBe('/tags/gaming');
  });

  it('should handle case preservation in hashtag links', () => {
    const { container } = render(
      <MarkdownRenderer content="I love #Anime and #ANIME" tags={mockTags} />
    );

    const links = container.querySelectorAll('a.hashtag-link');
    expect(links).toHaveLength(2);

    // Links should preserve the case as written in the content
    const animeLink = Array.from(links).find((link) => link.textContent === '#Anime');
    expect(animeLink?.getAttribute('href')).toBe('/tags/Anime');

    const animeUpperLink = Array.from(links).find((link) => link.textContent === '#ANIME');
    expect(animeUpperLink?.getAttribute('href')).toBe('/tags/ANIME');
  });

  it('should not convert hashtags inside code blocks', () => {
    const { container } = render(
      <MarkdownRenderer content="`code with #hashtag`" tags={mockTags} />
    );

    const codeElement = container.querySelector('code');
    expect(codeElement).toBeDefined();
    expect(codeElement?.textContent).toContain('#hashtag');

    // Should not have created a link
    const links = container.querySelectorAll('a.hashtag-link');
    expect(links).toHaveLength(0);
  });

  it('should extract hashtags with periods (dots) correctly', () => {
    const { container } = render(
      <MarkdownRenderer content="#SSSS.GRIDMAN 何らかのテキスト" tags={mockTags} />
    );

    const links = container.querySelectorAll('a.hashtag-link');
    expect(links).toHaveLength(1);

    const gridmanLink = links[0];
    expect(gridmanLink.textContent).toBe('#SSSS.GRIDMAN');
    expect(gridmanLink.getAttribute('href')).toBe('/tags/SSSS.GRIDMAN');
  });

  it('should handle both simple and extended hashtags with periods', () => {
    const { container } = render(
      <MarkdownRenderer
        content="#SSSS.GRIDMAN 何らかのテキスト。#{SSSS.DYNAZENON}も面白い。"
        tags={mockTags}
      />
    );

    const links = container.querySelectorAll('a.hashtag-link');
    expect(links).toHaveLength(2);

    const gridmanLink = Array.from(links).find((link) => link.textContent === '#SSSS.GRIDMAN');
    expect(gridmanLink?.getAttribute('href')).toBe('/tags/SSSS.GRIDMAN');

    const dynanenonLink = Array.from(links).find(
      (link) => link.textContent === '#{SSSS.DYNAZENON}'
    );
    expect(dynanenonLink?.getAttribute('href')).toBe('/tags/SSSS.DYNAZENON');
  });

  it('should extract hashtags with various symbols correctly', () => {
    const { container } = render(
      <MarkdownRenderer content="Tags: #test@symbol #foo:bar and more" tags={mockTags} />
    );

    const links = container.querySelectorAll('a.hashtag-link');
    expect(links.length).toBeGreaterThanOrEqual(2);

    const symbolLink = Array.from(links).find((link) => link.textContent === '#test@symbol');
    expect(symbolLink).toBeDefined();
    expect(symbolLink?.getAttribute('href')).toBe('/tags/test%40symbol');

    const colonLink = Array.from(links).find((link) => link.textContent === '#foo:bar');
    expect(colonLink).toBeDefined();
    expect(colonLink?.getAttribute('href')).toBe('/tags/foo%3Abar');
  });

  it('should handle trailing punctuation as part of hashtag', () => {
    const { container } = render(
      <MarkdownRenderer content="I love #gaming. Also #reading" tags={mockTags} />
    );

    const links = container.querySelectorAll('a.hashtag-link');
    expect(links).toHaveLength(2);

    // Note: With the new pattern, "gaming." includes the period
    const gamingLink = Array.from(links).find((link) => link.textContent === '#gaming.');
    expect(gamingLink?.getAttribute('href')).toBe('/tags/gaming.');

    const readingLink = Array.from(links).find((link) => link.textContent === '#reading');
    expect(readingLink?.getAttribute('href')).toBe('/tags/reading');
  });

  it('should not convert Markdown heading markers to hashtags', () => {
    const { container } = render(
      <MarkdownRenderer content="## Heading\n\nText with #tag" tags={mockTags} />
    );

    const links = container.querySelectorAll('a.hashtag-link');
    expect(links).toHaveLength(1);

    // Should only have a link for #tag, not for ##
    const tagLink = links[0];
    expect(tagLink.textContent).toBe('#tag');
    expect(tagLink.getAttribute('href')).toBe('/tags/tag');
  });

  it('should handle multiple # symbols correctly', () => {
    const { container } = render(
      <MarkdownRenderer content="##tag should be #tag not ##tag" tags={mockTags} />
    );

    const links = container.querySelectorAll('a.hashtag-link');
    // Should match: ##tag -> #tag, #tag -> #tag, ##tag -> #tag (3 total, but 2 unique after dedup by href)
    expect(links.length).toBeGreaterThanOrEqual(2);

    // All should link to 'tag' not '#tag' or '##tag'
    Array.from(links).forEach((link) => {
      expect(link.getAttribute('href')).toBe('/tags/tag');
    });
  });
});
