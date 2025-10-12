/**
 * Service for managing user-owned images with R2 storage
 */

import type { R2Bucket, R2ObjectBody } from '@cloudflare/workers-types';
import { v4 as uuidv4 } from 'uuid';
import type { Database } from '../db/database.js';
import { ImageModel, type Image, type LogImage, type CreateImageData } from '../models/Image.js';

export class ImageService {
  constructor(
    private db: Database,
    private imagesBucket: R2Bucket | null,
  ) {}

  /**
   * Upload an image for a user and optionally associate with a log
   */
  async uploadImage(
    userId: string,
    logId: string | null,
    file: File | Blob,
    metadata: CreateImageData,
    displayOrder?: number,
  ): Promise<Image> {
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
    const r2Key = `users/${userId}/${imageId}.${extension}`;

    // Upload to R2
    await this.imagesBucket.put(r2Key, file, {
      httpMetadata: {
        contentType: metadata.content_type,
      },
      customMetadata: {
        userId,
        imageId,
        fileName: metadata.file_name,
      },
    });

    // Save metadata to database
    const now = new Date().toISOString();
    const stmt = this.db.prepare(
      `INSERT INTO images (id, user_id, r2_key, file_name, content_type, file_size, width, height, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    
    await stmt.run([
      imageId,
      userId,
      r2Key,
      metadata.file_name,
      metadata.content_type,
      metadata.file_size,
      metadata.width || null,
      metadata.height || null,
      now,
    ]);

    // If logId is provided, create association
    if (logId) {
      await this.associateImageWithLog(imageId, logId, displayOrder || 0);
    }

    // Get the created image
    const imageRow = await this.db.queryFirst(
      'SELECT * FROM images WHERE id = ?',
      [imageId],
    );

    if (!imageRow) {
      throw new Error('Failed to create image record');
    }

    return ImageModel.fromRow(imageRow);
  }

  /**
   * Associate an image with a log
   */
  async associateImageWithLog(imageId: string, logId: string, displayOrder: number = 0): Promise<void> {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(
      `INSERT INTO log_image_associations (log_id, image_id, display_order, created_at)
       VALUES (?, ?, ?, ?)`,
    );
    
    await stmt.run([logId, imageId, displayOrder, now]);
  }

  /**
   * Remove association between an image and a log
   */
  async dissociateImageFromLog(imageId: string, logId: string): Promise<void> {
    const stmt = this.db.prepare(
      'DELETE FROM log_image_associations WHERE log_id = ? AND image_id = ?',
    );
    await stmt.run([logId, imageId]);
  }

  /**
   * Get all images for a log
   */
  async getLogImages(logId: string): Promise<LogImage[]> {
    const rows = await this.db.query(`
      SELECT i.*, lia.display_order
      FROM images i
      JOIN log_image_associations lia ON i.id = lia.image_id
      WHERE lia.log_id = ?
      ORDER BY lia.display_order ASC, i.created_at ASC
    `, [logId]);

    return rows.map((row) => ImageModel.fromRowWithDisplayOrder(row));
  }

  /**
   * Get all images owned by a user
   */
  async getUserImages(userId: string): Promise<Image[]> {
    const rows = await this.db.query(
      'SELECT * FROM images WHERE user_id = ? ORDER BY created_at DESC',
      [userId],
    );

    return rows.map((row) => ImageModel.fromRow(row));
  }

  /**
   * Get a specific image
   */
  async getImage(imageId: string): Promise<Image | null> {
    const row = await this.db.queryFirst(
      'SELECT * FROM images WHERE id = ?',
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
   * Delete an image (and all its associations)
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

    // Delete from database (associations will cascade)
    const stmt = this.db.prepare('DELETE FROM images WHERE id = ?');
    await stmt.run([imageId]);
  }

  /**
   * Delete all associations for a log
   */
  async deleteLogImageAssociations(logId: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM log_image_associations WHERE log_id = ?');
    await stmt.run([logId]);
  }

  /**
   * Update display order of an image in a log
   */
  async updateImageOrder(imageId: string, logId: string, displayOrder: number): Promise<void> {
    const stmt = this.db.prepare(
      'UPDATE log_image_associations SET display_order = ? WHERE log_id = ? AND image_id = ?',
    );
    await stmt.run([displayOrder, logId, imageId]);
  }

  /**
   * Verify user owns an image
   */
  async verifyImageOwnership(imageId: string, userId: string): Promise<boolean> {
    const result = await this.db.queryFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM images WHERE id = ? AND user_id = ?',
      [imageId, userId],
    );
    
    return (result?.count || 0) > 0;
  }
}
