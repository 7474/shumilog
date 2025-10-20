interface AdvertisementItem {
  productId: string;
  title: string;
  imageUrl: string;
  affiliateUrl: string;
  price?: string | null;
  serviceName?: string | null;
}

interface AdvertisementProps {
  advertisements: AdvertisementItem[];
}

/**
 * 広告表示コンポーネント
 * ログまたはタグに関連する広告を表示します
 */
export function Advertisement({ advertisements }: AdvertisementProps) {
  if (!advertisements || advertisements.length === 0) {
    return null; // 広告がない場合は何も表示しない
  }

  return (
    <div className="my-8 border-t border-gray-200 pt-8">
      <h3 className="text-sm font-medium text-gray-500 mb-4">おすすめコンテンツ</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {advertisements.map((ad) => (
          <a
            key={ad.productId}
            href={ad.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="aspect-[3/4] bg-gray-100">
              <img
                src={ad.imageUrl}
                alt={ad.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="p-3">
              <h4 className="text-sm font-medium line-clamp-2 mb-1">{ad.title}</h4>
              {ad.price && (
                <p className="text-sm font-semibold text-blue-600">{ad.price}</p>
              )}
              {ad.serviceName && (
                <p className="text-xs text-gray-500 mt-1">{ad.serviceName}</p>
              )}
            </div>
          </a>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-4 text-center">広告</p>
    </div>
  );
}
