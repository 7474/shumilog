import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

import { TagsPage } from '../../src/pages/TagsPage';

import { mockApi, mockUseAuth } from '../mocks/setup';

const renderWithRouter = (initialEntries: string[]) => {
  // Always render as authenticated for these tests
  mockUseAuth.isAuthenticated = true;
  mockUseAuth.user = { id: '1', name: 'Test User' };

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/tags" element={<TagsPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Tag Management Integration Test', () => {
  beforeEach(() => {
    mockApi.tags.$get.mockClear();
  });

  afterEach(() => {
    mockApi.tags.$get.mockRestore();
  });

  it('should display a list of tags', async () => {
    const tags = [
      { id: '1', name: 'React' },
      { id: '2', name: 'TypeScript' },
    ];

    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ items: tags }),
    };
    mockApi.tags.$get.mockResolvedValue(mockResponse);

    renderWithRouter(['/tags']);

    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
    });

    expect(mockApi.tags.$get).toHaveBeenCalledTimes(1);
  });

  it('should not display "説明なし" for tags without description', async () => {
    const tags = [
      { id: '1', name: 'React', description: 'A JavaScript library' },
      { id: '2', name: 'TypeScript', description: '' }, // Empty description
      { id: '3', name: 'Vue' }, // No description field
    ];

    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ items: tags }),
    };
    mockApi.tags.$get.mockResolvedValue(mockResponse);

    renderWithRouter(['/tags']);

    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.getByText('Vue')).toBeInTheDocument();
    });

    // Should display the actual description for React
    expect(screen.getByText('A JavaScript library')).toBeInTheDocument();

    // Should NOT display "説明なし" anywhere in the document
    expect(screen.queryByText('説明なし')).not.toBeInTheDocument();
  });
});
