import { LogImage } from '@/api-types';

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
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">添付画像</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((image) => (
          <div key={image.id} className="group relative">
            <a
              href={`${baseUrl}/logs/${logId}/images/${image.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-lg border border-gray-200 hover:border-fresh-500 transition-colors"
            >
              <img
                src={`${baseUrl}/logs/${logId}/images/${image.id}`}
                alt={image.file_name}
                className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
              />
            </a>
            <p className="mt-2 text-sm text-gray-600 truncate" title={image.file_name}>
              {image.file_name}
            </p>
            {image.width && image.height && (
              <p className="text-xs text-gray-500">
                {image.width} × {image.height}px
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
