import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

import App from '@/App';
import { LoginPage } from '@/pages/LoginPage';
import { LogsPage } from '@/pages/LogsPage';

// Import the mock controllers from our central setup file using a relative path
import { mockApi, mockUseAuth } from '../mocks/setup';

const renderWithRouter = (initialEntries: string[]) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={mockUseAuth.isAuthenticated ? <LogsPage /> : <LoginPage />} />
          <Route path="login" element={<LoginPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
};

describe('Login Flow Integration Test', () => {
  // Reset mocks before each test to ensure a clean state
  beforeEach(() => {
    mockApi.logs.$get.mockClear();
    mockUseAuth.login.mockClear();
    // Reset auth state to default
    mockUseAuth.isAuthenticated = false;
    mockUseAuth.isLoading = false;
    mockUseAuth.user = undefined;
  });

  afterEach(() => {
    // Restore all mocks to their original implementation
    mockApi.logs.$get.mockRestore();
    mockUseAuth.login.mockRestore();
  });

  it('should show login page if not authenticated', async () => {
    mockUseAuth.isAuthenticated = false;
    renderWithRouter(['/']);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Login with Twitter/i })).toBeInTheDocument();
    });
  });

  it('should show dashboard with no logs message if authenticated', async () => {
    // 1. Setup Auth State
    mockUseAuth.isAuthenticated = true;
    mockUseAuth.user = { id: '1', name: 'Test User' };

    // 2. Setup API Mock
    mockApi.logs.$get.mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    // 3. Render
    renderWithRouter(['/']);

    // 4. Assert
    await waitFor(() => {
      expect(screen.getByText(/No logs found/i)).toBeInTheDocument();
    });
    expect(mockApi.logs.$get).toHaveBeenCalledTimes(1);
  });

  it('should call login function on button click', async () => {
    const user = userEvent.setup();
    mockUseAuth.isAuthenticated = false;
    renderWithRouter(['/login']);

    const loginButton = await screen.findByRole('button', { name: /Login with Twitter/i });
    await user.click(loginButton);

    await waitFor(() => {
      expect(mockUseAuth.login).toHaveBeenCalled();
    });
  });
});
