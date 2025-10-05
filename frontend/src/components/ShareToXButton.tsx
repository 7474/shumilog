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
  disabled = false
}: ShareToXButtonProps) {
  const handleShare = () => {
    // X (Twitter) の投稿インテントURLを生成
    const params = new URLSearchParams();
    
    // テキストをエンコード
    let shareText = text;
    if (url) {
      shareText += `\n${url}`;
    }
    if (hashtags.length > 0) {
      shareText += '\n' + hashtags.map(tag => `#${tag}`).join(' ');
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
