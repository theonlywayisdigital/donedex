/**
 * Image Compression Service - Web Implementation
 * Uses Canvas API for browser-based compression
 */

import type { CompressionOptions, CompressedImage } from './types';

const DEFAULT_MAX_WIDTH = 2000;
const DEFAULT_MAX_HEIGHT = 2000;
const DEFAULT_QUALITY = 0.8;

/**
 * Loads an image from a URI/URL
 */
function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image: ${e}`));
    img.src = uri;
  });
}

/**
 * Compresses an image to the specified dimensions and quality
 */
export async function compressImage(
  uri: string,
  options: CompressionOptions = {}
): Promise<CompressedImage> {
  const {
    maxWidth = DEFAULT_MAX_WIDTH,
    maxHeight = DEFAULT_MAX_HEIGHT,
    quality = DEFAULT_QUALITY,
  } = options;

  const img = await loadImage(uri);

  const originalWidth = img.naturalWidth;
  const originalHeight = img.naturalHeight;

  let targetWidth = originalWidth;
  let targetHeight = originalHeight;

  // Only resize if image exceeds max dimensions
  if (originalWidth > maxWidth || originalHeight > maxHeight) {
    const widthRatio = maxWidth / originalWidth;
    const heightRatio = maxHeight / originalHeight;
    const ratio = Math.min(widthRatio, heightRatio);

    targetWidth = Math.round(originalWidth * ratio);
    targetHeight = Math.round(originalHeight * ratio);
  }

  // Create canvas and draw resized image
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Use high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Convert to blob URL
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to create blob'));
      },
      'image/jpeg',
      quality
    );
  });

  const compressedUri = URL.createObjectURL(blob);

  return {
    uri: compressedUri,
    width: targetWidth,
    height: targetHeight,
  };
}

/**
 * Compresses an image and returns base64 encoded data
 */
export async function compressImageToBase64(
  uri: string,
  options: CompressionOptions = {}
): Promise<CompressedImage> {
  const {
    maxWidth = DEFAULT_MAX_WIDTH,
    maxHeight = DEFAULT_MAX_HEIGHT,
    quality = DEFAULT_QUALITY,
  } = options;

  const img = await loadImage(uri);

  const originalWidth = img.naturalWidth;
  const originalHeight = img.naturalHeight;

  let targetWidth = originalWidth;
  let targetHeight = originalHeight;

  if (originalWidth > maxWidth || originalHeight > maxHeight) {
    const widthRatio = maxWidth / originalWidth;
    const heightRatio = maxHeight / originalHeight;
    const ratio = Math.min(widthRatio, heightRatio);

    targetWidth = Math.round(originalWidth * ratio);
    targetHeight = Math.round(originalHeight * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Get data URL (includes base64)
  const dataUrl = canvas.toDataURL('image/jpeg', quality);

  // Extract base64 portion (remove "data:image/jpeg;base64," prefix)
  const base64 = dataUrl.split(',')[1];

  // Also create blob URL for uri
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to create blob'));
      },
      'image/jpeg',
      quality
    );
  });

  const compressedUri = URL.createObjectURL(blob);

  return {
    uri: compressedUri,
    width: targetWidth,
    height: targetHeight,
    base64,
  };
}
