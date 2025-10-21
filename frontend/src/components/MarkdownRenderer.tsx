import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Tag } from '@/api-types';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  tags?: Tag[];
}

/**
 * カスタムレンダラー: ハッシュタグをタグ詳細ページへのリンクに変換
 */
function createHashtagRenderer() {
  const renderer = new marked.Renderer();

  renderer.text = (textToken) => {
    let text = typeof textToken === 'string' ? textToken : textToken.text;

    // Pattern 1: #{tagName} - 拡張形式（空白を含むタグ名）
    text = text.replace(/#\{([^}]+)\}/g, (match, tagName) => {
      const trimmedName = tagName.trim();
      return `<a href="/tags/${encodeURIComponent(trimmedName)}" class="hashtag-link">${match}</a>`;
    });

    // Pattern 2: #tagName - シンプル形式（空白なし）
    // 空白文字以外のすべての文字を抽出（ピリオド、記号、句読点など全て含む）
    // 空白文字（スペース、タブ、改行など）でハッシュタグが終端
    // `{`, `}`, `#` を除外（拡張フォーマット `#{...}` およびMarkdown見出しとの競合を回避）
    text = text.replace(
      /#([^\s{}#]+)/g,
      (match, tagName) => {
        const trimmedName = tagName.trim();
        return `<a href="/tags/${encodeURIComponent(trimmedName)}" class="hashtag-link">${match}</a>`;
      }
    );

    return text;
  };

  return renderer;
}

export function MarkdownRenderer({ content, className = '', tags: _tags }: MarkdownRendererProps) {
  // Configure marked for GitHub Flavored Markdown with custom renderer
  marked.setOptions({
    gfm: true,
    breaks: true,
    renderer: createHashtagRenderer(),
  });

  const rawMarkup = marked.parse(content);
  const sanitizedMarkup = DOMPurify.sanitize(rawMarkup as string, {
    ADD_ATTR: ['target'], // Allow target attribute for links
  });

  return (
    <div
      className={`prose prose-gray max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedMarkup }}
    />
  );
}
