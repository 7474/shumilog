import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

import { LogsPage } from '../../src/pages/LogsPage';
import { LogDetailPage } from '../../src/pages/LogDetailPage';

import { mockApi, mockUseAuth } from '../mocks/setup';

const renderWithRouter = (initialEntries: string[]) => {
  // Always render as authenticated for these tests
  mockUseAuth.isAuthenticated = true;
  mockUseAuth.user = { id: '1', name: 'Test User' };

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<LogsPage />} />
        <Route path="/logs/:id" element={<LogDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Log Management Integration Test', () => {
  beforeEach(() => {
    mockApi.logs.$get.mockClear();
  });

  afterEach(() => {
    mockApi.logs.$get.mockRestore();
  });

  it('should display a list of logs', async () => {
    const logs = [
      {
        id: '1',
        title: 'First log',
        content_md: 'First log entry',
        is_public: false,
        privacy: 'private',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: { id: '1', display_name: 'Test User', twitter_username: 'testuser', created_at: new Date().toISOString() },
        tags: [],
      },
      {
        id: '2',
        title: 'Second log',
        content_md: 'Second log entry',
        is_public: false,
        privacy: 'private',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: { id: '1', display_name: 'Test User', twitter_username: 'testuser', created_at: new Date().toISOString() },
        tags: [],
      },
    ];

    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ items: logs }),
    };
    mockApi.logs.$get.mockResolvedValue(mockResponse);

    renderWithRouter(['/']);

    await waitFor(() => {
      expect(screen.getByText('First log entry')).toBeInTheDocument();
      expect(screen.getByText('Second log entry')).toBeInTheDocument();
    });

    expect(mockApi.logs.$get).toHaveBeenCalledTimes(1);
  });
});
