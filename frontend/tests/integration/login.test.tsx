import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

import { LoginPage } from '@/pages/LoginPage';
import { LogsPage } from '@/pages/LogsPage';

// Import the mock controllers from our central setup file using a relative path
import { mockApi, mockUseAuth } from '../mocks/setup';

const renderWithRouter = (initialEntries: string[]) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={mockUseAuth.isAuthenticated ? <LogsPage /> : <LoginPage />} />
        <Route path="login" element={<LoginPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Login Flow Integration Test', () => {
  // Reset mocks before each test to ensure a clean state
  beforeEach(() => {
    mockApi.GET.mockClear();
    mockUseAuth.login.mockClear();
    // Reset auth state to default
    mockUseAuth.isAuthenticated = false;
    mockUseAuth.isLoading = false;
    mockUseAuth.user = undefined;
  });

  afterEach(() => {
    // Restore all mocks to their original implementation
    mockApi.GET.mockRestore();
    mockUseAuth.login.mockRestore();
  });

  it('should show login page if not authenticated', async () => {
    mockUseAuth.isAuthenticated = false;
    renderWithRouter(['/']);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /X \(Twitter\) でログイン/i })).toBeInTheDocument();
    });
  });

  it('should show dashboard with no logs message if authenticated', async () => {
    // 1. Setup Auth State
    mockUseAuth.isAuthenticated = true;
    mockUseAuth.user = { id: '1', name: 'Test User' };

    // 2. Setup API Mock
    mockApi.GET.mockResolvedValue({
      data: { items: [] },
      error: undefined,
    });

    // 3. Render
    renderWithRouter(['/']);

    // 4. Assert
    await waitFor(() => {
      expect(screen.getByText('まだログがありません')).toBeInTheDocument();
    });
    expect(mockApi.GET).toHaveBeenCalledTimes(1);
  });

  it('should call login function on button click', async () => {
    const user = userEvent.setup();
    mockUseAuth.isAuthenticated = false;

    // Mock window.location.href
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { ...originalLocation, href: '' };

    renderWithRouter(['/login']);

    const loginButton = await screen.findByRole('button', { name: /X \(Twitter\) でログイン/i });
    await user.click(loginButton);

    await waitFor(() => {
      expect(window.location.href).toContain('/api/auth/twitter');
    });

    // Restore original location
    window.location = originalLocation;
  });
});
