/**
 * Image Picker - Native Implementation
 * Uses expo-image-picker for iOS/Android
 */

import * as ExpoImagePicker from 'expo-image-picker';
import type { ImagePickerResult, ImagePickerOptions } from './types';

/**
 * Request camera permissions
 */
export async function requestCameraPermissions(): Promise<boolean> {
  const { status } = await ExpoImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

/**
 * Request media library permissions
 */
export async function requestMediaLibraryPermissions(): Promise<boolean> {
  const { status } = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

/**
 * Launch camera to take a photo
 */
export async function launchCamera(
  options: ImagePickerOptions = {}
): Promise<ImagePickerResult> {
  try {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) {
      return { canceled: true, error: 'Camera permission denied' };
    }

    const result = await ExpoImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: options.allowsEditing ?? false,
      aspect: options.aspect,
      quality: options.quality ?? 0.8,
      base64: options.base64 ?? false,
    });

    if (result.canceled) {
      return { canceled: true };
    }

    return {
      canceled: false,
      assets: result.assets.map((asset) => ({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        type: 'image' as const,
        fileName: asset.fileName || undefined,
        fileSize: asset.fileSize || undefined,
        base64: asset.base64 || undefined,
      })),
    };
  } catch (err) {
    console.error('[imagePicker] Camera launch failed:', err);
    return { canceled: true, error: err instanceof Error ? err.message : 'Camera failed to open' };
  }
}

/**
 * Launch image picker to select from library
 */
export async function launchImageLibrary(
  options: ImagePickerOptions = {}
): Promise<ImagePickerResult> {
  try {
    const hasPermission = await requestMediaLibraryPermissions();
    if (!hasPermission) {
      return { canceled: true, error: 'Photo library permission denied' };
    }

    const result = await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: options.allowsEditing ?? false,
      aspect: options.aspect,
      quality: options.quality ?? 0.8,
      base64: options.base64 ?? false,
      allowsMultipleSelection: options.allowsMultipleSelection ?? false,
    });

    if (result.canceled) {
      return { canceled: true };
    }

    return {
      canceled: false,
      assets: result.assets.map((asset) => ({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        type: 'image' as const,
        fileName: asset.fileName || undefined,
        fileSize: asset.fileSize || undefined,
        base64: asset.base64 || undefined,
      })),
    };
  } catch (err) {
    console.error('[imagePicker] Image library launch failed:', err);
    return { canceled: true, error: err instanceof Error ? err.message : 'Failed to open photo library' };
  }
}
