/**
 * Image Compression Types
 */

export interface CompressionOptions {
  maxWidth?: number;  // Max width in pixels (default: 2000)
  maxHeight?: number; // Max height in pixels (default: 2000)
  quality?: number;   // JPEG quality 0-1 (default: 0.8)
}

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
  base64?: string;
}
