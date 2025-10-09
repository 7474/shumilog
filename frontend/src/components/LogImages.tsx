import { LogImage } from '@/api-types';
import { getLogDetailImageUrl } from '@/utils/imageOptimizer';

interface LogImagesProps {
  logId: string;
  images: LogImage[];
}

export function LogImages({ logId, images }: LogImagesProps) {
  if (!images || images.length === 0) {
    return null;
  }

  // Use configured API base URL to ensure requests go to the correct backend
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {images.map((image) => {
        const imageUrl = `${baseUrl}/logs/${logId}/images/${image.id}`;
        return (
          <div key={image.id} className="group relative">
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-lg border border-gray-200 hover:border-fresh-500 transition-colors"
            >
              <img
                src={getLogDetailImageUrl(imageUrl)}
                alt={image.file_name}
                className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
              />
            </a>
          </div>
        );
      })}
    </div>
  );
}
