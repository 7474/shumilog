import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShareToXButton } from '@/components/ShareToXButton';

describe('ShareToXButton', () => {
  it('renders the share button', () => {
    render(<ShareToXButton text="Test share text" />);
    expect(screen.getByText('Xで共有')).toBeInTheDocument();
  });

  it('opens X share window with correct parameters when clicked', async () => {
    const user = userEvent.setup();
    const mockOpen = vi.fn();
    window.open = mockOpen;

    render(
      <ShareToXButton 
        text="Test content"
        url="https://example.com/log/123"
        hashtags={['test', 'hobby']}
      />
    );

    const button = screen.getByText('Xで共有');
    await user.click(button);

    expect(mockOpen).toHaveBeenCalledTimes(1);
    const callArgs = mockOpen.mock.calls[0];
    expect(callArgs[0]).toContain('https://x.com/intent/post');
    expect(callArgs[0]).toContain('Test+content');
    expect(callArgs[0]).toContain('https%3A%2F%2Fexample.com%2Flog%2F123');
    expect(callArgs[0]).toContain('%23test');
    expect(callArgs[0]).toContain('%23hobby');
  });

  it('can be disabled', () => {
    render(<ShareToXButton text="Test" disabled={true} />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<ShareToXButton text="Test" className="custom-class" />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });
});
