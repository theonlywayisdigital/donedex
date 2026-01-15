/**
 * Image Picker - Native Implementation
 * Uses expo-image-picker for iOS/Android
 */

import * as ExpoImagePicker from 'expo-image-picker';
import type { ImagePickerResult, ImagePickerOptions, VideoPickerResult } from './types';

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
  const hasPermission = await requestCameraPermissions();
  if (!hasPermission) {
    return { canceled: true };
  }

  const result = await ExpoImagePicker.launchCameraAsync({
    mediaTypes: options.mediaTypes === 'videos'
      ? ['videos']
      : options.mediaTypes === 'all'
      ? ['images', 'videos']
      : ['images'],
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
      type: asset.type === 'video' ? 'video' : 'image',
      fileName: asset.fileName || undefined,
      fileSize: asset.fileSize || undefined,
      base64: asset.base64 || undefined,
    })),
  };
}

/**
 * Launch image picker to select from library
 */
export async function launchImageLibrary(
  options: ImagePickerOptions = {}
): Promise<ImagePickerResult> {
  const hasPermission = await requestMediaLibraryPermissions();
  if (!hasPermission) {
    return { canceled: true };
  }

  const result = await ExpoImagePicker.launchImageLibraryAsync({
    mediaTypes: options.mediaTypes === 'videos'
      ? ['videos']
      : options.mediaTypes === 'all'
      ? ['images', 'videos']
      : ['images'],
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
      type: asset.type === 'video' ? 'video' : 'image',
      fileName: asset.fileName || undefined,
      fileSize: asset.fileSize || undefined,
      base64: asset.base64 || undefined,
    })),
  };
}

/**
 * Launch camera to record video
 */
export async function launchVideoCamera(): Promise<VideoPickerResult> {
  const hasPermission = await requestCameraPermissions();
  if (!hasPermission) {
    return { canceled: true };
  }

  const result = await ExpoImagePicker.launchCameraAsync({
    mediaTypes: ['videos'],
    allowsEditing: false,
    // No quality or duration limits per user request - billing based on storage
  });

  if (result.canceled || !result.assets?.[0]) {
    return { canceled: true };
  }

  const asset = result.assets[0];
  return {
    canceled: false,
    asset: {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      duration: asset.duration ? asset.duration * 1000 : 0, // Convert to milliseconds
      fileName: asset.fileName || undefined,
      fileSize: asset.fileSize || undefined,
    },
  };
}

/**
 * Launch library to pick a video
 */
export async function launchVideoLibrary(): Promise<VideoPickerResult> {
  const hasPermission = await requestMediaLibraryPermissions();
  if (!hasPermission) {
    return { canceled: true };
  }

  const result = await ExpoImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsEditing: false,
  });

  if (result.canceled || !result.assets?.[0]) {
    return { canceled: true };
  }

  const asset = result.assets[0];
  return {
    canceled: false,
    asset: {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      duration: asset.duration ? asset.duration * 1000 : 0, // Convert to milliseconds
      fileName: asset.fileName || undefined,
      fileSize: asset.fileSize || undefined,
    },
  };
}
