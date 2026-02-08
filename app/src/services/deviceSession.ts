/**
 * Device Session Service
 * Handles single-device login enforcement for staff members
 *
 * Migrated to Firebase/Firestore
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from './firebase';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { collections, generateId } from './firestore';
import * as Device from 'expo-device';

const DEVICE_ID_KEY = '@donedex_device_id';

/**
 * Generate or retrieve a unique device ID
 * This ID persists across app sessions via AsyncStorage
 */
export async function getDeviceId(): Promise<string> {
  try {
    // Check if we already have a device ID stored
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

    if (!deviceId) {
      // Generate a new unique device ID
      deviceId = `${Platform.OS}-${generateUUID()}`;
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      console.log('[DeviceSession] Generated new device ID:', deviceId);
    }

    return deviceId;
  } catch (error) {
    console.error('[DeviceSession] Error getting device ID:', error);
    // Fallback to a session-only ID if storage fails
    return `${Platform.OS}-${generateUUID()}`;
  }
}

/**
 * Get a human-readable device name for display purposes
 */
export function getDeviceName(): string {
  if (Platform.OS === 'web') {
    // For web, try to get browser and OS info
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const browser = userAgent.match(/Chrome|Safari|Firefox|Edge/)?.[0] || 'Browser';
    const platform = typeof navigator !== 'undefined' ? navigator.platform : 'Web';
    return `${browser} on ${platform}`;
  }

  // For native, use expo-device info
  const deviceName = Device.deviceName || Device.modelName;
  if (deviceName) {
    return deviceName;
  }

  // Fallback
  return Platform.OS === 'ios' ? 'iPhone/iPad' : 'Android Device';
}

/**
 * Simple UUID v4 generator
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export interface ActiveSessionInfo {
  hasActiveSession: boolean;
  deviceName: string | null;
  lastActiveAt: string | null;
}

/**
 * Check if user has an active session on another device
 * Only applies to staff role users
 */
export async function checkActiveSession(userId: string): Promise<ActiveSessionInfo> {
  try {
    const deviceId = await getDeviceId();

    // Query for active sessions that are NOT on the current device
    const sessionsQuery = query(
      collection(db, 'user_sessions'),
      where('user_id', '==', userId),
      where('is_active', '==', true)
    );
    const sessionsSnap = await getDocs(sessionsQuery);

    // Check if there's an active session on a different device
    for (const sessionDoc of sessionsSnap.docs) {
      const session = sessionDoc.data();
      if (session.device_id !== deviceId) {
        return {
          hasActiveSession: true,
          deviceName: session.device_name || null,
          lastActiveAt: session.last_active_at || null,
        };
      }
    }

    return { hasActiveSession: false, deviceName: null, lastActiveAt: null };
  } catch (error) {
    console.error('[DeviceSession] Error checking active session:', error);
    // On error, allow login (fail open for better UX)
    return { hasActiveSession: false, deviceName: null, lastActiveAt: null };
  }
}

/**
 * Create a new session for the current device
 * This deactivates any existing sessions first
 */
export async function createSession(userId: string): Promise<string | null> {
  try {
    const deviceId = await getDeviceId();
    const deviceName = getDeviceName();
    const now = new Date().toISOString();

    // First, deactivate any existing sessions for this user
    const existingQuery = query(
      collection(db, 'user_sessions'),
      where('user_id', '==', userId),
      where('is_active', '==', true)
    );
    const existingSnap = await getDocs(existingQuery);

    const batch = writeBatch(db);

    // Deactivate old sessions
    existingSnap.docs.forEach((sessionDoc) => {
      batch.update(sessionDoc.ref, {
        is_active: false,
        deactivated_at: now,
      });
    });

    // Create new session
    const sessionId = generateId();
    const sessionRef = doc(db, 'user_sessions', sessionId);
    batch.set(sessionRef, {
      user_id: userId,
      device_id: deviceId,
      device_name: deviceName,
      is_active: true,
      last_active_at: now,
      created_at: now,
    });

    await batch.commit();

    console.log('[DeviceSession] Session created:', sessionId);
    return sessionId;
  } catch (error) {
    console.error('[DeviceSession] Exception creating session:', error);
    return null;
  }
}

/**
 * Update session heartbeat to keep it alive
 * Should be called periodically while app is active
 */
export async function updateHeartbeat(): Promise<boolean> {
  try {
    const user = auth.currentUser;
    if (!user) return false;

    const deviceId = await getDeviceId();
    const now = new Date().toISOString();

    // Find the active session for this user and device
    const sessionQuery = query(
      collection(db, 'user_sessions'),
      where('user_id', '==', user.uid),
      where('device_id', '==', deviceId),
      where('is_active', '==', true)
    );
    const sessionSnap = await getDocs(sessionQuery);

    if (!sessionSnap.empty) {
      const sessionDoc = sessionSnap.docs[0];
      await updateDoc(sessionDoc.ref, {
        last_active_at: now,
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error('[DeviceSession] Exception updating heartbeat:', error);
    return false;
  }
}

/**
 * Deactivate the current session (on logout)
 */
export async function deactivateSession(): Promise<boolean> {
  try {
    const user = auth.currentUser;
    if (!user) return false;

    const deviceId = await getDeviceId();
    const now = new Date().toISOString();

    // Find and deactivate the session
    const sessionQuery = query(
      collection(db, 'user_sessions'),
      where('user_id', '==', user.uid),
      where('device_id', '==', deviceId),
      where('is_active', '==', true)
    );
    const sessionSnap = await getDocs(sessionQuery);

    if (!sessionSnap.empty) {
      const sessionDoc = sessionSnap.docs[0];
      await updateDoc(sessionDoc.ref, {
        is_active: false,
        deactivated_at: now,
      });
      console.log('[DeviceSession] Session deactivated');
      return true;
    }

    return false;
  } catch (error) {
    console.error('[DeviceSession] Exception deactivating session:', error);
    return false;
  }
}

/**
 * Admin function: Reset all sessions for a user
 * Use this when a device is lost/stolen
 */
export async function adminResetUserSessions(targetUserId: string): Promise<boolean> {
  try {
    const now = new Date().toISOString();

    const sessionsQuery = query(
      collection(db, 'user_sessions'),
      where('user_id', '==', targetUserId),
      where('is_active', '==', true)
    );
    const sessionsSnap = await getDocs(sessionsQuery);

    const batch = writeBatch(db);
    sessionsSnap.docs.forEach((sessionDoc) => {
      batch.update(sessionDoc.ref, {
        is_active: false,
        deactivated_at: now,
        deactivated_by: 'admin_reset',
      });
    });

    await batch.commit();

    console.log('[DeviceSession] Sessions reset for user:', targetUserId);
    return true;
  } catch (error) {
    console.error('[DeviceSession] Exception resetting sessions:', error);
    throw error;
  }
}

/**
 * Get user's role from users collection
 * Returns null if user not found
 */
export async function getUserRole(userId: string): Promise<string | null> {
  try {
    const userRef = doc(db, collections.users, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.error('[DeviceSession] User not found:', userId);
      return null;
    }

    return userSnap.data().role || null;
  } catch (error) {
    console.error('[DeviceSession] Exception getting user role:', error);
    return null;
  }
}

/**
 * Check if user role requires single-device login
 * Currently only 'staff' role is restricted
 */
export function isRoleRestricted(role: string | null): boolean {
  return role === 'staff';
}
