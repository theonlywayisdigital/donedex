/**
 * Image Compression Service - Native Implementation
 * Uses expo-image-manipulator for iOS/Android
 */

import * as ImageManipulator from 'expo-image-manipulator';
import type { CompressionOptions, CompressedImage } from './types';

const DEFAULT_MAX_WIDTH = 1200;
const DEFAULT_MAX_HEIGHT = 1200;
const DEFAULT_QUALITY = 0.8;

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

  try {
    // Get image dimensions first to calculate resize ratio
    const originalImage = await ImageManipulator.manipulateAsync(
      uri,
      [],
      { format: ImageManipulator.SaveFormat.JPEG }
    );

    // Calculate the resize ratio to fit within max dimensions
    const { width: originalWidth, height: originalHeight } = originalImage;

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

    // Apply resize if needed
    const actions: ImageManipulator.Action[] = [];
    if (targetWidth !== originalWidth || targetHeight !== originalHeight) {
      actions.push({ resize: { width: targetWidth, height: targetHeight } });
    }

    // Compress the image
    const result = await ImageManipulator.manipulateAsync(
      uri,
      actions,
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
    };
  } catch (err) {
    console.error('[imageCompression] Compression failed:', err);
    // Return original URI as fallback so the photo isn't lost
    return { uri, width: 0, height: 0 };
  }
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

  try {
    // Get image dimensions first
    const originalImage = await ImageManipulator.manipulateAsync(
      uri,
      [],
      { format: ImageManipulator.SaveFormat.JPEG }
    );

    const { width: originalWidth, height: originalHeight } = originalImage;

    let targetWidth = originalWidth;
    let targetHeight = originalHeight;

    if (originalWidth > maxWidth || originalHeight > maxHeight) {
      const widthRatio = maxWidth / originalWidth;
      const heightRatio = maxHeight / originalHeight;
      const ratio = Math.min(widthRatio, heightRatio);

      targetWidth = Math.round(originalWidth * ratio);
      targetHeight = Math.round(originalHeight * ratio);
    }

    const actions: ImageManipulator.Action[] = [];
    if (targetWidth !== originalWidth || targetHeight !== originalHeight) {
      actions.push({ resize: { width: targetWidth, height: targetHeight } });
    }

    const result = await ImageManipulator.manipulateAsync(
      uri,
      actions,
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
      base64: result.base64,
    };
  } catch (err) {
    console.error('[imageCompression] Base64 compression failed:', err);
    // Return original URI without base64 - caller should handle missing base64
    return { uri, width: 0, height: 0 };
  }
}
