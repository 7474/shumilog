import { RefObject } from 'react';
import { Bold, Italic, Strikethrough, Hash, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MarkdownToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement>;
  onValueChange: (value: string) => void;
  getValue: () => string;
}

/**
 * Markdown編集用ツールバーコンポーネント
 * 選択範囲やキャレット位置に対してマークダウン記法を適用できる
 */
export function MarkdownToolbar({ textareaRef, onValueChange, getValue }: MarkdownToolbarProps) {
  /**
   * 選択範囲を指定のマークダウン記法で囲む
   */
  const wrapSelection = (prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = getValue();
    const selectedText = currentValue.substring(start, end);

    // 選択範囲がない場合はプレースホルダーテキストを使用
    const textToWrap = selectedText || 'テキスト';
    const newText = prefix + textToWrap + suffix;
    const newValue = currentValue.substring(0, start) + newText + currentValue.substring(end);

    onValueChange(newValue);

    // テキストエリアにフォーカスして、挿入されたテキストを選択
    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        // 元々選択されていた場合は、囲んだ後の内側のテキストを選択
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
      } else {
        // 選択がなかった場合は、プレースホルダーテキストを選択
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + textToWrap.length);
      }
    }, 0);
  };

  /**
   * キャレット位置にテキストを挿入
   */
  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = getValue();

    // 改行を考慮して挿入
    let insertText = text;
    // カーソルが行の途中にある場合は前に改行を追加
    if (start > 0 && currentValue[start - 1] !== '\n') {
      insertText = '\n' + insertText;
    }
    // 挿入後に改行を追加
    if (end < currentValue.length && currentValue[end] !== '\n') {
      insertText = insertText + '\n';
    }

    const newValue = currentValue.substring(0, start) + insertText + currentValue.substring(end);
    onValueChange(newValue);

    // カーソルを挿入テキストの後ろに移動
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + insertText.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  /**
   * 太字を適用
   */
  const handleBold = () => {
    wrapSelection('**', '**');
  };

  /**
   * 斜体を適用
   */
  const handleItalic = () => {
    wrapSelection('*', '*');
  };

  /**
   * 取消線を適用
   */
  const handleStrikethrough = () => {
    wrapSelection('~~', '~~');
  };

  /**
   * ハッシュタグ化
   */
  const handleHashtag = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = getValue();
    const selectedText = currentValue.substring(start, end);

    if (!selectedText) {
      // 選択がない場合はプレースホルダーを使用
      wrapSelection('#', '');
      return;
    }

    // 選択範囲の前に#があるかチェック
    const hasHashBefore = start > 0 && currentValue[start - 1] === '#';

    if (hasHashBefore) {
      // すでに#がある場合は何もしない、または#を削除
      return;
    }

    // 選択範囲の前に#を追加
    const newValue = currentValue.substring(0, start) + '#' + selectedText + currentValue.substring(end);
    onValueChange(newValue);

    setTimeout(() => {
      textarea.focus();
      // #を含めて選択
      textarea.setSelectionRange(start, end + 1);
    }, 0);
  };

  /**
   * 水平線を挿入
   */
  const handleHorizontalRule = () => {
    insertAtCursor('---');
  };

  return (
    <div className="flex items-center gap-1 p-2 border border-gray-200 rounded-lg bg-gray-50">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleBold}
        title="太字 (Ctrl+B)"
        className="h-8 w-8 hover:bg-gray-200"
      >
        <Bold size={16} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleItalic}
        title="斜体 (Ctrl+I)"
        className="h-8 w-8 hover:bg-gray-200"
      >
        <Italic size={16} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleStrikethrough}
        title="取消線"
        className="h-8 w-8 hover:bg-gray-200"
      >
        <Strikethrough size={16} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleHashtag}
        title="ハッシュタグ化"
        className="h-8 w-8 hover:bg-gray-200"
      >
        <Hash size={16} />
      </Button>
      <div className="w-px h-6 bg-gray-300 mx-1" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleHorizontalRule}
        title="水平線を挿入"
        className="h-8 w-8 hover:bg-gray-200"
      >
        <Minus size={16} />
      </Button>
    </div>
  );
}
