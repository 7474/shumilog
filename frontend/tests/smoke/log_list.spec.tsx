import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LogsPage } from '../../src/pages/LogsPage';
import { App } from '../../src/App';
import { Router } from '../../src/Router';

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
      created_at: '2025-09-15T12:00:00Z',
      content_md: 'content'
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
      created_at: '2025-09-10T18:30:00Z',
      content_md: 'content'
    }
  ]
};

describe('Smoke: Log list experience', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.includes('/api/logs')) {
        if (init?.method === 'GET' || init?.method === undefined) {
          return new Response(JSON.stringify(LOG_FIXTURE), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (init?.method === 'POST') {
          return new Response(JSON.stringify({ id: 'log_3', ...JSON.parse(init.body as string) }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
      
      if (url.includes('/api/users/me')) {
        return new Response(JSON.stringify({ id: 'user_1', display_name: 'test user' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`Unexpected fetch request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads logs and allows creation', async () => {
    const user = userEvent.setup();
    render(<Router />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/logs'),
        expect.anything()
      );
    });

    expect(await screen.findByText(/Autumn Anime Marathon/i)).toBeInTheDocument();
    expect(screen.getByText(/Manga Catch-up Week/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Create Log/i }));

    await user.type(screen.getByLabelText(/Title/i), 'New Log Title');
    await user.type(screen.getByLabelText(/Content/i), 'New Log Content');

    await user.click(screen.getByRole('button', { name: /Create/i }));

    await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
            expect.stringContaining('/api/logs'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ title: 'New Log Title', content_md: 'New Log Content' })
            })
        );
    });
  });
});

