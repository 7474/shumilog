import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LogCard } from '@/components/LogCard';
import { Log } from '@/models';

// Helper to wrap component with Router
function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('LogCard', () => {
  const mockLog: Log = {
    id: '1',
    title: 'Test Log Title',
    content_md:
      'This is a test content for the log entry. It should be displayed in the card preview.',
    is_public: true,
    privacy: 'public',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    user: {
      id: 'user1',
      display_name: 'Test User',
      twitter_username: 'testuser',
      avatar_url: 'https://example.com/avatar.jpg',
      created_at: '2024-01-01T00:00:00Z',
    },
    associated_tags: [
      { id: 'tag1', name: 'Anime', description: '', created_by: 'user1', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      { id: 'tag2', name: 'Gaming', description: '', created_by: 'user1', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    ],
  };

  it('renders log title', () => {
    renderWithRouter(<LogCard log={mockLog} />);
    expect(screen.getByText('Test Log Title')).toBeInTheDocument();
  });

  it('renders content preview', () => {
    renderWithRouter(<LogCard log={mockLog} />);
    expect(screen.getByText(/This is a test content/)).toBeInTheDocument();
  });

  it('renders author information', () => {
    renderWithRouter(<LogCard log={mockLog} />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByAltText('Test User')).toBeInTheDocument();
  });

  it('renders tags', () => {
    renderWithRouter(<LogCard log={mockLog} />);
    expect(screen.getByText('Anime')).toBeInTheDocument();
    expect(screen.getByText('Gaming')).toBeInTheDocument();
  });

  it('renders date in Japanese format', () => {
    renderWithRouter(<LogCard log={mockLog} />);
    const dateElement = screen.getByText(/2024/);
    expect(dateElement).toBeInTheDocument();
  });

  it('truncates long content with ellipsis', () => {
    const longLog: Log = {
      ...mockLog,
      content_md: 'a'.repeat(200),
    };
    renderWithRouter(<LogCard log={longLog} />);
    const contentText = screen.getByText(/a+\.\.\./);
    expect(contentText).toBeInTheDocument();
  });

  it('shows tag count indicator when more than 3 tags', () => {
    const logWithManyTags: Log = {
      ...mockLog,
      associated_tags: [
        { id: 'tag1', name: 'Tag1', description: '', created_by: 'user1', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
        { id: 'tag2', name: 'Tag2', description: '', created_by: 'user1', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
        { id: 'tag3', name: 'Tag3', description: '', created_by: 'user1', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
        { id: 'tag4', name: 'Tag4', description: '', created_by: 'user1', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
        { id: 'tag5', name: 'Tag5', description: '', created_by: 'user1', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      ],
    };
    renderWithRouter(<LogCard log={logWithManyTags} />);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('renders without tags when log has no tags', () => {
    const logWithoutTags: Log = {
      ...mockLog,
      associated_tags: [],
    };
    renderWithRouter(<LogCard log={logWithoutTags} />);
    expect(screen.queryByText('Anime')).not.toBeInTheDocument();
  });

  it('renders without avatar when author has no avatar_url', () => {
    const logWithoutAvatar: Log = {
      ...mockLog,
      user: {
        ...mockLog.user,
        avatar_url: undefined,
      },
    };
    renderWithRouter(<LogCard log={logWithoutAvatar} />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.queryByAltText('Test User')).not.toBeInTheDocument();
  });

  it('links to the correct log detail page', () => {
    const { container } = renderWithRouter(<LogCard log={mockLog} />);
    const link = container.querySelector('a');
    expect(link).toHaveAttribute('href', '/logs/1');
  });

  it('removes HTML comments from content preview', () => {
    const logWithHtmlComments: Log = {
      ...mockLog,
      content_md: '<!-- AI生成コンテンツ開始 -->\n\nこれはAI生成のテストコンテンツです。\n\n<!-- AI生成コンテンツ終了 -->',
    };
    renderWithRouter(<LogCard log={logWithHtmlComments} />);
    
    // HTMLコメントが表示されていないことを確認
    expect(screen.queryByText(/AI生成コンテンツ開始/)).not.toBeInTheDocument();
    expect(screen.queryByText(/AI生成コンテンツ終了/)).not.toBeInTheDocument();
    expect(screen.queryByText(/<!--/)).not.toBeInTheDocument();
    
    // 実際のコンテンツは表示されていることを確認
    expect(screen.getByText(/これはAI生成のテストコンテンツです。/)).toBeInTheDocument();
  });

  it('renders thumbnail image when log has images', () => {
    const logWithImage: Log = {
      ...mockLog,
      images: [
        {
          id: 'image_1',
          log_id: '1',
          r2_key: 'logs/1/image1.jpg',
          file_name: 'image1.jpg',
          content_type: 'image/jpeg',
          file_size: 1024,
          display_order: 0,
          created_at: '2024-01-15T10:00:00Z',
        },
      ],
    };
    const { container } = renderWithRouter(<LogCard log={logWithImage} />);
    
    const img = container.querySelector('img[loading="lazy"]');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('alt', 'Test Log Title');
    
    // URLに最適化パラメータが含まれていることを確認
    const src = img?.getAttribute('src');
    expect(src).toContain('/logs/1/images/image_1');
    expect(src).toContain('width=80');
    expect(src).toContain('height=80');
    expect(src).toContain('fit=cover');
  });

  it('does not render thumbnail when log has no images', () => {
    const logWithoutImages: Log = {
      ...mockLog,
      images: [],
    };
    const { container } = renderWithRouter(<LogCard log={logWithoutImages} />);
    
    const img = container.querySelector('img[loading="lazy"]');
    expect(img).not.toBeInTheDocument();
  });

  it('renders only first image as thumbnail when log has multiple images', () => {
    const logWithMultipleImages: Log = {
      ...mockLog,
      images: [
        {
          id: 'image_1',
          log_id: '1',
          r2_key: 'logs/1/image1.jpg',
          file_name: 'image1.jpg',
          content_type: 'image/jpeg',
          file_size: 1024,
          display_order: 0,
          created_at: '2024-01-15T10:00:00Z',
        },
        {
          id: 'image_2',
          log_id: '1',
          r2_key: 'logs/1/image2.jpg',
          file_name: 'image2.jpg',
          content_type: 'image/jpeg',
          file_size: 2048,
          display_order: 1,
          created_at: '2024-01-15T10:01:00Z',
        },
      ],
    };
    const { container } = renderWithRouter(<LogCard log={logWithMultipleImages} />);
    
    const imgs = container.querySelectorAll('img[loading="lazy"]');
    expect(imgs).toHaveLength(1);
    
    const src = imgs[0]?.getAttribute('src');
    expect(src).toContain('/logs/1/images/image_1');
  });
});
