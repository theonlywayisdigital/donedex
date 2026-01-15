/**
 * Image Picker - Platform-specific implementation
 * Uses expo-image-picker on native, HTML5 file input on web
 */

import { Platform } from 'react-native';

// Re-export types
export type { ImagePickerResult, ImageAsset, ImagePickerOptions, VideoAsset, VideoPickerResult } from './types';

// Platform-specific exports
import {
  launchCamera as launchCameraNative,
  launchImageLibrary as launchImageLibraryNative,
  requestCameraPermissions as requestCameraPermissionsNative,
  requestMediaLibraryPermissions as requestMediaLibraryPermissionsNative,
  launchVideoCamera as launchVideoCameraNative,
  launchVideoLibrary as launchVideoLibraryNative,
} from './imagePicker.native';

import {
  launchCamera as launchCameraWeb,
  launchImageLibrary as launchImageLibraryWeb,
  requestCameraPermissions as requestCameraPermissionsWeb,
  requestMediaLibraryPermissions as requestMediaLibraryPermissionsWeb,
  launchVideoCamera as launchVideoCameraWeb,
  launchVideoLibrary as launchVideoLibraryWeb,
} from './imagePicker.web';

export const launchCamera = Platform.OS === 'web' ? launchCameraWeb : launchCameraNative;
export const launchImageLibrary = Platform.OS === 'web' ? launchImageLibraryWeb : launchImageLibraryNative;
export const requestCameraPermissions = Platform.OS === 'web' ? requestCameraPermissionsWeb : requestCameraPermissionsNative;
export const requestMediaLibraryPermissions = Platform.OS === 'web' ? requestMediaLibraryPermissionsWeb : requestMediaLibraryPermissionsNative;

// Video functions - platform specific
export const launchVideoCamera = Platform.OS === 'web' ? launchVideoCameraWeb : launchVideoCameraNative;
export const launchVideoLibrary = Platform.OS === 'web' ? launchVideoLibraryWeb : launchVideoLibraryNative;
