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
  type?: 'image';
  fileName?: string;
  fileSize?: number;
  base64?: string;
}

export interface ImagePickerOptions {
  mediaTypes?: 'images';
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number; // 0-1
  base64?: boolean;
  allowsMultipleSelection?: boolean;
}
