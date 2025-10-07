import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { Header } from '@/components/Header';
import { mockUseAuth } from '../mocks/setup';

const renderWithRouter = () => {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  );
};

describe('Header Component', () => {
  beforeEach(() => {
    // Reset auth state to default
    mockUseAuth.isAuthenticated = false;
    mockUseAuth.isLoading = false;
    mockUseAuth.user = undefined;
  });

  it('should show Tags navigation link when not authenticated', async () => {
    mockUseAuth.isAuthenticated = false;
    renderWithRouter();

    // タグのナビゲーションリンクが表示されていることを確認
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Tags|🏷️/ })).toBeInTheDocument();
    });

    // ログインボタンが表示されていることを確認
    expect(screen.getByRole('link', { name: /Login|🔑/ })).toBeInTheDocument();

    // My Logsリンクが表示されていないことを確認
    expect(screen.queryByRole('link', { name: /My Logs|📚/ })).not.toBeInTheDocument();
  });

  it('should show My Logs and Tags when authenticated', async () => {
    mockUseAuth.isAuthenticated = true;
    mockUseAuth.user = { id: '1', name: 'Test User' };

    renderWithRouter();

    // My LogsとTagsのナビゲーションリンクが表示されていることを確認
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /My Logs|📚/ })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Tags|🏷️/ })).toBeInTheDocument();
    });

    // ログインボタンが表示されていないことを確認
    expect(screen.queryByRole('link', { name: /Login|🔑/ })).not.toBeInTheDocument();
  });

  it('should always show navigation to Tags page', async () => {
    // 未ログイン時
    mockUseAuth.isAuthenticated = false;
    const { rerender } = renderWithRouter();

    await waitFor(() => {
      const tagsLink = screen.getByRole('link', { name: /Tags|🏷️/ });
      expect(tagsLink).toBeInTheDocument();
      expect(tagsLink).toHaveAttribute('href', '/tags');
    });

    // ログイン時も同じリンクが存在することを確認
    mockUseAuth.isAuthenticated = true;
    mockUseAuth.user = { id: '1', name: 'Test User' };

    rerender(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    await waitFor(() => {
      const tagsLink = screen.getByRole('link', { name: /Tags|🏷️/ });
      expect(tagsLink).toBeInTheDocument();
      expect(tagsLink).toHaveAttribute('href', '/tags');
    });
  });

  it('should show My Logs link only when authenticated', async () => {
    // 未ログイン時は表示されない
    mockUseAuth.isAuthenticated = false;
    const { rerender } = renderWithRouter();

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: /My Logs|📚/ })).not.toBeInTheDocument();
    });

    // ログイン時は表示される
    mockUseAuth.isAuthenticated = true;
    mockUseAuth.user = { id: '1', name: 'Test User' };

    rerender(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    await waitFor(() => {
      const myLogsLink = screen.getByRole('link', { name: /My Logs|📚/ });
      expect(myLogsLink).toBeInTheDocument();
      expect(myLogsLink).toHaveAttribute('href', '/my/logs');
    });
  });
});
