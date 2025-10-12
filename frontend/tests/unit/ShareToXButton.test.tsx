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

  it('limits hashtags to maximum of 3', async () => {
    const user = userEvent.setup();
    const mockOpen = vi.fn();
    window.open = mockOpen;

    render(<ShareToXButton text="Test" hashtags={['tag1', 'tag2', 'tag3', 'tag4', 'tag5']} />);

    const button = screen.getByText('Xで共有');
    await user.click(button);

    const callArgs = mockOpen.mock.calls[0];
    const url = callArgs[0];
    // Should only include first 3 tags
    expect(url).toContain('%23tag1');
    expect(url).toContain('%23tag2');
    expect(url).toContain('%23tag3');
    expect(url).not.toContain('%23tag4');
    expect(url).not.toContain('%23tag5');
  });

  it('normalizes hashtags with spaces to CamelCase', async () => {
    const user = userEvent.setup();
    const mockOpen = vi.fn();
    window.open = mockOpen;

    render(<ShareToXButton text="Test" hashtags={['attack on titan', 'my hobby']} />);

    const button = screen.getByText('Xで共有');
    await user.click(button);

    const callArgs = mockOpen.mock.calls[0];
    const url = callArgs[0];
    // Spaces should be converted to CamelCase
    expect(url).toContain('%23AttackOnTitan');
    expect(url).toContain('%23MyHobby');
  });

  it('removes leading # from hashtags', async () => {
    const user = userEvent.setup();
    const mockOpen = vi.fn();
    window.open = mockOpen;

    render(<ShareToXButton text="Test" hashtags={['#anime', '##gaming']} />);

    const button = screen.getByText('Xで共有');
    await user.click(button);

    const callArgs = mockOpen.mock.calls[0];
    const url = callArgs[0];
    // Leading # should be removed, and only one # added by the component
    expect(url).toContain('%23anime');
    expect(url).toContain('%23gaming');
    // Should not have double or triple #
    expect(url).not.toContain('%23%23');
  });

  it('handles hashtags without spaces as-is', async () => {
    const user = userEvent.setup();
    const mockOpen = vi.fn();
    window.open = mockOpen;

    render(<ShareToXButton text="Test" hashtags={['anime', 'gaming']} />);

    const button = screen.getByText('Xで共有');
    await user.click(button);

    const callArgs = mockOpen.mock.calls[0];
    const url = callArgs[0];
    expect(url).toContain('%23anime');
    expect(url).toContain('%23gaming');
  });
});
