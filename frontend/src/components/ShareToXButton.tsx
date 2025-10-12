import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShareToXButtonProps {
  text: string;
  url?: string;
  hashtags?: string[];
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'link';
  disabled?: boolean;
}

/**
 * タグを正規化してハッシュタグに変換
 * - 先頭の # を削除
 * - 空白を含む場合は CamelCase に変換
 * - 空白を含まない場合はそのまま使用
 */
function normalizeHashtag(tag: string): string {
  // 先頭の # を削除
  let normalized = tag.replace(/^#+/, '');

  // 空白を含む場合は CamelCase に変換
  if (normalized.includes(' ')) {
    normalized = normalized
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  return normalized;
}

/**
 * Xへの共有ボタンコンポーネント
 * クライアントサイドでX (Twitter) の投稿画面を開きます
 */
export function ShareToXButton({
  text,
  url,
  hashtags = [],
  className = '',
  size = 'default',
  variant = 'outline',
  disabled = false,
}: ShareToXButtonProps) {
  const handleShare = () => {
    // X (Twitter) の投稿インテントURLを生成
    const params = new URLSearchParams();

    // テキストをエンコード
    let shareText = text;
    if (url) {
      shareText += `\n${url}`;
    }

    // タグは最大3つまでに制限し、正規化してハッシュタグに変換
    if (hashtags.length > 0) {
      const normalizedHashtags = hashtags
        .slice(0, 3) // 最大3つまで
        .map((tag) => `#${normalizeHashtag(tag)}`);
      shareText += '\n' + normalizedHashtags.join(' ');
    }

    params.append('text', shareText);

    // 新しいウィンドウでXの投稿画面を開く
    const shareUrl = `https://x.com/intent/post?${params.toString()}`;
    window.open(shareUrl, '_blank', 'width=550,height=420');
  };

  return (
    <Button
      onClick={handleShare}
      size={size}
      variant={variant}
      disabled={disabled}
      className={`flex items-center gap-2 ${className}`}
    >
      <Share2 size={16} />
      <span>Xで共有</span>
    </Button>
  );
}
