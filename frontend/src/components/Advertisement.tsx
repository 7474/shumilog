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
  creditText?: string | null;
}

/**
 * 広告表示コンポーネント
 * ログまたはタグに関連する広告を表示します
 */
export function Advertisement({ advertisements, creditText }: AdvertisementProps) {
  if (!advertisements || advertisements.length === 0) {
    return null; // 広告がない場合は何も表示しない
  }

  return (
    <div className="my-4 border-t border-gray-200 pt-4">
      <h3 className="text-sm font-medium text-gray-500 mb-2">広告</h3>
      <div className="overflow-x-auto">
        <div className="flex gap-4 pb-2" style={{ width: 'max-content' }}>
          {advertisements.map((ad) => (
            <a
              key={ad.productId}
              href={ad.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-[125px] border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="w-[125px] h-[200px] bg-gray-100">
                <img
                  src={ad.imageUrl}
                  alt={ad.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-2">
                <h4 className="text-xs font-medium line-clamp-2 mb-1">{ad.title}</h4>
                {ad.serviceName && (
                  <p className="text-xs text-gray-500 mt-1">{ad.serviceName}</p>
                )}
              </div>
            </a>
          ))}
        </div>
      </div>
      <div className="mt-0 text-center">
        {creditText && (
          <p
            className="text-xs text-gray-400 mt-1"
            dangerouslySetInnerHTML={{ __html: creditText }}
          />
        )}
      </div>
    </div>
  );
}
