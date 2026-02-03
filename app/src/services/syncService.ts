/**
 * Sync Service
 * Handles syncing local data with the server when network is available
 */

import { supabase } from './supabase';
import { isOnline, subscribeToNetworkChanges } from './networkStatus';
import {
  getSyncQueue,
  removeFromSyncQueue,
  updateSyncQueueItem,
  saveLastSyncTime,
  SyncQueueItem,
} from './localStorage';
import { compressImage } from './imageCompression';
import { deletePersistedFile } from './filePersistence';

const MAX_RETRIES = 3;
let isSyncing = false;
let syncListeners: Set<(syncing: boolean, pending: number) => void> = new Set();

/**
 * Subscribe to sync status changes
 */
export function subscribeToSyncStatus(
  callback: (syncing: boolean, pending: number) => void
): () => void {
  syncListeners.add(callback);
  return () => {
    syncListeners.delete(callback);
  };
}

/**
 * Notify listeners of sync status change
 */
async function notifySyncStatus() {
  const queue = await getSyncQueue();
  syncListeners.forEach((listener) => listener(isSyncing, queue.length));
}

/**
 * Process a single sync queue item
 */
async function processSyncItem(item: SyncQueueItem): Promise<boolean> {
  try {
    switch (item.type) {
      case 'response':
        return await syncResponse(item.data);
      case 'photo':
        return await syncPhoto(item.data);
      case 'report_submit':
        return await syncReportSubmit(item.data);
      default:
        console.warn(`Unknown sync item type: ${item.type}`);
        return false;
    }
  } catch (error) {
    console.error(`Error processing sync item ${item.id}:`, error);
    return false;
  }
}

/**
 * Sync a response to the server
 */
async function syncResponse(data: Record<string, unknown>): Promise<boolean> {
  const { reportId, templateItemId, responseValue, notes, severity } = data;

  const { error } = await supabase
    .from('report_responses')
    .upsert(
      {
        report_id: reportId as string,
        template_item_id: templateItemId as string,
        response_value: responseValue as string | null,
        notes: notes as string | null,
        severity: severity as string | null,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: 'report_id,template_item_id' }
    );

  if (error) {
    console.error('Error syncing response:', error);
    return false;
  }

  return true;
}

/**
 * Sync a photo to the server
 */
async function syncPhoto(data: Record<string, unknown>): Promise<boolean> {
  const { reportId, responseId, photoUri } = data;

  try {
    // Compress the image before upload
    const compressed = await compressImage(photoUri as string, {
      maxWidth: 2000,
      maxHeight: 2000,
      quality: 0.8,
    });

    // Generate unique filename
    const filename = `${reportId}/${responseId}/${Date.now()}.jpg`;

    // Fetch the compressed image as a blob
    const response = await fetch(compressed.uri);
    const blob = await response.blob();

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('report-photos')
      .upload(filename, blob, {
        contentType: 'image/jpeg',
      });

    if (uploadError) {
      console.error('Error uploading photo during sync:', uploadError);
      return false;
    }

    // Create photo record in database
    const { error: dbError } = await supabase
      .from('report_photos')
      .insert({
        report_response_id: responseId,
        storage_path: filename,
      } as never);

    if (dbError) {
      console.error('Error creating photo record during sync:', dbError);
      return false;
    }

    // Clean up the locally persisted file after successful upload
    await deletePersistedFile(photoUri as string);

    return true;
  } catch (error) {
    console.error('Error syncing photo:', error);
    return false;
  }
}

/**
 * Sync a report submission to the server
 */
async function syncReportSubmit(data: Record<string, unknown>): Promise<boolean> {
  const { reportId } = data;

  const { error } = await supabase
    .from('reports')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    } as never)
    .eq('id', reportId as string);

  if (error) {
    console.error('Error syncing report submit:', error);
    return false;
  }

  return true;
}

/**
 * Process all items in the sync queue
 */
export async function processSyncQueue(): Promise<{ success: number; failed: number }> {
  if (isSyncing) {
    console.log('Sync already in progress');
    return { success: 0, failed: 0 };
  }

  const online = await isOnline();
  if (!online) {
    console.log('Cannot sync: device is offline');
    return { success: 0, failed: 0 };
  }

  isSyncing = true;
  await notifySyncStatus();

  let success = 0;
  let failed = 0;

  try {
    const queue = await getSyncQueue();

    for (const item of queue) {
      const result = await processSyncItem(item);

      if (result) {
        await removeFromSyncQueue(item.id);
        success++;
      } else {
        // Increment retry count
        const newRetryCount = item.retryCount + 1;

        if (newRetryCount >= MAX_RETRIES) {
          // Give up after max retries, but keep in queue for manual retry
          await updateSyncQueueItem(item.id, {
            retryCount: newRetryCount,
            lastError: 'Max retries exceeded',
          });
        } else {
          await updateSyncQueueItem(item.id, { retryCount: newRetryCount });
        }
        failed++;
      }
    }

    if (success > 0) {
      await saveLastSyncTime();
    }
  } catch (error) {
    console.error('Error during sync:', error);
  } finally {
    isSyncing = false;
    await notifySyncStatus();
  }

  return { success, failed };
}

/**
 * Initialize automatic sync on network reconnection
 */
export function initializeAutoSync(): () => void {
  let wasOffline = false;

  const unsubscribe = subscribeToNetworkChanges(async (online) => {
    if (online && wasOffline) {
      await processSyncQueue();
    }
    wasOffline = !online;
  });

  // Check initial state
  isOnline().then((online) => {
    wasOffline = !online;
  });

  return unsubscribe;
}

/**
 * Get sync status
 */
export async function getSyncStatus(): Promise<{
  isSyncing: boolean;
  pendingItems: number;
  lastSync: string | null;
}> {
  const queue = await getSyncQueue();
  const { getLastSyncTime } = await import('./localStorage');
  const lastSync = await getLastSyncTime();

  return {
    isSyncing,
    pendingItems: queue.length,
    lastSync,
  };
}

/**
 * Force sync now (manual trigger)
 */
export async function forceSyncNow(): Promise<{ success: number; failed: number }> {
  return processSyncQueue();
}
