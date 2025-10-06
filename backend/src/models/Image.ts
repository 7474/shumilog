/**
 * Image model for log attachments
 */

export interface LogImage {
  id: string;
  log_id: string;
  r2_key: string;
  file_name: string;
  content_type: string;
  file_size: number;
  width?: number;
  height?: number;
  display_order: number;
  created_at: string;
  url?: string; // Public URL for accessing the image
}

export interface CreateImageData {
  file_name: string;
  content_type: string;
  file_size: number;
  width?: number;
  height?: number;
  display_order?: number;
}

export class ImageModel {
  static fromRow(row: any): LogImage {
    return {
      id: row.id,
      log_id: row.log_id,
      r2_key: row.r2_key,
      file_name: row.file_name,
      content_type: row.content_type,
      file_size: row.file_size,
      width: row.width,
      height: row.height,
      display_order: row.display_order,
      created_at: row.created_at,
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
