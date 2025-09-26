import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/App';

const LOG_FIXTURE = {
  total: 2,
  items: [
    {
      id: 'log_1',
      title: 'Autumn Anime Marathon',
      excerpt: 'Crunching through the fall lineup and ranking premieres.',
      is_public: true,
      author: {
        id: 'user_alpha',
        display_name: 'Alpha Reviewer',
        twitter_username: 'alpha'
      },
      tags: [
        { id: 'tag_anime', name: 'Anime' },
        { id: 'tag_fall', name: 'Fall 2025' }
      ],
      created_at: '2025-09-15T12:00:00Z'
    },
    {
      id: 'log_2',
      title: 'Manga Catch-up Week',
      excerpt: 'Finally finishing those unfinished volumes.',
      is_public: true,
      author: {
        id: 'user_beta',
        display_name: 'Beta Reviewer',
        twitter_username: 'beta'
      },
      tags: [{ id: 'tag_manga', name: 'Manga' }],
      created_at: '2025-09-10T18:30:00Z'
    }
  ]
};

describe('Smoke: Log list experience', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.includes('/api/logs') && (!init || init.method === undefined || init.method === 'GET')) {
        return {
          ok: true,
          status: 200,
          json: async () => LOG_FIXTURE
        } as Response;
      }

      if (url.includes('/api/logs/') && url.endsWith('/share')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ twitter_post_id: 'tweet_12345' })
        } as Response;
      }

      throw new Error(`Unexpected fetch request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads logs, filters by tag, and shares a log to Twitter', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/logs'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    expect(await screen.findByRole('heading', { name: /Autumn Anime Marathon/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Manga Catch-up Week/i })).toBeInTheDocument();

    const filterSelect = screen.getByLabelText(/Filter by tag/i);
    await user.selectOptions(filterSelect, 'tag_manga');

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('tag_ids=tag_manga'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    const shareButton = screen.getByRole('button', { name: /Share Autumn Anime Marathon/i });
    await user.click(shareButton);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/logs/log_1/share'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    expect(await screen.findByText(/Shared to Twitter!/i)).toBeInTheDocument();
  });
});
