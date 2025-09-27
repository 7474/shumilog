import { vi } from 'vitest';

// 1. Create a mock object for the API
export const mockApi = {
  logs: {
    $get: vi.fn(),
    ':id': {
      $delete: vi.fn(),
    },
  },
  tags: {
    $get: vi.fn(),
  },
};

// 2. Mock the entire API service module
vi.mock('@/services/api', () => ({
  api: mockApi,
  client: {
    api: mockApi,
  },
}));

// 3. Create a mock for the useAuth hook's return value
export const mockUseAuth: {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { id: string; name: string } | undefined;
  login: vi.Mock;
  logout: vi.Mock;
} = {
  isAuthenticated: false,
  isLoading: false,
  user: undefined,
  login: vi.fn(),
  logout: vi.fn(),
};

// 4. Mock the useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth,
}));
