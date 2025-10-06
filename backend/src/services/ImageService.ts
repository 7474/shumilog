/**
 * Service for managing log images with R2 storage
 */

import type { R2Bucket, R2ObjectBody } from '@cloudflare/workers-types';
import { v4 as uuidv4 } from 'uuid';
import type { Database } from '../db/database.js';
import { ImageModel, type LogImage, type CreateImageData } from '../models/Image.js';

export class ImageService {
  constructor(
    private db: Database,
    private imagesBucket: R2Bucket | null,
  ) {}

  /**
   * Upload an image and associate it with a log
   */
  async uploadImage(
    logId: string,
    file: File | Blob,
    metadata: CreateImageData,
  ): Promise<LogImage> {
    if (!this.imagesBucket) {
      throw new Error('R2 bucket not configured');
    }

    // Validate content type
    if (!ImageModel.isValidContentType(metadata.content_type)) {
      throw new Error('Invalid image type. Allowed types: JPEG, PNG, GIF, WebP');
    }

    // Generate unique ID and R2 key
    const imageId = uuidv4();
    const extension = ImageModel.getFileExtension(metadata.content_type);
    const r2Key = `logs/${logId}/${imageId}.${extension}`;

    // Upload to R2
    await this.imagesBucket.put(r2Key, file, {
      httpMetadata: {
        contentType: metadata.content_type,
      },
      customMetadata: {
        logId,
        imageId,
        fileName: metadata.file_name,
      },
    });

    // Save metadata to database
    const now = new Date().toISOString();
    const stmt = this.db.prepare(
      `INSERT INTO log_images (id, log_id, r2_key, file_name, content_type, file_size, width, height, display_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    
    await stmt.run([
      imageId,
      logId,
      r2Key,
      metadata.file_name,
      metadata.content_type,
      metadata.file_size,
      metadata.width || null,
      metadata.height || null,
      metadata.display_order || 0,
      now,
    ]);

    // Get the created image
    const imageRow = await this.db.queryFirst(
      'SELECT * FROM log_images WHERE id = ?',
      [imageId],
    );

    if (!imageRow) {
      throw new Error('Failed to create image record');
    }

    return ImageModel.fromRow(imageRow);
  }

  /**
   * Get all images for a log
   */
  async getLogImages(logId: string): Promise<LogImage[]> {
    const rows = await this.db.query(
      'SELECT * FROM log_images WHERE log_id = ? ORDER BY display_order ASC, created_at ASC',
      [logId],
    );

    return rows.map((row) => ImageModel.fromRow(row));
  }

  /**
   * Get a specific image
   */
  async getImage(imageId: string): Promise<LogImage | null> {
    const row = await this.db.queryFirst(
      'SELECT * FROM log_images WHERE id = ?',
      [imageId],
    );

    if (!row) {
      return null;
    }

    return ImageModel.fromRow(row);
  }

  /**
   * Get image data from R2
   */
  async getImageData(r2Key: string): Promise<R2ObjectBody | null> {
    if (!this.imagesBucket) {
      throw new Error('R2 bucket not configured');
    }

    return await this.imagesBucket.get(r2Key);
  }

  /**
   * Delete an image
   */
  async deleteImage(imageId: string): Promise<void> {
    // Get image metadata
    const image = await this.getImage(imageId);
    if (!image) {
      throw new Error('Image not found');
    }

    // Delete from R2
    if (this.imagesBucket) {
      await this.imagesBucket.delete(image.r2_key);
    }

    // Delete from database
    const stmt = this.db.prepare('DELETE FROM log_images WHERE id = ?');
    await stmt.run([imageId]);
  }

  /**
   * Delete all images for a log
   */
  async deleteLogImages(logId: string): Promise<void> {
    const images = await this.getLogImages(logId);

    // Delete from R2
    if (this.imagesBucket) {
      for (const image of images) {
        await this.imagesBucket.delete(image.r2_key);
      }
    }

    // Delete from database
    const stmt = this.db.prepare('DELETE FROM log_images WHERE log_id = ?');
    await stmt.run([logId]);
  }

  /**
   * Update display order of images
   */
  async updateImageOrder(imageId: string, displayOrder: number): Promise<void> {
    const stmt = this.db.prepare(
      'UPDATE log_images SET display_order = ? WHERE id = ?',
    );
    await stmt.run([displayOrder, imageId]);
  }
}
