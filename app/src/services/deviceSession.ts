/**
 * Device Session Service
 * Handles single-device login enforcement for staff members
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import * as Device from 'expo-device';

const DEVICE_ID_KEY = '@donedex_device_id';

// Type definitions for RPC responses
interface CheckActiveSessionRow {
  has_active_session: boolean;
  device_name: string | null;
  last_active_at: string | null;
}

interface ProfileRole {
  role: string;
}

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
    const { data, error } = await supabase.rpc('check_active_session' as never, {
      p_user_id: userId,
    } as never) as unknown as { data: CheckActiveSessionRow[] | null; error: { message: string } | null };

    if (error) {
      console.error('[DeviceSession] Error checking active session:', error);
      // On error, allow login (fail open for better UX)
      return { hasActiveSession: false, deviceName: null, lastActiveAt: null };
    }

    if (data && Array.isArray(data) && data.length > 0) {
      const session = data[0];
      return {
        hasActiveSession: session.has_active_session === true,
        deviceName: session.device_name,
        lastActiveAt: session.last_active_at,
      };
    }

    return { hasActiveSession: false, deviceName: null, lastActiveAt: null };
  } catch (error) {
    console.error('[DeviceSession] Exception checking active session:', error);
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

    const { data, error } = await supabase.rpc('create_user_session' as never, {
      p_user_id: userId,
      p_device_id: deviceId,
      p_device_name: deviceName,
    } as never) as unknown as { data: string | null; error: { message: string } | null };

    if (error) {
      console.error('[DeviceSession] Error creating session:', error);
      return null;
    }

    console.log('[DeviceSession] Session created:', data);
    return data;
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
    const deviceId = await getDeviceId();

    const { data, error } = await supabase.rpc('update_session_heartbeat' as never, {
      p_device_id: deviceId,
    } as never) as unknown as { data: boolean | null; error: { message: string } | null };

    if (error) {
      console.error('[DeviceSession] Error updating heartbeat:', error);
      return false;
    }

    return data === true;
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
    const deviceId = await getDeviceId();

    const { data, error } = await supabase.rpc('deactivate_user_session' as never, {
      p_device_id: deviceId,
    } as never) as unknown as { data: boolean | null; error: { message: string } | null };

    if (error) {
      console.error('[DeviceSession] Error deactivating session:', error);
      return false;
    }

    console.log('[DeviceSession] Session deactivated');
    return data === true;
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
    const { data, error } = await supabase.rpc('admin_reset_user_sessions' as never, {
      p_target_user_id: targetUserId,
    } as never) as unknown as { data: boolean | null; error: { message: string } | null };

    if (error) {
      console.error('[DeviceSession] Error resetting sessions:', error);
      throw new Error(error.message);
    }

    console.log('[DeviceSession] Sessions reset for user:', targetUserId);
    return data === true;
  } catch (error) {
    console.error('[DeviceSession] Exception resetting sessions:', error);
    throw error;
  }
}

/**
 * Get user's role from profiles table
 * Returns null if profile not found
 */
export async function getUserRole(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('organisation_users')
      .select('role')
      .eq('user_id', userId)
      .single() as unknown as { data: ProfileRole | null; error: { message: string } | null };

    if (error || !data) {
      console.error('[DeviceSession] Error getting user role:', error);
      return null;
    }

    return data.role;
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
