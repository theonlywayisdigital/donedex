/**
 * Image Picker Types
 */

export interface ImagePickerResult {
  canceled: boolean;
  assets?: ImageAsset[];
}

export interface ImageAsset {
  uri: string;
  width: number;
  height: number;
  type?: 'image' | 'video';
  fileName?: string;
  fileSize?: number;
  base64?: string;
  duration?: number; // Video duration in milliseconds
}

export interface ImagePickerOptions {
  mediaTypes?: 'images' | 'videos' | 'all';
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number; // 0-1
  base64?: boolean;
  allowsMultipleSelection?: boolean;
}

export interface VideoAsset {
  uri: string;
  width: number;
  height: number;
  duration: number; // milliseconds
  fileName?: string;
  fileSize?: number;
}

export interface VideoPickerResult {
  canceled: boolean;
  asset?: VideoAsset;
}
