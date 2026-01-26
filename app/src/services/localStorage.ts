/**
 * Local Storage Service
 * Cross-platform storage wrapper for persisting data offline
 * Uses AsyncStorage on native and localStorage on web
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Storage keys
export const STORAGE_KEYS = {
  INSPECTION_DRAFTS: 'inspection_drafts',
  TEMPLATE_CACHE: 'template_cache',
  SYNC_QUEUE: 'sync_queue',
  LAST_SYNC: 'last_sync',
  USER_PREFERENCES: 'user_preferences',
} as const;

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * Save data to local storage
 */
export async function saveToStorage<T>(key: StorageKey, data: T): Promise<void> {
  try {
    const jsonValue = JSON.stringify(data);

    if (Platform.OS === 'web') {
      localStorage.setItem(key, jsonValue);
    } else {
      await AsyncStorage.setItem(key, jsonValue);
    }
  } catch (error) {
    console.error(`Error saving to storage (${key}):`, error);
    throw error;
  }
}

/**
 * Load data from local storage
 */
export async function loadFromStorage<T>(key: StorageKey): Promise<T | null> {
  try {
    let jsonValue: string | null;

    if (Platform.OS === 'web') {
      jsonValue = localStorage.getItem(key);
    } else {
      jsonValue = await AsyncStorage.getItem(key);
    }

    if (jsonValue === null) {
      return null;
    }

    return JSON.parse(jsonValue) as T;
  } catch (error) {
    console.error(`Error loading from storage (${key}):`, error);
    return null;
  }
}

/**
 * Remove data from local storage
 */
export async function removeFromStorage(key: StorageKey): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  } catch (error) {
    console.error(`Error removing from storage (${key}):`, error);
  }
}

/**
 * Clear all app data from storage
 */
export async function clearAllStorage(): Promise<void> {
  try {
    const keys = Object.values(STORAGE_KEYS);

    if (Platform.OS === 'web') {
      keys.forEach((key) => localStorage.removeItem(key));
    } else {
      await AsyncStorage.multiRemove(keys);
    }
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
}

// ============================================================================
// Inspection Draft Storage
// ============================================================================

export interface InspectionDraftResponse {
  templateItemId: string;
  responseValue: string | null;
  photos: string[];
  notes: string | null;
  severity: string | null;
  /** Timestamp when this specific response was last modified locally */
  fieldUpdatedAt: string;
}

export interface InspectionDraft {
  reportId: string;
  templateId: string;
  recordId: string;
  responses: InspectionDraftResponse[];
  currentSectionIndex: number;
  lastUpdated: string;
  /** Version number for optimistic locking (incremented on each save) */
  version: number;
}

/**
 * Save inspection draft locally
 */
export async function saveInspectionDraft(draft: InspectionDraft): Promise<void> {
  const drafts = (await loadFromStorage<Record<string, InspectionDraft>>(
    STORAGE_KEYS.INSPECTION_DRAFTS
  )) || {};

  drafts[draft.reportId] = {
    ...draft,
    lastUpdated: new Date().toISOString(),
  };

  await saveToStorage(STORAGE_KEYS.INSPECTION_DRAFTS, drafts);
}

/**
 * Load inspection draft by report ID
 */
export async function loadInspectionDraft(
  reportId: string
): Promise<InspectionDraft | null> {
  const drafts = await loadFromStorage<Record<string, InspectionDraft>>(
    STORAGE_KEYS.INSPECTION_DRAFTS
  );

  return drafts?.[reportId] || null;
}

/**
 * Delete inspection draft
 */
export async function deleteInspectionDraft(reportId: string): Promise<void> {
  const drafts = (await loadFromStorage<Record<string, InspectionDraft>>(
    STORAGE_KEYS.INSPECTION_DRAFTS
  )) || {};

  delete drafts[reportId];

  await saveToStorage(STORAGE_KEYS.INSPECTION_DRAFTS, drafts);
}

/**
 * Get all inspection drafts
 */
export async function getAllInspectionDrafts(): Promise<InspectionDraft[]> {
  const drafts = await loadFromStorage<Record<string, InspectionDraft>>(
    STORAGE_KEYS.INSPECTION_DRAFTS
  );

  return drafts ? Object.values(drafts) : [];
}

// ============================================================================
// Sync Queue
// ============================================================================

export interface SyncQueueItem {
  id: string;
  type: 'response' | 'photo' | 'report_submit';
  data: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

/**
 * Add item to sync queue
 */
export async function addToSyncQueue(
  type: SyncQueueItem['type'],
  data: Record<string, unknown>
): Promise<void> {
  const queue = (await loadFromStorage<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE)) || [];

  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    type,
    data,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  });

  await saveToStorage(STORAGE_KEYS.SYNC_QUEUE, queue);
}

/**
 * Get all items in sync queue
 */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return (await loadFromStorage<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE)) || [];
}

/**
 * Remove item from sync queue
 */
export async function removeFromSyncQueue(itemId: string): Promise<void> {
  const queue = (await loadFromStorage<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE)) || [];
  const filteredQueue = queue.filter((item) => item.id !== itemId);
  await saveToStorage(STORAGE_KEYS.SYNC_QUEUE, filteredQueue);
}

/**
 * Update sync queue item (e.g., increment retry count)
 */
export async function updateSyncQueueItem(
  itemId: string,
  updates: Partial<SyncQueueItem>
): Promise<void> {
  const queue = (await loadFromStorage<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE)) || [];
  const updatedQueue = queue.map((item) =>
    item.id === itemId ? { ...item, ...updates } : item
  );
  await saveToStorage(STORAGE_KEYS.SYNC_QUEUE, updatedQueue);
}

/**
 * Clear sync queue
 */
export async function clearSyncQueue(): Promise<void> {
  await saveToStorage(STORAGE_KEYS.SYNC_QUEUE, []);
}

// ============================================================================
// Last Sync Timestamp
// ============================================================================

/**
 * Save last successful sync timestamp
 */
export async function saveLastSyncTime(): Promise<void> {
  await saveToStorage(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
}

/**
 * Get last successful sync timestamp
 */
export async function getLastSyncTime(): Promise<string | null> {
  return loadFromStorage<string>(STORAGE_KEYS.LAST_SYNC);
}
