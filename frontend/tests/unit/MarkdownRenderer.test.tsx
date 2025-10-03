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
    const { container } = render(
      <MarkdownRenderer content="# Hello World\n\nThis is a test." />
    );
    
    expect(container.querySelector('h1')).toHaveTextContent('Hello World');
    expect(container.textContent).toContain('This is a test.');
  });

  it('should convert simple hashtags to links when tags are provided', () => {
    const { container } = render(
      <MarkdownRenderer 
        content="I love #anime and #gaming" 
        tags={mockTags}
      />
    );
    
    const links = container.querySelectorAll('a.hashtag-link');
    expect(links).toHaveLength(2);
    
    // Check the anime link (should link to tag_1)
    const animeLink = Array.from(links).find(link => link.textContent === '#anime');
    expect(animeLink).toBeDefined();
    expect(animeLink?.getAttribute('href')).toBe('/tags/tag_1');
    
    // Check the gaming link (tag not in list, should link to search)
    const gamingLink = Array.from(links).find(link => link.textContent === '#gaming');
    expect(gamingLink).toBeDefined();
    expect(gamingLink?.getAttribute('href')).toBe('/tags?search=gaming');
  });

  it('should convert extended hashtags with spaces to links', () => {
    const { container } = render(
      <MarkdownRenderer 
        content="Playing #{Final Fantasy} today!" 
        tags={mockTags}
      />
    );
    
    const links = container.querySelectorAll('a.hashtag-link');
    expect(links).toHaveLength(1);
    
    const ffLink = links[0];
    expect(ffLink.textContent).toBe('#{Final Fantasy}');
    expect(ffLink.getAttribute('href')).toBe('/tags/tag_2');
  });

  it('should handle both hashtag formats in the same content', () => {
    const { container } = render(
      <MarkdownRenderer 
        content="I love #anime and #{Final Fantasy}" 
        tags={mockTags}
      />
    );
    
    const links = container.querySelectorAll('a.hashtag-link');
    expect(links).toHaveLength(2);
    
    const animeLink = Array.from(links).find(link => link.textContent === '#anime');
    expect(animeLink?.getAttribute('href')).toBe('/tags/tag_1');
    
    const ffLink = Array.from(links).find(link => link.textContent === '#{Final Fantasy}');
    expect(ffLink?.getAttribute('href')).toBe('/tags/tag_2');
  });

  it('should handle Japanese hashtags', () => {
    const { container } = render(
      <MarkdownRenderer 
        content="今日は #ゲーム をプレイした" 
        tags={mockTags}
      />
    );
    
    const links = container.querySelectorAll('a.hashtag-link');
    expect(links).toHaveLength(1);
    
    const gameLink = links[0];
    expect(gameLink.textContent).toBe('#ゲーム');
    expect(gameLink.getAttribute('href')).toBe('/tags/tag_3');
  });

  it('should link to search when tags prop is not provided', () => {
    const { container } = render(
      <MarkdownRenderer content="I love #anime and #gaming" />
    );
    
    const links = container.querySelectorAll('a.hashtag-link');
    expect(links).toHaveLength(2);
    
    // Both should link to search since no tags provided
    links.forEach(link => {
      expect(link.getAttribute('href')).toMatch(/^\/tags\?search=/);
    });
  });

  it('should handle case-insensitive tag matching', () => {
    const { container } = render(
      <MarkdownRenderer 
        content="I love #Anime and #ANIME" 
        tags={mockTags}
      />
    );
    
    const links = container.querySelectorAll('a.hashtag-link');
    expect(links).toHaveLength(2);
    
    // Both should link to the same tag (case-insensitive)
    links.forEach(link => {
      expect(link.getAttribute('href')).toBe('/tags/tag_1');
    });
  });

  it('should not convert hashtags inside code blocks', () => {
    const { container } = render(
      <MarkdownRenderer 
        content="`code with #hashtag`" 
        tags={mockTags}
      />
    );
    
    const codeElement = container.querySelector('code');
    expect(codeElement).toBeDefined();
    expect(codeElement?.textContent).toContain('#hashtag');
    
    // Should not have created a link
    const links = container.querySelectorAll('a.hashtag-link');
    expect(links).toHaveLength(0);
  });
});
