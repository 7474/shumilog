/**
 * Image model for user-owned images
 */

export interface Image {
  id: string;
  user_id: string;
  r2_key: string;
  file_name: string;
  content_type: string;
  file_size: number;
  width?: number;
  height?: number;
  created_at: string;
  url?: string; // Public URL for accessing the image
}

export interface LogImage extends Image {
  display_order: number; // From log_image_associations
}

export interface CreateImageData {
  file_name: string;
  content_type: string;
  file_size: number;
  width?: number;
  height?: number;
}

export class ImageModel {
  static fromRow(row: any): Image {
    return {
      id: row.id,
      user_id: row.user_id,
      r2_key: row.r2_key,
      file_name: row.file_name,
      content_type: row.content_type,
      file_size: row.file_size,
      width: row.width,
      height: row.height,
      created_at: row.created_at,
    };
  }

  static fromRowWithDisplayOrder(row: any): LogImage {
    return {
      ...ImageModel.fromRow(row),
      display_order: row.display_order || 0,
    };
  }

  static isValidContentType(contentType: string): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    return validTypes.includes(contentType.toLowerCase());
  }

  static getFileExtension(contentType: string): string {
    const extensions: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };
    return extensions[contentType.toLowerCase()] || 'jpg';
  }
}
