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

  it('should show Logs and Tags navigation links when not authenticated', async () => {
    mockUseAuth.isAuthenticated = false;
    renderWithRouter();
    
    // ログとタグのナビゲーションリンクが表示されていることを確認
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Logs|📝/ })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Tags|🏷️/ })).toBeInTheDocument();
    });
    
    // ログインボタンが表示されていることを確認
    expect(screen.getByRole('link', { name: /Login|🔑/ })).toBeInTheDocument();
    
    // ログアウトボタンが表示されていないことを確認
    expect(screen.queryByRole('button', { name: /Logout|🚪/ })).not.toBeInTheDocument();
  });

  it('should show Logs, Tags, and Logout when authenticated', async () => {
    mockUseAuth.isAuthenticated = true;
    mockUseAuth.user = { id: '1', name: 'Test User' };
    
    renderWithRouter();
    
    // ログとタグのナビゲーションリンクが表示されていることを確認
    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: /Logs|📝/ }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('link', { name: /Tags|🏷️/ })).toBeInTheDocument();
    });
    
    // My Logsリンクが表示されていることを確認（認証時のみ）
    expect(screen.getByRole('link', { name: /My Logs|📚/ })).toBeInTheDocument();
    
    // ログアウトボタンが表示されていることを確認
    expect(screen.getByRole('button', { name: /Logout|🚪/ })).toBeInTheDocument();
    
    // ログインボタンが表示されていないことを確認
    expect(screen.queryByRole('link', { name: /Login|🔑/ })).not.toBeInTheDocument();
  });

  it('should always show navigation to Logs page', async () => {
    // 未ログイン時
    mockUseAuth.isAuthenticated = false;
    const { rerender } = renderWithRouter();
    
    await waitFor(() => {
      const logsLinks = screen.getAllByRole('link', { name: /Logs|📝/ });
      const logsLink = logsLinks.find((link) => link.getAttribute('href') === '/logs');
      expect(logsLink).toBeInTheDocument();
      expect(logsLink).toHaveAttribute('href', '/logs');
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
      const logsLinks = screen.getAllByRole('link', { name: /Logs|📝/ });
      const logsLink = logsLinks.find((link) => link.getAttribute('href') === '/logs');
      expect(logsLink).toBeInTheDocument();
      expect(logsLink).toHaveAttribute('href', '/logs');
    });
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
