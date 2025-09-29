import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { TagForm } from '../../src/components/TagForm';
import { Tag } from '../../src/models';

// Mock the API service
const mockCreateTag = vi.fn();
const mockUpdateTag = vi.fn();
vi.mock('../../src/services/api', () => ({
  api: {
    tags: {
      $post: (args: { json: any }) => {
        return Promise.resolve(new Response(JSON.stringify(mockCreateTag(args.json)), { status: 200 }));
      },
      ':id': {
        $put: (args: { param: { id: string }, json: any }) => {
          return Promise.resolve(new Response(JSON.stringify(mockUpdateTag(args.param.id, args.json)), { status: 200 }));
        }
      }
    }
  }
}));

describe('TagForm', () => {
  const mockOnSuccess = vi.fn();

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should render create form correctly', () => {
    render(<TagForm onSuccess={mockOnSuccess} />);
    expect(screen.getByLabelText(/Tag Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create/i })).toBeInTheDocument();
  });

  it('should render edit form correctly', () => {
    const tag: Tag = { 
      id: '1', 
      name: 'Test Tag', 
      description: 'Test description',
      created_by: 'user1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };
    render(<TagForm tag={tag} onSuccess={mockOnSuccess} />);
    expect(screen.getByLabelText(/Tag Name/i)).toHaveValue('Test Tag');
    expect(screen.getByLabelText(/Description/i)).toHaveValue('Test description');
    expect(screen.getByRole('button', { name: /Update/i })).toBeInTheDocument();
  });

  it('should call createTag on form submission for new tag', async () => {
    mockCreateTag.mockResolvedValue({ id: '1', name: 'New Tag' });
    render(<TagForm onSuccess={mockOnSuccess} />);
    
    fireEvent.change(screen.getByLabelText(/Tag Name/i), { target: { value: 'New Tag' } });
    fireEvent.click(screen.getByRole('button', { name: /Create/i }));

    await waitFor(() => {
      expect(mockCreateTag).toHaveBeenCalledWith({ name: 'New Tag', description: '' });
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should call updateTag on form submission for existing tag', async () => {
    const tag: Tag = { 
      id: '1', 
      name: 'Old Tag',
      created_by: 'user1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };
    mockUpdateTag.mockResolvedValue({ id: '1', name: 'Updated Tag' });
    render(<TagForm tag={tag} onSuccess={mockOnSuccess} />);
    
    fireEvent.change(screen.getByLabelText(/Tag Name/i), { target: { value: 'Updated Tag' } });
    fireEvent.click(screen.getByRole('button', { name: /Update/i }));

    await waitFor(() => {
      expect(mockUpdateTag).toHaveBeenCalledWith('1', { name: 'Updated Tag', description: '' });
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should show validation error for empty name', async () => {
    render(<TagForm onSuccess={mockOnSuccess} />);
    fireEvent.click(screen.getByRole('button', { name: /Create/i }));

    await waitFor(() => {
      expect(screen.getByText(/Tag name is required/i)).toBeInTheDocument();
    });
  });
});

