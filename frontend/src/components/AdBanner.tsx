import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface AdBannerProps {
  /**
   * 広告の種類
   * - 'horizontal': 横長バナー（記事下部など）
   * - 'square': 正方形（サイドバーなど）
   * - 'vertical': 縦長（サイドバーなど）
   */
  format?: 'horizontal' | 'square' | 'vertical';
  
  /**
   * 広告スロットID（Google AdSense などで使用）
   */
  slotId?: string;
  
  /**
   * 広告のラベル表示
   */
  showLabel?: boolean;
  
  /**
   * カスタムクラス
   */
  className?: string;
}

/**
 * 広告バナーコンポーネント
 * 
 * Google AdSense やその他の広告ネットワークに対応できるよう設計。
 * 現在は広告スペースのプレースホルダーとして機能し、
 * 実際の広告スクリプトは環境変数で制御可能。
 */
export function AdBanner({ 
  format = 'horizontal', 
  slotId,
  showLabel = true,
  className = ''
}: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null);
  
  // 環境変数で広告が有効かチェック
  const isAdEnabled = import.meta.env.VITE_ADS_ENABLED === 'true';
  
  useEffect(() => {
    if (!isAdEnabled || !adRef.current) {
      return;
    }
    
    // ここに実際の広告スクリプト（Google AdSense など）の初期化コードを追加
    // 例: Google AdSense の場合
    // const adClientId = import.meta.env.VITE_ADSENSE_CLIENT_ID;
    // (window.adsbygoogle = window.adsbygoogle || []).push({});
    
  }, [isAdEnabled]);
  
  // 広告が無効の場合は何も表示しない
  if (!isAdEnabled) {
    return null;
  }
  
  // フォーマットに応じたスタイルクラス
  const formatClasses = {
    horizontal: 'w-full min-h-[90px] max-h-[250px]',
    square: 'w-full aspect-square max-w-[300px] mx-auto',
    vertical: 'w-full min-h-[600px] max-w-[300px] mx-auto',
  };
  
  return (
    <Card className={`overflow-hidden border-gray-200 bg-gray-50 ${className}`}>
      <CardContent className="p-3">
        {showLabel && (
          <div className="text-xs text-gray-500 mb-2 text-center">
            スポンサー
          </div>
        )}
        <div
          ref={adRef}
          className={`${formatClasses[format]} flex items-center justify-center bg-white border border-dashed border-gray-300 rounded`}
          data-ad-slot={slotId}
        >
          {/* 広告プレースホルダー */}
          <div className="text-center text-gray-400 text-sm p-4">
            <p>広告スペース</p>
            {slotId && (
              <p className="text-xs mt-1 text-gray-300">Slot: {slotId}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
