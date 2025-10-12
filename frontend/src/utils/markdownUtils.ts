/**
 * マークダウンからHTMLコメントを除去
 * AI生成コンテンツなどのメタ情報を含むHTMLコメントをサマリ表示時に除外する
 */
export function removeHtmlComments(markdown: string): string {
  // HTMLコメント（<!-- ... -->）を除去
  return markdown.replace(/<!--[\s\S]*?-->/g, '');
}

/**
 * マークダウンコンテンツからサマリテキストを生成
 * HTMLコメントを除去し、指定された長さまで切り詰める
 */
export function getMarkdownSummary(markdown: string, maxLength: number = 150): string {
  // HTMLコメントを除去
  const cleanedMarkdown = removeHtmlComments(markdown);
  
  // 前後の空白を削除
  const trimmedMarkdown = cleanedMarkdown.trim();
  
  // 指定された長さまで切り詰め
  if (trimmedMarkdown.length <= maxLength) {
    return trimmedMarkdown;
  }
  
  return trimmedMarkdown.substring(0, maxLength) + '...';
}
