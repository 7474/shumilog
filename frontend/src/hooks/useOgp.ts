import { useEffect } from 'react';

export interface OgpOptions {
  title: string;
  description: string;
  url: string;
  image?: string;
  type?: 'website' | 'article';
}

/**
 * OGPメタタグを設定するカスタムフック
 * SSRと同じ内容をCSR時にも提供します
 */
export function useOgp(options: OgpOptions) {
  const { title, description, url, image, type = 'website' } = options;
  const siteName = 'Shumilog';

  // 説明文を200文字に切り詰め
  const truncatedDesc = description.length > 200 
    ? description.substring(0, 197) + '...' 
    : description;

  useEffect(() => {
    // ページタイトルを設定
    document.title = `${title} - ${siteName}`;

    // 既存のメタタグを削除して新しいものを設定する関数
    const setMetaTag = (property: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${property}"]`) as HTMLMetaElement;
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, property);
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', content);
    };

    // 基本メタタグ
    setMetaTag('title', title);
    setMetaTag('description', truncatedDesc);

    // Open Graph メタタグ
    setMetaTag('og:type', type, true);
    setMetaTag('og:url', url, true);
    setMetaTag('og:title', title, true);
    setMetaTag('og:description', truncatedDesc, true);
    setMetaTag('og:site_name', siteName, true);
    
    if (image) {
      setMetaTag('og:image', image, true);
    }

    // Twitter Card メタタグ
    setMetaTag('twitter:card', image ? 'summary_large_image' : 'summary', true);
    setMetaTag('twitter:url', url, true);
    setMetaTag('twitter:title', title, true);
    setMetaTag('twitter:description', truncatedDesc, true);
    
    if (image) {
      setMetaTag('twitter:image', image, true);
    }

    // クリーンアップ関数は不要（他のページが上書きする）
  }, [title, description, url, image, type, truncatedDesc, siteName]);
}

/**
 * Markdownからプレーンテキストを抽出する関数
 * SSRの extractPlainText と同じロジック
 */
export function extractPlainText(markdown: string, maxLength = 200): string {
  let text = markdown
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length > maxLength) {
    text = text.substring(0, maxLength - 3) + '...';
  }

  return text;
}
