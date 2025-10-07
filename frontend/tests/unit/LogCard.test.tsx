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
    content_md: 'This is a test content for the log entry. It should be displayed in the card preview.',
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
    tags: [
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
      tags: [
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
      tags: [],
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
});
