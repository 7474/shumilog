import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { TagForm } from '../../src/components/TagForm';
import { Tag } from '../../src/models';

// Mock the API service using vi.hoisted to ensure mocks are available
const { mockPOST, mockPUT } = vi.hoisted(() => ({
  mockPOST: vi.fn(),
  mockPUT: vi.fn(),
}));

vi.mock('../../src/services/api', () => ({
  api: {
    POST: mockPOST,
    PUT: mockPUT,
  },
}));

describe('TagForm', () => {
  const mockOnSuccess = vi.fn();

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should render create form correctly', () => {
    mockPOST.mockResolvedValue({ data: { id: '1', name: 'New Tag' }, error: undefined });
    render(<TagForm onSuccess={mockOnSuccess} />);
    expect(screen.getByLabelText(/タグ名/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/説明/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /タグを作成/i })).toBeInTheDocument();
  });

  it('should render edit form correctly', () => {
    mockPUT.mockResolvedValue({ data: { id: '1', name: 'Updated Tag' }, error: undefined });
    const tag: Tag = {
      id: '1',
      name: 'Test Tag',
      description: 'Test description',
      created_by: 'user1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    render(<TagForm tag={tag} onSuccess={mockOnSuccess} />);
    expect(screen.getByLabelText(/タグ名/i)).toHaveValue('Test Tag');
    expect(screen.getByLabelText(/説明/i)).toHaveValue('Test description');
    expect(screen.getByRole('button', { name: /タグを更新/i })).toBeInTheDocument();
  });

  it('should call createTag on form submission for new tag', async () => {
    mockPOST.mockResolvedValue({ data: { id: '1', name: 'New Tag' }, error: undefined });
    render(<TagForm onSuccess={mockOnSuccess} />);

    fireEvent.change(screen.getByLabelText(/タグ名/i), { target: { value: 'New Tag' } });
    fireEvent.click(screen.getByRole('button', { name: /タグを作成/i }));

    await waitFor(() => {
      expect(mockPOST).toHaveBeenCalledWith('/tags', {
        body: { name: 'New Tag', description: '' },
      });
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should call updateTag on form submission for existing tag', async () => {
    const tag: Tag = {
      id: '1',
      name: 'Old Tag',
      created_by: 'user1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    mockPUT.mockResolvedValue({ data: { id: '1', name: 'Updated Tag' }, error: undefined });
    render(<TagForm tag={tag} onSuccess={mockOnSuccess} />);

    fireEvent.change(screen.getByLabelText(/タグ名/i), { target: { value: 'Updated Tag' } });
    fireEvent.click(screen.getByRole('button', { name: /タグを更新/i }));

    await waitFor(() => {
      expect(mockPUT).toHaveBeenCalledWith('/tags/{tagId}', {
        params: { path: { tagId: '1' } },
        body: { name: 'Updated Tag', description: '' },
      });
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should show validation error for empty name', async () => {
    mockPOST.mockResolvedValue({ data: { id: '1', name: 'New Tag' }, error: undefined });
    render(<TagForm onSuccess={mockOnSuccess} />);
    fireEvent.click(screen.getByRole('button', { name: /タグを作成/i }));

    await waitFor(() => {
      expect(screen.getByText(/Tag name is required/i)).toBeInTheDocument();
    });
  });
});
