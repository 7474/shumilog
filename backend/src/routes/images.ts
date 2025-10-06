/**
 * Image routes for log attachments
 */

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppBindings } from '../index.js';

const images = new Hono<AppBindings>();

function getImageService(c: any) {
  const imageService = c.get('imageService');
  if (!imageService) {
    throw new HTTPException(500, { message: 'Image service not initialized' });
  }
  return imageService;
}

function getLogService(c: any) {
  const logService = c.get('logService');
  if (!logService) {
    throw new HTTPException(500, { message: 'Log service not initialized' });
  }
  return logService;
}

function getAuthUser(c: any) {
  const auth = c.get('auth');
  if (!auth?.user) {
    throw new HTTPException(401, { message: 'Not authenticated' });
  }
  return auth.user;
}

// POST /logs/:logId/images - Upload image to log
images.post('/:logId/images', async (c) => {
  const logId = c.req.param('logId');
  const imageService = getImageService(c);
  const logService = getLogService(c);
  const user = getAuthUser(c);

  // Verify log exists and user owns it
  const log = await logService.getLogById(logId, user.id);
  if (!log) {
    throw new HTTPException(404, { message: 'Log not found' });
  }

  if (log.user_id !== user.id) {
    throw new HTTPException(403, { message: 'Not log owner' });
  }

  // Parse multipart form data
  const formData = await c.req.formData();
  const file = formData.get('file');
  const displayOrder = formData.get('display_order');

  if (!file) {
    throw new HTTPException(400, { message: 'File is required' });
  }

  // Check if file is a Blob/File
  if (typeof file === 'string') {
    throw new HTTPException(400, { message: 'File must be a binary file, not a string' });
  }

  // Check if file is a Blob/File
  if (typeof file === 'string') {
    throw new HTTPException(400, { message: 'File must be a binary file, not a string' });
  }

  // Get file properties - formData returns File or Blob
  const fileBlob = file as Blob;
  const fileName = 'name' in file ? (file as File).name : 'uploaded-image';
  const fileType = fileBlob.type;
  const fileSize = fileBlob.size;

  // Validate file type
  if (!fileType.startsWith('image/')) {
    throw new HTTPException(400, { message: 'File must be an image' });
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (fileSize > maxSize) {
    throw new HTTPException(400, { message: 'File size must be less than 10MB' });
  }

  // Get image dimensions if provided
  const width = formData.get('width');
  const height = formData.get('height');

  // Upload image (owned by user, associated with log)
  try {
    const image = await imageService.uploadImage(
      user.id,
      logId,
      fileBlob,
      {
        file_name: fileName,
        content_type: fileType,
        file_size: fileSize,
        width: width ? parseInt(width.toString()) : undefined,
        height: height ? parseInt(height.toString()) : undefined,
      },
      displayOrder ? parseInt(displayOrder.toString()) : 0,
    );

    return c.json(image, 201);
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new HTTPException(500, { message: error instanceof Error ? error.message : 'Failed to upload image' });
  }
});

// GET /logs/:logId/images - Get all images for a log
images.get('/:logId/images', async (c) => {
  const logId = c.req.param('logId');
  const imageService = getImageService(c);
  const logService = getLogService(c);

  // Verify log exists
  const log = await logService.getLogById(logId);
  if (!log) {
    throw new HTTPException(404, { message: 'Log not found' });
  }

  // Get images
  const logImages = await imageService.getLogImages(logId);

  return c.json({ items: logImages });
});

// GET /logs/:logId/images/:imageId - Get image data
images.get('/:logId/images/:imageId', async (c) => {
  const imageId = c.req.param('imageId');
  const imageService = getImageService(c);

  // Get image metadata
  const image = await imageService.getImage(imageId);
  if (!image) {
    throw new HTTPException(404, { message: 'Image not found' });
  }

  // Get image data from R2
  const imageData = await imageService.getImageData(image.r2_key);
  if (!imageData) {
    throw new HTTPException(404, { message: 'Image data not found' });
  }

  // Return image with appropriate headers
  return new Response(imageData.body, {
    headers: {
      'Content-Type': image.content_type,
      'Content-Length': image.file_size.toString(),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
});

// DELETE /logs/:logId/images/:imageId - Delete image or remove association
images.delete('/:logId/images/:imageId', async (c) => {
  const logId = c.req.param('logId');
  const imageId = c.req.param('imageId');
  const imageService = getImageService(c);
  const logService = getLogService(c);
  const user = getAuthUser(c);

  // Verify log exists and user owns it
  const log = await logService.getLogById(logId, user.id);
  if (!log) {
    throw new HTTPException(404, { message: 'Log not found' });
  }

  if (log.user_id !== user.id) {
    throw new HTTPException(403, { message: 'Not log owner' });
  }

  // Verify image exists
  const image = await imageService.getImage(imageId);
  if (!image) {
    throw new HTTPException(404, { message: 'Image not found' });
  }

  // Verify user owns the image
  const ownsImage = await imageService.verifyImageOwnership(imageId, user.id);
  if (!ownsImage) {
    throw new HTTPException(403, { message: 'Not image owner' });
  }

  // Remove association (or delete image if desired - for now just dissociate)
  try {
    await imageService.dissociateImageFromLog(imageId, logId);
    return c.body(null, 204);
  } catch (error) {
    console.error('Error removing image association:', error);
    throw new HTTPException(500, { message: 'Failed to remove image from log' });
  }
});

export default images;
