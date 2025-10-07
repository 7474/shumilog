import { useState, useRef } from 'react';
import { X, Upload } from 'lucide-react';
import { Button } from './ui/button';
import { normalizeImage } from '@/utils/imageNormalizer';

interface ImageUploadProps {
  logId?: string;
  onImagesChange: (files: File[]) => void;
  existingImages?: { id: string; file_name: string; url: string }[];
  onDeleteExisting?: (imageId: string) => void;
}

export function ImageUpload({ onImagesChange, existingImages, onDeleteExisting }: ImageUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Filter for image files only
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length !== files.length) {
      alert('画像ファイルのみアップロードできます');
    }

    // Validate file sizes (max 10MB each)
    const maxSize = 10 * 1024 * 1024;
    const validFiles = imageFiles.filter((file) => {
      if (file.size > maxSize) {
        alert(`${file.name} は 10MB を超えています`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // 画像を正規化（1MB以上の場合はWebPに変換してリサイズ）
    const normalizedFiles = await Promise.all(
      validFiles.map((file) => normalizeImage(file))
    );

    // Create preview URLs
    const newPreviewUrls = normalizedFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls([...previewUrls, ...newPreviewUrls]);
    
    const newFiles = [...selectedFiles, ...normalizedFiles];
    setSelectedFiles(newFiles);
    onImagesChange(newFiles);
  };

  const handleRemoveFile = (index: number) => {
    // Revoke the preview URL to free memory
    URL.revokeObjectURL(previewUrls[index]);
    
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previewUrls.filter((_, i) => i !== index);
    
    setSelectedFiles(newFiles);
    setPreviewUrls(newPreviews);
    onImagesChange(newFiles);
  };

  const handleDeleteExisting = (imageId: string) => {
    if (onDeleteExisting) {
      onDeleteExisting(imageId);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="block text-sm text-gray-600 mb-2">
          画像を追加（任意）
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900"
          >
            <Upload className="w-3.5 h-3.5" />
            画像を選択
          </Button>
          <span className="text-xs text-gray-400">
            JPEG, PNG, GIF, WebP (最大10MB)
          </span>
        </div>
      </div>

      {/* Existing images */}
      {existingImages && existingImages.length > 0 && (
        <div>
          <div className="block text-sm text-gray-600 mb-2">
            現在の画像
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {existingImages.map((image) => (
              <div key={image.id} className="relative group">
                <img
                  src={image.url}
                  alt={image.file_name}
                  className="w-full h-32 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteExisting(image.id)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="削除"
                >
                  <X className="w-4 h-4" />
                </button>
                <p className="mt-1 text-xs text-gray-500 truncate">
                  {image.file_name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview new images */}
      {previewUrls.length > 0 && (
        <div>
          <label className="block text-sm text-gray-600 mb-2">
            新しい画像 ({selectedFiles.length})
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={selectedFiles[index].name}
                  className="w-full h-32 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="削除"
                >
                  <X className="w-4 h-4" />
                </button>
                <p className="mt-1 text-xs text-gray-500 truncate">
                  {selectedFiles[index].name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
