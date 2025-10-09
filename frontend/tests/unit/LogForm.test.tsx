import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LogForm } from '@/components/LogForm';
import { useAuth } from '@/hooks/useAuth';

const { mockPOST, mockPUT } = vi.hoisted(() => {
  return {
    mockPOST: vi.fn(),
    mockPUT: vi.fn(),
  };
});

// Mock the useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock the API service
vi.mock('@/services/api', () => ({
  api: {
    POST: mockPOST,
    PUT: mockPUT,
  },
}));

describe('LogForm', () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    // Provide a mock implementation for useAuth
    (useAuth as vi.Mock).mockReturnValue({
      user: { id: 'user-1', name: 'Test User' },
      isLoading: false,
    });

    // Reset mocks before each test
    vi.clearAllMocks();

    // Mock implementations to return a successful response
    mockPOST.mockImplementation(async () => {
      return {
        data: { id: 'new-log-id', title: 'New Log Title' },
        error: undefined,
        response: new Response(JSON.stringify({ id: 'new-log-id', title: 'New Log Title' }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      };
    });

    mockPUT.mockImplementation(async () => {
      return {
        data: { id: 'log-1', title: 'Updated Log Title' },
        error: undefined,
        response: new Response(JSON.stringify({ id: 'log-1', title: 'Updated Log Title' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      };
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('should render create form correctly', () => {
    render(
      <MemoryRouter>
        <LogForm onSuccess={mockOnSuccess} />
      </MemoryRouter>
    );
    expect(screen.getByPlaceholderText('ログのタイトルを入力してください...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('趣味の体験を詳しく記録しましょう...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ログを作成/i })).toBeInTheDocument();
  });

  it('should render edit form correctly with initial values', () => {
    const log = {
      id: 'log-1',
      title: 'Existing Log',
      content_md: 'Log content',
      is_public: false,
      user_id: 'user-1',
      created_at: '',
      updated_at: '',
    };
    render(
      <MemoryRouter>
        <LogForm log={log} onSuccess={mockOnSuccess} />
      </MemoryRouter>
    );
    expect(screen.getByDisplayValue('Existing Log')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Log content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ログを更新/i })).toBeInTheDocument();
  });

  it('should call api.POST on form submission for new log', async () => {
    render(
      <MemoryRouter>
        <LogForm onSuccess={mockOnSuccess} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('ログのタイトルを入力してください...'), {
      target: { value: 'New Log Title' },
    });
    fireEvent.change(screen.getByPlaceholderText('趣味の体験を詳しく記録しましょう...'), {
      target: { value: 'New content.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /ログを作成/i }));

    await waitFor(() => {
      expect(mockPOST).toHaveBeenCalledWith('/logs', {
        body: {
          title: 'New Log Title',
          content_md: 'New content.',
        },
      });
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should call api.logs[":id"].$put on form submission for existing log', async () => {
    const log = {
      id: 'log-1',
      title: 'Existing Log',
      content_md: 'Log content',
      is_public: false,
      user_id: 'user-1',
      created_at: '',
      updated_at: '',
    };
    render(
      <MemoryRouter>
        <LogForm log={log} onSuccess={mockOnSuccess} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('ログのタイトルを入力してください...'), {
      target: { value: 'Updated Log Title' },
    });
    fireEvent.click(screen.getByRole('button', { name: /ログを更新/i }));

    await waitFor(() => {
      expect(mockPUT).toHaveBeenCalledWith('/logs/{id}', {
        params: { path: { id: 'log-1' } },
        body: {
          title: 'Updated Log Title',
          content_md: 'Log content',
        },
      });
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});
