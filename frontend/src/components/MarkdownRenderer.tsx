import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // Configure marked for GitHub Flavored Markdown
  marked.setOptions({
    gfm: true,
    breaks: true,
  });

  const rawMarkup = marked.parse(content);
  const sanitizedMarkup = DOMPurify.sanitize(rawMarkup as string);

  return (
    <div
      className={`prose prose-gray max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedMarkup }}
    />
  );
}
