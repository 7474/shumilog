import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Tag } from '@/models';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  tags?: Tag[];
}

/**
 * カスタムレンダラー: ハッシュタグをタグ詳細ページへのリンクに変換
 */
function createHashtagRenderer(tags?: Tag[]) {
  const renderer = new marked.Renderer();
  const originalText = renderer.text.bind(renderer);

  // タグ名からタグ名へのマッピングを作成（大文字小文字を区別しないため）
  const tagMap = new Map<string, string>();
  if (tags) {
    tags.forEach(tag => {
      tagMap.set(tag.name.toLowerCase(), tag.name);
    });
  }

  renderer.text = (textToken) => {
    let text = typeof textToken === 'string' ? textToken : textToken.text;
    
    // Pattern 1: #{tagName} - 拡張形式（空白を含むタグ名）
    text = text.replace(/#\{([^}]+)\}/g, (match, tagName) => {
      const trimmedName = tagName.trim();
      const actualTagName = tagMap.get(trimmedName.toLowerCase());
      
      if (actualTagName) {
        // タグが見つかった場合はタグ名でリンク
        return `<a href="/tags/${encodeURIComponent(actualTagName)}" class="hashtag-link">${match}</a>`;
      } else {
        // タグが見つからない場合は検索リンク
        return `<a href="/tags?search=${encodeURIComponent(trimmedName)}" class="hashtag-link">${match}</a>`;
      }
    });
    
    // Pattern 2: #tagName - シンプル形式（空白なし）
    text = text.replace(/#([a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF_-]+)/g, (match, tagName) => {
      const trimmedName = tagName.trim();
      const actualTagName = tagMap.get(trimmedName.toLowerCase());
      
      if (actualTagName) {
        // タグが見つかった場合はタグ名でリンク
        return `<a href="/tags/${encodeURIComponent(actualTagName)}" class="hashtag-link">${match}</a>`;
      } else {
        // タグが見つからない場合は検索リンク
        return `<a href="/tags?search=${encodeURIComponent(trimmedName)}" class="hashtag-link">${match}</a>`;
      }
    });
    
    return text;
  };

  return renderer;
}

export function MarkdownRenderer({ content, className = '', tags }: MarkdownRendererProps) {
  // Configure marked for GitHub Flavored Markdown with custom renderer
  marked.setOptions({
    gfm: true,
    breaks: true,
    renderer: createHashtagRenderer(tags),
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
