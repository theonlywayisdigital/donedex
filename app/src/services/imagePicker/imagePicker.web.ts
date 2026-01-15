/**
 * Image Picker - Web Implementation
 * Uses HTML5 file input and getUserMedia for camera access
 */

import type { ImagePickerResult, ImagePickerOptions, ImageAsset } from './types';

/**
 * Request camera permissions (web)
 * Returns true since browser will prompt when needed
 */
export async function requestCameraPermissions(): Promise<boolean> {
  try {
    // Check if camera is available
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasCamera = devices.some((device) => device.kind === 'videoinput');
    return hasCamera;
  } catch {
    return false;
  }
}

/**
 * Request media library permissions (web)
 * Always returns true since file input doesn't need permissions
 */
export async function requestMediaLibraryPermissions(): Promise<boolean> {
  return true;
}

/**
 * Helper to create a file input and wait for selection
 */
function createFileInput(
  accept: string,
  multiple: boolean
): Promise<FileList | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.style.display = 'none';
    document.body.appendChild(input);

    input.onchange = () => {
      document.body.removeChild(input);
      resolve(input.files);
    };

    input.oncancel = () => {
      document.body.removeChild(input);
      resolve(null);
    };

    // Handle case where user clicks away
    const handleBlur = () => {
      setTimeout(() => {
        if (document.body.contains(input)) {
          document.body.removeChild(input);
          resolve(null);
        }
      }, 300);
    };

    window.addEventListener('focus', handleBlur, { once: true });

    input.click();
  });
}

/**
 * Convert File to ImageAsset
 */
async function fileToAsset(file: File, includeBase64?: boolean): Promise<ImageAsset> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const asset: ImageAsset = {
        uri: url,
        width: img.width,
        height: img.height,
        type: file.type.startsWith('video/') ? 'video' : 'image',
        fileName: file.name,
        fileSize: file.size,
      };

      if (includeBase64) {
        const reader = new FileReader();
        reader.onload = () => {
          asset.base64 = (reader.result as string).split(',')[1];
          resolve(asset);
        };
        reader.readAsDataURL(file);
      } else {
        resolve(asset);
      }
    };

    img.onerror = () => {
      // For non-image files (videos), we can't get dimensions
      resolve({
        uri: url,
        width: 0,
        height: 0,
        type: file.type.startsWith('video/') ? 'video' : 'image',
        fileName: file.name,
        fileSize: file.size,
      });
    };

    img.src = url;
  });
}

/**
 * Get accept string based on media types
 */
function getAcceptString(mediaTypes: 'images' | 'videos' | 'all' = 'images'): string {
  switch (mediaTypes) {
    case 'videos':
      return 'video/*';
    case 'all':
      return 'image/*,video/*';
    default:
      return 'image/*';
  }
}

/**
 * Launch camera to take a photo (web)
 * Uses HTML5 capture attribute for mobile devices
 * Falls back to file input on desktop
 */
export async function launchCamera(
  options: ImagePickerOptions = {}
): Promise<ImagePickerResult> {
  // On web, we use file input with capture="environment" for camera access
  // This works on mobile browsers and some desktops with webcams
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = getAcceptString(options.mediaTypes);
    input.capture = 'environment'; // Use back camera on mobile
    input.style.display = 'none';
    document.body.appendChild(input);

    input.onchange = async () => {
      document.body.removeChild(input);
      const files = input.files;
      if (!files || files.length === 0) {
        resolve({ canceled: true });
        return;
      }

      const assets = await Promise.all(
        Array.from(files).map((file) => fileToAsset(file, options.base64))
      );
      resolve({ canceled: false, assets });
    };

    input.oncancel = () => {
      document.body.removeChild(input);
      resolve({ canceled: true });
    };

    input.click();
  });
}

/**
 * Launch image picker to select from library (web)
 * Uses standard file input
 */
export async function launchImageLibrary(
  options: ImagePickerOptions = {}
): Promise<ImagePickerResult> {
  const accept = getAcceptString(options.mediaTypes);
  const multiple = options.allowsMultipleSelection ?? false;

  const files = await createFileInput(accept, multiple);
  if (!files || files.length === 0) {
    return { canceled: true };
  }

  const assets = await Promise.all(
    Array.from(files).map((file) => fileToAsset(file, options.base64))
  );

  return { canceled: false, assets };
}
