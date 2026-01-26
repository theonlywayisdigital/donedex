/**
 * File Persistence Service
 * Ensures files (photos) persist until explicitly deleted after sync
 *
 * On native: copies to documents directory
 * On web: returns original URI (blob URLs persist for session)
 */

import { Paths, File, Directory } from 'expo-file-system';
import { Platform } from 'react-native';

const PENDING_UPLOADS_DIR = 'pending_uploads';

/**
 * Get the pending uploads directory
 */
function getPendingUploadsDirectory(): Directory {
  return new Directory(Paths.document, PENDING_UPLOADS_DIR);
}

/**
 * Ensure the pending uploads directory exists
 */
async function ensurePendingUploadsDirExists(): Promise<void> {
  if (Platform.OS === 'web') return;

  const dir = getPendingUploadsDirectory();
  if (!dir.exists) {
    await dir.create();
  }
}

/**
 * Generate a unique filename for a persisted file
 */
function generateFilename(originalUri: string, type: 'photo'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}_${random}.jpg`;
}

/**
 * Persist a file to a durable location
 * On native: copies from cache to documents directory
 * On web: returns original URI (blob URLs persist for session)
 *
 * @param sourceUri - The source URI (may be cache, blob, or other temporary location)
 * @param type - The type of file ('photo')
 * @returns The persistent URI that should be used for storage
 */
export async function persistFile(
  sourceUri: string,
  type: 'photo'
): Promise<string> {
  // On web, blob URLs and data URIs persist for the session
  // No additional persistence needed
  if (Platform.OS === 'web') {
    return sourceUri;
  }

  // On native, copy file to documents directory for durability
  try {
    await ensurePendingUploadsDirExists();

    const filename = generateFilename(sourceUri, type);
    const sourceFile = new File(sourceUri);
    const destFile = new File(getPendingUploadsDirectory(), filename);

    // Check if source file exists
    if (!sourceFile.exists) {
      console.warn('Source file does not exist:', sourceUri);
      return sourceUri; // Return original if we can't copy
    }

    // Copy to persistent location
    await sourceFile.copy(destFile);

    console.log(`File persisted: ${sourceUri} -> ${destFile.uri}`);
    return destFile.uri;
  } catch (error) {
    console.error('Error persisting file:', error);
    // Return original URI if persistence fails
    return sourceUri;
  }
}

/**
 * Delete a persisted file after successful sync
 * Only deletes files in the pending_uploads directory
 *
 * @param fileUri - The URI of the file to delete
 */
export async function deletePersistedFile(fileUri: string): Promise<void> {
  if (Platform.OS === 'web') return;

  // Only delete files in our pending uploads directory
  if (!fileUri.includes(PENDING_UPLOADS_DIR)) {
    console.log('Not deleting file outside pending uploads:', fileUri);
    return;
  }

  try {
    const file = new File(fileUri);
    if (file.exists) {
      await file.delete();
      console.log('Deleted persisted file:', fileUri);
    }
  } catch (error) {
    console.error('Error deleting persisted file:', error);
  }
}

/**
 * Get all pending upload files (for debugging/cleanup)
 */
export async function getPendingUploadFiles(): Promise<string[]> {
  if (Platform.OS === 'web') return [];

  try {
    await ensurePendingUploadsDirExists();
    const dir = getPendingUploadsDirectory();
    const contents = await dir.list();
    return contents
      .filter((item): item is File => item instanceof File)
      .map((file) => file.uri);
  } catch (error) {
    console.error('Error reading pending uploads:', error);
    return [];
  }
}

/**
 * Clean up all pending upload files (use with caution!)
 * Only call after confirming all uploads are complete
 */
export async function cleanupAllPendingUploads(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const fileUris = await getPendingUploadFiles();
    for (const uri of fileUris) {
      const file = new File(uri);
      if (file.exists) {
        await file.delete();
      }
    }
    console.log(`Cleaned up ${fileUris.length} pending upload files`);
  } catch (error) {
    console.error('Error cleaning up pending uploads:', error);
  }
}
