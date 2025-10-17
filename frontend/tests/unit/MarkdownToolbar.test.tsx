import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { MarkdownToolbar } from '@/components/MarkdownToolbar';

// テスト用のラッパーコンポーネント
function TestWrapper() {
  const [value, setValue] = useState('サンプルテキスト');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div>
      <MarkdownToolbar
        textareaRef={textareaRef}
        onValueChange={setValue}
        getValue={() => value}
      />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        data-testid="textarea"
      />
    </div>
  );
}

describe('MarkdownToolbar', () => {
  it('should render all toolbar buttons', () => {
    render(<TestWrapper />);

    // すべてのボタンが表示されることを確認
    expect(screen.getByTitle('太字 (Ctrl+B)')).toBeInTheDocument();
    expect(screen.getByTitle('斜体 (Ctrl+I)')).toBeInTheDocument();
    expect(screen.getByTitle('取消線')).toBeInTheDocument();
    expect(screen.getByTitle('ハッシュタグ化')).toBeInTheDocument();
    expect(screen.getByTitle('水平線を挿入')).toBeInTheDocument();
  });

  it('should apply bold formatting to selected text', async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
    const boldButton = screen.getByTitle('太字 (Ctrl+B)');

    // テキストを選択 - "サンプル" の文字数は4文字
    textarea.focus();
    textarea.setSelectionRange(0, 4); // "サンプル" を選択

    // 太字ボタンをクリック
    await user.click(boldButton);

    // 選択されたテキストが**で囲まれることを確認
    expect(textarea.value).toBe('**サンプル**テキスト');
  });

  it('should apply italic formatting to selected text', async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
    const italicButton = screen.getByTitle('斜体 (Ctrl+I)');

    // テキストを選択 - "サンプル" の文字数は4文字
    textarea.focus();
    textarea.setSelectionRange(0, 4); // "サンプル" を選択

    // 斜体ボタンをクリック
    await user.click(italicButton);

    // 選択されたテキストが*で囲まれることを確認
    expect(textarea.value).toBe('*サンプル*テキスト');
  });

  it('should apply strikethrough formatting to selected text', async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
    const strikethroughButton = screen.getByTitle('取消線');

    // テキストを選択 - "サンプル" の文字数は4文字
    textarea.focus();
    textarea.setSelectionRange(0, 4); // "サンプル" を選択

    // 取消線ボタンをクリック
    await user.click(strikethroughButton);

    // 選択されたテキストが~~で囲まれることを確認
    expect(textarea.value).toBe('~~サンプル~~テキスト');
  });

  it('should add hashtag to selected text', async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
    const hashtagButton = screen.getByTitle('ハッシュタグ化');

    // テキストを選択 - "サンプル" の文字数は4文字
    textarea.focus();
    textarea.setSelectionRange(0, 4); // "サンプル" を選択

    // ハッシュタグボタンをクリック
    await user.click(hashtagButton);

    // 選択されたテキストの前に#が追加され、後ろにスペースが追加されることを確認
    expect(textarea.value).toBe('#サンプル テキスト');
  });

  it('should insert horizontal rule at cursor position', async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
    const hrButton = screen.getByTitle('水平線を挿入');

    // カーソル位置を設定 - "サンプル" の後ろは4文字目
    textarea.focus();
    textarea.setSelectionRange(4, 4); // "サンプル" の後ろ

    // 水平線ボタンをクリック
    await user.click(hrButton);

    // 水平線が挿入されることを確認
    expect(textarea.value).toContain('---');
  });

  it('should insert placeholder text when no text is selected for bold', async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
    const boldButton = screen.getByTitle('太字 (Ctrl+B)');

    // カーソルを最後に移動（選択なし） - "サンプルテキスト" は8文字
    textarea.focus();
    textarea.setSelectionRange(8, 8);

    // 太字ボタンをクリック
    await user.click(boldButton);

    // プレースホルダーテキストが挿入されることを確認
    expect(textarea.value).toContain('**テキスト**');
  });

  it('should insert placeholder text when no text is selected for italic', async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
    const italicButton = screen.getByTitle('斜体 (Ctrl+I)');

    // カーソルを最後に移動（選択なし） - "サンプルテキスト" は8文字
    textarea.focus();
    textarea.setSelectionRange(8, 8);

    // 斜体ボタンをクリック
    await user.click(italicButton);

    // プレースホルダーテキストが挿入されることを確認
    expect(textarea.value).toContain('*テキスト*');
  });

  it('should insert placeholder text when no text is selected for strikethrough', async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
    const strikethroughButton = screen.getByTitle('取消線');

    // カーソルを最後に移動（選択なし） - "サンプルテキスト" は8文字
    textarea.focus();
    textarea.setSelectionRange(8, 8);

    // 取消線ボタンをクリック
    await user.click(strikethroughButton);

    // プレースホルダーテキストが挿入されることを確認
    expect(textarea.value).toContain('~~テキスト~~');
  });

  it('should insert placeholder for hashtag when no text is selected', async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
    const hashtagButton = screen.getByTitle('ハッシュタグ化');

    // カーソルを最後に移動（選択なし） - "サンプルテキスト" は8文字
    textarea.focus();
    textarea.setSelectionRange(8, 8);

    // ハッシュタグボタンをクリック
    await user.click(hashtagButton);

    // プレースホルダーテキストが挿入されることを確認
    expect(textarea.value).toContain('#テキスト');
  });

  it('should trim whitespace when adding hashtag', async () => {
    const user = userEvent.setup();
    
    // ラッパーコンポーネントを空白を含むテキストで初期化
    function TestWrapperWithSpaces() {
      const [value, setValue] = useState('  サンプル  テキスト');
      const textareaRef = useRef<HTMLTextAreaElement>(null);

      return (
        <div>
          <MarkdownToolbar
            textareaRef={textareaRef}
            onValueChange={setValue}
            getValue={() => value}
          />
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            data-testid="textarea"
          />
        </div>
      );
    }

    render(<TestWrapperWithSpaces />);

    const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
    const hashtagButton = screen.getByTitle('ハッシュタグ化');

    textarea.focus();
    textarea.setSelectionRange(0, 6); // "  サンプル" を選択（前後に空白）

    // ハッシュタグボタンをクリック
    await user.click(hashtagButton);

    // 空白がトリミングされてハッシュタグが追加されることを確認
    expect(textarea.value).toBe('  #サンプル  テキスト');
  });

  it('should not add space after hashtag if followed by newline', async () => {
    const user = userEvent.setup();
    
    // ラッパーコンポーネントを改行を含むテキストで初期化
    function TestWrapperWithNewline() {
      const [value, setValue] = useState('サンプル\nテキスト');
      const textareaRef = useRef<HTMLTextAreaElement>(null);

      return (
        <div>
          <MarkdownToolbar
            textareaRef={textareaRef}
            onValueChange={setValue}
            getValue={() => value}
          />
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            data-testid="textarea"
          />
        </div>
      );
    }

    render(<TestWrapperWithNewline />);

    const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
    const hashtagButton = screen.getByTitle('ハッシュタグ化');

    textarea.focus();
    textarea.setSelectionRange(0, 4); // "サンプル" を選択

    // ハッシュタグボタンをクリック
    await user.click(hashtagButton);

    // 改行の前にはスペースを追加しない
    expect(textarea.value).toBe('#サンプル\nテキスト');
  });

  it('should not add space after hashtag if followed by space', async () => {
    const user = userEvent.setup();
    
    // ラッパーコンポーネントをスペースを含むテキストで初期化
    function TestWrapperWithSpace() {
      const [value, setValue] = useState('サンプル テキスト');
      const textareaRef = useRef<HTMLTextAreaElement>(null);

      return (
        <div>
          <MarkdownToolbar
            textareaRef={textareaRef}
            onValueChange={setValue}
            getValue={() => value}
          />
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            data-testid="textarea"
          />
        </div>
      );
    }

    render(<TestWrapperWithSpace />);

    const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
    const hashtagButton = screen.getByTitle('ハッシュタグ化');

    textarea.focus();
    textarea.setSelectionRange(0, 4); // "サンプル" を選択

    // ハッシュタグボタンをクリック
    await user.click(hashtagButton);

    // 既にスペースがある場合は追加しない
    expect(textarea.value).toBe('#サンプル テキスト');
  });

  it('should ignore whitespace-only selection', async () => {
    const user = userEvent.setup();
    
    // ラッパーコンポーネントを複数のスペースを含むテキストで初期化
    function TestWrapperWithMultipleSpaces() {
      const [value, setValue] = useState('サンプル   テキスト');
      const textareaRef = useRef<HTMLTextAreaElement>(null);

      return (
        <div>
          <MarkdownToolbar
            textareaRef={textareaRef}
            onValueChange={setValue}
            getValue={() => value}
          />
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            data-testid="textarea"
          />
        </div>
      );
    }

    render(<TestWrapperWithMultipleSpaces />);

    const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
    const hashtagButton = screen.getByTitle('ハッシュタグ化');

    const originalValue = textarea.value;
    textarea.focus();
    textarea.setSelectionRange(4, 7); // 空白3つを選択

    // ハッシュタグボタンをクリック
    await user.click(hashtagButton);

    // 空白のみの選択は無視され、変更されないことを確認
    expect(textarea.value).toBe(originalValue);
  });
});
